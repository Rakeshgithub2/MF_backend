import { Response } from 'express';
import { z } from 'zod';
import { mongodb } from '../db/mongodb';
import { AuthRequest } from '../middlewares/auth';
import { formatResponse } from '../utils/response';
import { Goal } from '../types/mongodb';
import { ObjectId } from 'mongodb';

const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().datetime(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  category: z.enum([
    'RETIREMENT',
    'EDUCATION',
    'HOUSE',
    'VACATION',
    'EMERGENCY',
    'OTHER',
  ]),
  description: z.string().optional(),
  linkedFunds: z.array(z.string()).optional(),
});

const updateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  category: z
    .enum([
      'RETIREMENT',
      'EDUCATION',
      'HOUSE',
      'VACATION',
      'EMERGENCY',
      'OTHER',
    ])
    .optional(),
  status: z.enum(['IN_PROGRESS', 'ACHIEVED', 'ABANDONED']).optional(),
  description: z.string().optional(),
  linkedFunds: z.array(z.string()).optional(),
});

// Get all goals for logged-in user
export const getGoals = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.query;

    const goalsCollection = mongodb.getCollection<Goal>('goals');
    const where: any = { userId: new ObjectId(req.user!.id) };
    if (status) {
      where.status = status;
    }

    const goals = await goalsCollection
      .find(where)
      .sort({ priority: -1, targetDate: 1 }) // HIGH first, earliest deadline first
      .toArray();

    // Calculate progress for each goal
    const goalsWithProgress = goals.map((goal) => ({
      ...goal,
      id: goal._id?.toString(),
      progress:
        goal.targetAmount > 0
          ? (goal.currentAmount / goal.targetAmount) * 100
          : 0,
      remaining: goal.targetAmount - goal.currentAmount,
      daysRemaining: Math.ceil(
        (new Date(goal.targetDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      ),
    }));

    res.json(formatResponse(goalsWithProgress, 'Goals fetched successfully'));
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get goal by ID
export const getGoalById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const goalsCollection = mongodb.getCollection<Goal>('goals');
    const goal = await goalsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user!.id),
    });

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    // Calculate progress
    const goalWithProgress = {
      ...goal,
      id: goal._id?.toString(),
      progress:
        goal.targetAmount > 0
          ? (goal.currentAmount / goal.targetAmount) * 100
          : 0,
      remaining: goal.targetAmount - goal.currentAmount,
      daysRemaining: Math.ceil(
        (new Date(goal.targetDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      ),
    };

    res.json(formatResponse(goalWithProgress, 'Goal fetched successfully'));
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new goal
export const createGoal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = createGoalSchema.parse(req.body);

    const goalsCollection = mongodb.getCollection<Goal>('goals');
    const newGoal: Goal = {
      userId: new ObjectId(req.user!.id),
      name: validatedData.name,
      targetAmount: validatedData.targetAmount,
      currentAmount: validatedData.currentAmount || 0,
      targetDate: new Date(validatedData.targetDate),
      priority: validatedData.priority || 'MEDIUM',
      category: validatedData.category,
      status: 'IN_PROGRESS',
      description: validatedData.description,
      linkedFunds: validatedData.linkedFunds || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await goalsCollection.insertOne(newGoal);
    const goal = { ...newGoal, id: result.insertedId.toString() };

    res
      .status(201)
      .json(formatResponse(goal, 'Goal created successfully', 201));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update goal
export const updateGoal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = updateGoalSchema.parse(req.body);

    const goalsCollection = mongodb.getCollection<Goal>('goals');
    // Check if goal exists and belongs to user
    const existingGoal = await goalsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user!.id),
    });

    if (!existingGoal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const updateData: any = { updatedAt: new Date() };
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.targetAmount)
      updateData.targetAmount = validatedData.targetAmount;
    if (validatedData.currentAmount !== undefined)
      updateData.currentAmount = validatedData.currentAmount;
    if (validatedData.targetDate)
      updateData.targetDate = new Date(validatedData.targetDate);
    if (validatedData.priority) updateData.priority = validatedData.priority;
    if (validatedData.category) updateData.category = validatedData.category;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.linkedFunds)
      updateData.linkedFunds = validatedData.linkedFunds;

    await goalsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const goal = await goalsCollection.findOne({ _id: new ObjectId(id) });
    const goalWithId = { ...goal, id: goal?._id?.toString() };

    res.json(formatResponse(goalWithId, 'Goal updated successfully'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete goal
export const deleteGoal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const goalsCollection = mongodb.getCollection<Goal>('goals');
    // Check if goal exists and belongs to user
    const existingGoal = await goalsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user!.id),
    });

    if (!existingGoal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    await goalsCollection.deleteOne({ _id: new ObjectId(id) });

    res.json(formatResponse(null, 'Goal deleted successfully'));
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get goals summary
export const getGoalsSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const goalsCollection = mongodb.getCollection<Goal>('goals');
    const goals = await goalsCollection
      .find({ userId: new ObjectId(req.user!.id) })
      .toArray();

    const summary = {
      totalGoals: goals.length,
      activeGoals: goals.filter((g) => g.status === 'IN_PROGRESS').length,
      achievedGoals: goals.filter((g) => g.status === 'ACHIEVED').length,
      totalTargetAmount: goals
        .filter((g) => g.status === 'IN_PROGRESS')
        .reduce((sum, g) => sum + g.targetAmount, 0),
      totalCurrentAmount: goals
        .filter((g) => g.status === 'IN_PROGRESS')
        .reduce((sum, g) => sum + g.currentAmount, 0),
      byCategory: goals.reduce((acc: any, goal) => {
        if (!acc[goal.category]) {
          acc[goal.category] = {
            count: 0,
            targetAmount: 0,
            currentAmount: 0,
          };
        }
        if (goal.status === 'IN_PROGRESS') {
          acc[goal.category].count++;
          acc[goal.category].targetAmount += goal.targetAmount;
          acc[goal.category].currentAmount += goal.currentAmount;
        }
        return acc;
      }, {}),
      byPriority: goals.reduce((acc: any, goal) => {
        if (!acc[goal.priority]) {
          acc[goal.priority] = 0;
        }
        if (goal.status === 'IN_PROGRESS') {
          acc[goal.priority]++;
        }
        return acc;
      }, {}),
      upcomingDeadlines: goals
        .filter((g) => g.status === 'IN_PROGRESS')
        .sort(
          (a, b) =>
            new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
        )
        .slice(0, 3)
        .map((goal) => ({
          id: goal.id,
          name: goal.name,
          targetDate: goal.targetDate,
          daysRemaining: Math.ceil(
            (new Date(goal.targetDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          ),
          progress:
            goal.targetAmount > 0
              ? (goal.currentAmount / goal.targetAmount) * 100
              : 0,
        })),
    };

    const overallProgress =
      summary.totalTargetAmount > 0
        ? (summary.totalCurrentAmount / summary.totalTargetAmount) * 100
        : 0;

    res.json(
      formatResponse(
        { ...summary, overallProgress },
        'Goals summary fetched successfully'
      )
    );
  } catch (error) {
    console.error('Get goals summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
