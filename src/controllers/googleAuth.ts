import 'dotenv/config'; // Load environment variables first!
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { mongodb } from '../db/mongodb';
import { User, RefreshToken } from '../types/mongodb';
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
} from '../utils/auth';
import { formatResponse } from '../utils/response';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { emailService } from '../services/emailService';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  `http://localhost:${process.env.PORT || 3002}/auth/google/callback`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Debug logging
console.log('🔐 Google OAuth Configuration:');
console.log(
  '  CLIENT_ID:',
  CLIENT_ID ? `${CLIENT_ID.substring(0, 20)}...` : 'MISSING!'
);
console.log(
  '  CLIENT_SECRET:',
  CLIENT_SECRET ? `${CLIENT_SECRET.substring(0, 10)}...` : 'MISSING!'
);
console.log('  REDIRECT_URI:', REDIRECT_URI);
console.log('  FRONTEND_URL:', FRONTEND_URL);

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    '❌ CRITICAL: Missing Google OAuth credentials in environment variables!'
  );
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

export const redirectToGoogle = (req: Request, res: Response): void => {
  console.log('🔵 redirectToGoogle called');
  console.log('📋 Using CLIENT_ID:', CLIENT_ID ? 'Present' : 'MISSING!');

  const state = req.query.state as string | undefined;
  const authUrlOptions: any = {
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
  };

  if (state) {
    authUrlOptions.state = state;
  }

  try {
    const url = oauth2Client.generateAuthUrl(authUrlOptions);
    console.log('✅ Generated OAuth URL:', url.substring(0, 100) + '...');
    res.redirect(url);
  } catch (error) {
    console.error('❌ Error generating OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
};

export const handleGoogleCallback = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    console.log('🔵 Google OAuth Callback Started');
    console.log('📋 Query params:', req.query);

    const code = req.query.code as string | undefined;
    if (!code) {
      console.error('❌ Missing authorization code');
      return res.status(400).json({ error: 'Missing code in callback' });
    }

    console.log('✅ Authorization code received');
    console.log('🔄 Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ Tokens received from Google');
    console.log('✅ Tokens received from Google');
    // tokens contain access_token, id_token, refresh_token (if consented)
    const idToken = tokens.id_token;
    if (!idToken) {
      console.error('❌ No id_token in response');
      return res
        .status(400)
        .json({ error: 'No id_token returned from Google' });
    }

    console.log('🔄 Verifying ID token...');
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log('✅ ID token verified, payload:', {
      email: payload?.email,
      name: payload?.name,
      picture: payload?.picture,
    });

    if (!payload || !payload.email) {
      console.error('❌ Missing email in payload');
      return res.status(400).json({ error: 'Google profile missing email' });
    }

    // UPSERT USER: Find or create, preserving existing watchlist
    console.log('🔄 Upserting user:', payload.email);
    const usersCollection = mongodb.getCollection<User>('users');

    // First, check if user exists with this email OR googleId
    let existingUser = await usersCollection.findOne({
      $or: [{ email: payload.email }, { googleId: payload.sub }],
    });

    let user: User;

    if (existingUser) {
      // User exists - update their Google info
      console.log('✅ Found existing user, updating Google info...');

      const updateResult = await usersCollection.findOneAndUpdate(
        { _id: existingUser._id },
        {
          $set: {
            googleId: payload.sub,
            name: payload.name || existingUser.name,
            profilePicture: payload.picture || existingUser.profilePicture,
            provider: 'google',
            isVerified: true,
            updatedAt: new Date(),
          },
        },
        {
          returnDocument: 'after',
        }
      );

      if (!updateResult) {
        console.error('❌ Failed to update existing user');
        return res.status(500).json({ error: 'Failed to update user' });
      }

      user = updateResult;
      console.log('✅ Updated existing user:', user.email);
    } else {
      // New user - create with Google info
      console.log('🆕 Creating new user with Google account...');

      const newUser: User = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        profilePicture: payload.picture || undefined,
        provider: 'google',
        password: await hashPassword(crypto.randomBytes(20).toString('hex')),
        role: 'USER',
        isVerified: true,
        kycStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertResult = await usersCollection.insertOne(newUser);

      const createdUser = await usersCollection.findOne({
        _id: insertResult.insertedId,
      });

      if (!createdUser) {
        console.error('❌ Failed to create new user');
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = createdUser;
      console.log('✅ Created new user:', user.email);
    }

    // Generate tokens
    console.log('🔄 Generating JWT tokens...');
    const userId = user._id!.toString();
    const accessToken = generateAccessToken({
      id: userId,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ id: userId });
    console.log('✅ JWT tokens generated');

    // Store refresh token in DB
    console.log('🔄 Storing refresh token in database...');
    const refreshTokensCollection =
      mongodb.getCollection<RefreshToken>('refresh_tokens');
    await refreshTokensCollection.insertOne({
      token: refreshToken,
      userId: user._id!,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    console.log('✅ Refresh token stored');

    // Send welcome email (non-blocking)
    const isNewUser = !existingUser;
    emailService
      .sendWelcomeEmail(user.email, {
        name: user.name,
        email: user.email,
        loginType: 'google',
      })
      .catch((err) => console.error('❌ Failed to send welcome email:', err));
    console.log(
      `📧 Welcome email ${isNewUser ? 'sent' : 'queued'} for:`,
      user.email
    );

    // Encode user data in URL for frontend
    const userData = encodeURIComponent(
      JSON.stringify({
        id: userId,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        role: user.role,
      })
    );

    // Redirect to frontend with tokens (careful: in production prefer httpOnly cookie)
    const redirectTo = `${FRONTEND_URL.replace(/\/$/, '')}/auth/success?accessToken=${encodeURIComponent(
      accessToken
    )}&refreshToken=${encodeURIComponent(refreshToken)}&user=${userData}`;

    console.log('✅ Redirecting to frontend success page');
    console.log('🎉 Google OAuth completed successfully for:', user.email);
    return res.redirect(redirectTo);
  } catch (error: any) {
    console.error('❌ Google OAuth callback error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);

    // More helpful error response
    const errorMessage = error?.message || 'Google OAuth error';
    return res.status(500).json({
      error: 'Authentication failed',
      details: errorMessage,
      hint: 'Check backend terminal for full error details',
    });
  }
};
