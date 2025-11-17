import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { mongodb } from '../db/mongodb';
import { User } from '../types/mongodb';
import { ObjectId } from 'mongodb';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };

    // Use MongoDB to find user
    const usersCollection = mongodb.getCollection<User>('users');
    const user = await usersCollection.findOne({
      _id: new ObjectId(decoded.id),
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid token.' });
      return;
    }

    req.user = {
      id: user._id!.toString(),
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied. Admin required.' });
    return;
  }
  next();
};
