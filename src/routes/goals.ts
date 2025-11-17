import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalsSummary,
} from '../controllers/goal';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get goals summary
router.get('/summary', getGoalsSummary);

// Get all goals
router.get('/', getGoals);

// Get goal by ID
router.get('/:id', getGoalById);

// Create new goal
router.post('/', createGoal);

// Update goal
router.put('/:id', updateGoal);

// Delete goal
router.delete('/:id', deleteGoal);

export default router;
