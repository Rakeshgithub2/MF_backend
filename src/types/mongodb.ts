import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  profilePicture?: string; // Google profile picture URL
  age?: number;
  riskLevel?: string; // LOW, MEDIUM, HIGH
  role: string; // USER, ADMIN
  isVerified: boolean;
  kycStatus: string; // PENDING, SUBMITTED, APPROVED, REJECTED

  // OAuth fields
  googleId?: string;
  provider?: string; // 'local' | 'google'

  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  _id?: ObjectId;
  token: string;
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

export interface Goal {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category:
    | 'RETIREMENT'
    | 'EDUCATION'
    | 'HOUSE'
    | 'VACATION'
    | 'EMERGENCY'
    | 'OTHER';
  status: 'IN_PROGRESS' | 'ACHIEVED' | 'ABANDONED';
  description?: string;
  linkedFunds: string[]; // Array of fund IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface Portfolio {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioItem {
  _id?: ObjectId;
  portfolioId: ObjectId;
  fundId: string;
  units: number;
  investedAmount: number;
  currentValue: number;
  investedAt: Date;
  updatedAt: Date;
}

export interface Fund {
  _id?: ObjectId;
  amfiCode: string;
  name: string;
  type: string; // EQUITY, DEBT, HYBRID, etc.
  category: string; // LARGE_CAP, MID_CAP, SMALL_CAP, etc.
  benchmark?: string;
  expenseRatio?: number;
  inceptionDate?: Date;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FundPerformance {
  _id?: ObjectId;
  fundId: string;
  date: Date;
  nav: number;
  createdAt: Date;
}

export interface WatchlistItem {
  _id?: ObjectId;
  userId: ObjectId;
  fundId: string;
  createdAt: Date;
}

export interface Cache {
  _id?: ObjectId;
  key: string;
  value: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Holding {
  _id?: ObjectId;
  fundId: string;
  ticker: string;
  name: string;
  percent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FundManager {
  _id?: ObjectId;
  name: string;
  experience?: number;
  qualification?: string;
  bio?: string;
  photo?: string;
  fundId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagementTeamMember {
  _id?: ObjectId;
  fundId: string;
  name: string;
  role: string;
  experience: string;
  expertise: string;
  education: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioAction {
  _id?: ObjectId;
  fundId: string;
  date: string;
  action: string;
  company: string;
  rationale: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface News {
  _id?: ObjectId;
  title: string;
  content: string;
  source?: string;
  category?: string;
  tags: string[];
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
