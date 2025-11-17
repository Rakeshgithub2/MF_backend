import 'dotenv/config'; // Load environment variables first!
import { Request, Response } from 'express';
import { z } from 'zod';
import { mongodb } from '../db/mongodb';
import { User, RefreshToken } from '../types/mongodb';
import { ObjectId } from 'mongodb';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/auth';
import { formatResponse } from '../utils/response';
import { emailService } from '../services/emailService';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  age: z.number().min(18).max(100).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const usersCollection = mongodb.getCollection<User>('users');
    const existingUser = await usersCollection.findOne({
      email: validatedData.email,
    });

    if (existingUser) {
      res.status(409).json({
        error: 'User already exists with this email',
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const newUser: User = {
      email: validatedData.email,
      password: hashedPassword,
      name: validatedData.name,
      ...(validatedData.age && { age: validatedData.age }),
      ...(validatedData.riskLevel && { riskLevel: validatedData.riskLevel }),
      role: 'USER',
      isVerified: false,
      kycStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId.toString();

    const user = {
      id: userId,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    // Generate tokens
    const accessToken = generateAccessToken({
      id: userId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({ id: userId });

    // Store refresh token
    const refreshTokensCollection =
      mongodb.getCollection<RefreshToken>('refresh_tokens');
    await refreshTokensCollection.insertOne({
      token: refreshToken,
      userId: result.insertedId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
    });

    // Send welcome email (non-blocking)
    emailService
      .sendWelcomeEmail(user.email, {
        name: user.name,
        email: user.email,
        loginType: 'registration',
      })
      .catch((err) => console.error('Failed to send welcome email:', err));

    res.status(201).json(
      formatResponse(
        {
          user,
          tokens: {
            accessToken,
            refreshToken,
          },
        },
        'User registered successfully',
        201
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const usersCollection = mongodb.getCollection<User>('users');
    const user = await usersCollection.findOne({
      email: validatedData.email,
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isPasswordValid = await comparePassword(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const userId = user._id!.toString();

    // Generate tokens
    const accessToken = generateAccessToken({
      id: userId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({ id: userId });

    // Store refresh token
    const refreshTokensCollection =
      mongodb.getCollection<RefreshToken>('refresh_tokens');
    await refreshTokensCollection.insertOne({
      token: refreshToken,
      userId: user._id!,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
    });

    // Send welcome back email (non-blocking)
    emailService
      .sendWelcomeEmail(user.email, {
        name: user.name,
        email: user.email,
        loginType: 'login',
      })
      .catch((err) => console.error('Failed to send welcome back email:', err));

    res.json(
      formatResponse(
        {
          user: {
            id: userId,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
        'Login successful'
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshTokens = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const refreshTokensCollection =
      mongodb.getCollection<RefreshToken>('refresh_tokens');
    const storedToken = await refreshTokensCollection.findOne({
      token: refreshToken,
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res
        .status(401)
        .json({ error: 'Invalid or expired refresh token' });
    }

    // Get user
    const usersCollection = mongodb.getCollection<User>('users');
    const user = await usersCollection.findOne({
      _id: storedToken.userId,
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userId = user._id!.toString();

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      id: userId,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({ id: userId });

    // Update refresh token
    await refreshTokensCollection.updateOne(
      { _id: storedToken._id },
      {
        $set: {
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      }
    );

    return res.json(
      formatResponse(
        {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        },
        'Tokens refreshed successfully'
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Token refresh error:', error);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};
