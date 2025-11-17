/**
 * Integration Tests for Calculator API
 */

import request from 'supertest';
import app from '../../src/index';

describe('Calculator API Integration Tests', () => {
  describe('POST /api/calculator/sip', () => {
    it('should calculate SIP correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/sip')
        .send({
          monthlyInvestment: 5000,
          expectedReturn: 12,
          timePeriod: 10,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('investedAmount');
      expect(response.body.data).toHaveProperty('estimatedReturns');
      expect(response.body.data).toHaveProperty('totalValue');
      expect(response.body.data).toHaveProperty('yearWiseBreakup');

      // Verify calculations
      expect(response.body.data.investedAmount).toBe(5000 * 12 * 10);
      expect(response.body.data.totalValue).toBeGreaterThan(
        response.body.data.investedAmount
      );
    });

    it('should return 400 for missing parameters', async () => {
      await request(app)
        .post('/api/calculator/sip')
        .send({
          monthlyInvestment: 5000,
          // Missing expectedReturn and timePeriod
        })
        .expect(400);
    });
  });

  describe('POST /api/calculator/lumpsum', () => {
    it('should calculate lumpsum investment correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/lumpsum')
        .send({
          investment: 100000,
          expectedReturn: 12,
          timePeriod: 5,
        })
        .expect(200);

      expect(response.body.data.investedAmount).toBe(100000);
      expect(response.body.data.totalValue).toBeGreaterThan(100000);
    });
  });

  describe('POST /api/calculator/goal', () => {
    it('should calculate goal planning correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/goal')
        .send({
          targetAmount: 1000000,
          currentSavings: 100000,
          timePeriod: 10,
          expectedReturn: 12,
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('requiredMonthlySIP');
      expect(response.body.data).toHaveProperty('requiredLumpsum');
      expect(response.body.data.requiredMonthlySIP).toBeGreaterThan(0);
    });
  });

  describe('POST /api/calculator/retirement', () => {
    it('should calculate retirement planning correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/retirement')
        .send({
          currentAge: 30,
          retirementAge: 60,
          lifeExpectancy: 80,
          currentMonthlyExpenses: 50000,
          inflationRate: 6,
          expectedReturnPreRetirement: 12,
          expectedReturnPostRetirement: 8,
          currentSavings: 500000,
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('corpusRequired');
      expect(response.body.data).toHaveProperty('requiredMonthlySIP');
      expect(response.body.data).toHaveProperty('recommendation');
      expect(response.body.data.corpusRequired).toBeGreaterThan(0);
    });
  });
});

describe('ML API Integration Tests', () => {
  describe('POST /api/ml/smart-score', () => {
    it('should calculate smart score for fund', async () => {
      const response = await request(app)
        .post('/api/ml/smart-score')
        .send({
          returns3Y: 15.5,
          sharpeRatio: 1.8,
          alpha: 3.2,
          beta: 1.05,
          stdDev: 14.2,
          expenseRatio: 1.2,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('grade');
      expect(response.body.data).toHaveProperty('recommendation');
      expect(response.body.data.score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.score).toBeLessThanOrEqual(100);
    });
  });

  describe('POST /api/ml/risk-analysis', () => {
    it('should analyze risk metrics', async () => {
      const returns = [
        12.5, 8.2, -3.5, 15.8, 10.2, 18.5, -5.2, 14.5, 9.8, 16.2,
      ];

      const response = await request(app)
        .post('/api/ml/risk-analysis')
        .send({
          returns,
          riskFreeRate: 6.5,
        })
        .expect(200);

      expect(response.body.data.metrics).toHaveProperty('volatility');
      expect(response.body.data.metrics).toHaveProperty('sharpeRatio');
      expect(response.body.data.profile).toHaveProperty('riskLevel');
    });
  });

  describe('POST /api/ai/chat', () => {
    it('should generate AI chat response', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({
          query: 'What is SIP and how does it work?',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('answer');
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data.answer).toBeTruthy();
    });

    it('should return 400 for missing query', async () => {
      await request(app).post('/api/ai/chat').send({}).expect(400);
    });
  });
});
