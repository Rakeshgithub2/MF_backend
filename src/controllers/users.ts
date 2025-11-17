import { Response } from 'express';
import { z } from 'zod';
import { mongodb } from '../db/mongodb';
import { AuthRequest } from '../middlewares/auth';
import { formatResponse } from '../utils/response';
import { hashPassword } from '../utils/auth';
import { User } from '../types/mongodb';
import { ObjectId } from 'mongodb';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  age: z.number().min(18).max(100).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usersCollection = mongodb.getCollection<User>('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user!.id) },
      {
        projection: {
          password: 0, // Exclude password
        },
      }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userResponse = {
      id: user._id?.toString(),
      email: user.email,
      name: user.name,
      age: user.age,
      riskLevel: user.riskLevel,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json(
      formatResponse(userResponse, 'User profile retrieved successfully')
    );
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMe = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = updateUserSchema.parse(req.body);

    const updateData: any = { updatedAt: new Date() };
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.age !== undefined) updateData.age = validatedData.age;
    if (validatedData.riskLevel !== undefined)
      updateData.riskLevel = validatedData.riskLevel;

    const usersCollection = mongodb.getCollection<User>('users');
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user!.id) },
      { $set: updateData }
    );

    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(req.user!.id) },
      {
        projection: {
          password: 0, // Exclude password
        },
      }
    );

    const userResponse = {
      id: updatedUser?._id?.toString(),
      email: updatedUser?.email,
      name: updatedUser?.name,
      age: updatedUser?.age,
      riskLevel: updatedUser?.riskLevel,
      role: updatedUser?.role,
      isVerified: updatedUser?.isVerified,
      createdAt: updatedUser?.createdAt,
      updatedAt: updatedUser?.updatedAt,
    };

    res.json(formatResponse(userResponse, 'User profile updated successfully'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
