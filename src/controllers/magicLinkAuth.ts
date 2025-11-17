import { Request, Response } from 'express';
import crypto from 'crypto';
import { mongodb } from '../db/mongodb';
import { User } from '../types/mongodb';
import { generateAccessToken, generateRefreshToken } from '../utils/auth';
import { formatResponse } from '../utils/response';

interface MagicLinkToken {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Send magic link to user's email
 */
export const sendMagicLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    const magicLinksCollection =
      mongodb.getCollection<MagicLinkToken>('magic_link_tokens');

    await magicLinksCollection.insertOne({
      email: email.toLowerCase(),
      token,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    // Generate magic link URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    const magicLinkUrl = `${frontendUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

    // TODO: Send email with magic link
    // For now, just return the link (in production, use email service)
    console.log(`🔐 Magic Link: ${magicLinkUrl}`);

    // In production, uncomment this and remove the dev response:
    // await sendEmail({
    //   to: email,
    //   subject: 'Your Magic Link - MutualFunds AI',
    //   html: `
    //     <h2>Sign in to MutualFunds AI</h2>
    //     <p>Click the link below to sign in (valid for 15 minutes):</p>
    //     <a href="${magicLinkUrl}">${magicLinkUrl}</a>
    //   `
    // });

    res.json(
      formatResponse(
        {
          magicLinkUrl, // Remove this in production
          expiresIn: 15 * 60,
        },
        'Magic link sent to your email'
      )
    );
  } catch (error) {
    console.error('Send magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify magic link and authenticate user
 */
export const verifyMagicLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      res.status(400).json({ error: 'Token and email are required' });
      return;
    }

    const magicLinksCollection =
      mongodb.getCollection<MagicLinkToken>('magic_link_tokens');

    // Find and validate token
    const magicLink = await magicLinksCollection.findOne({
      email: (email as string).toLowerCase(),
      token: token as string,
      used: false,
    });

    if (!magicLink) {
      res.status(400).json({ error: 'Invalid or expired magic link' });
      return;
    }

    // Check expiration
    if (new Date() > magicLink.expiresAt) {
      res.status(400).json({ error: 'Magic link has expired' });
      return;
    }

    // Mark token as used
    await magicLinksCollection.updateOne(
      { _id: magicLink._id },
      { $set: { used: true } }
    );

    // Find or create user
    const usersCollection = mongodb.getCollection<User>('users');
    let user = await usersCollection.findOne({
      email: (email as string).toLowerCase(),
    });

    if (!user) {
      // Create new user with magic link auth
      const newUser: User = {
        email: (email as string).toLowerCase(),
        name: (email as string).split('@')[0],
        password: '', // No password for magic link users
        isVerified: true,
        role: 'USER',
        provider: 'magic-link',
        kycStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };

      console.log(`✅ New magic link user created: ${email}`);
    } else {
      // Update existing user
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            isVerified: true,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`✅ Existing user logged in via magic link: ${email}`);
    }

    // Generate tokens
    const userId = user._id!.toString();
    const accessToken = generateAccessToken({
      id: userId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({ id: userId });

    // Store refresh token
    const refreshTokensCollection = mongodb.getCollection('refresh_tokens');
    await refreshTokensCollection.insertOne({
      token: refreshToken,
      userId: user._id!,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const response = formatResponse(
      {
        user: {
          id: userId,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      'Magic link authentication successful'
    );

    res.json(response);
  } catch (error) {
    console.error('Verify magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
