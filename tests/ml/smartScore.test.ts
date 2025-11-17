/**
 * Unit Tests for Smart Score ML Module
 */

import { computeSmartScore, compareFunds } from '../src/ml/smartScore';

describe('Smart Score ML Module', () => {
  describe('computeSmartScore', () => {
    it('should calculate score for high-performing fund', () => {
      const input = {
        alpha: 5.2,
        beta: 0.95,
        stdDev: 12.5,
        returns1Y: 18.5,
        returns3Y: 16.2,
        returns5Y: 14.8,
        sharpeRatio: 1.8,
        sortinoRatio: 2.2,
        expenseRatio: 1.2,
        aum: 5000,
        consistencyIndex: 82,
        maxDrawdown: -15.2,
        informationRatio: 0.85,
      };

      const result = computeSmartScore(input);

      expect(result.score).toBeGreaterThan(70);
      expect(result.grade).toMatch(/A|B\+/);
      expect(result.recommendation).toMatch(/Buy|Strong Buy/);
      expect(result.insights).toHaveLength(expect.any(Number));
      expect(result.breakdown).toHaveProperty('returnScore');
      expect(result.breakdown).toHaveProperty('riskScore');
      expect(result.breakdown).toHaveProperty('consistencyScore');
    });

    it('should calculate score for poor-performing fund', () => {
      const input = {
        alpha: -2.5,
        beta: 1.45,
        stdDev: 28.0,
        returns1Y: -5.2,
        returns3Y: 2.1,
        returns5Y: 4.5,
        sharpeRatio: 0.2,
        sortinoRatio: 0.3,
        expenseRatio: 2.8,
        aum: 150,
        consistencyIndex: 35,
        maxDrawdown: -38.5,
      };

      const result = computeSmartScore(input);

      expect(result.score).toBeLessThan(50);
      expect(result.grade).toMatch(/C|D/);
      expect(result.recommendation).toMatch(/Sell|Hold/);
    });

    it('should handle missing optional parameters', () => {
      const input = {
        returns3Y: 12.5,
        sharpeRatio: 1.2,
        expenseRatio: 1.5,
      };

      const result = computeSmartScore(input);

      expect(result).toHaveProperty('score');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return valid grade for all scores', () => {
      const testCases = [
        { returns3Y: 25, sharpeRatio: 2.5 }, // High
        { returns3Y: 12, sharpeRatio: 1.0 }, // Medium
        { returns3Y: 3, sharpeRatio: 0.2 }, // Low
      ];

      testCases.forEach((input) => {
        const result = computeSmartScore(input);
        expect(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D']).toContain(result.grade);
      });
    });
  });

  describe('compareFunds', () => {
    it('should correctly identify better performing fund', () => {
      const fund1 = {
        returns3Y: 18.5,
        sharpeRatio: 2.0,
        alpha: 4.5,
        beta: 1.0,
        stdDev: 12.0,
      };

      const fund2 = {
        returns3Y: 10.2,
        sharpeRatio: 0.8,
        alpha: -1.2,
        beta: 1.2,
        stdDev: 22.0,
      };

      const comparison = compareFunds(fund1, fund2);

      expect(comparison.winner).toBe('fund1');
      expect(comparison.score1.score).toBeGreaterThan(comparison.score2.score);
    });

    it('should identify tie for similar funds', () => {
      const fund1 = {
        returns3Y: 15.0,
        sharpeRatio: 1.5,
        expenseRatio: 1.5,
      };

      const fund2 = {
        returns3Y: 15.2,
        sharpeRatio: 1.4,
        expenseRatio: 1.6,
      };

      const comparison = compareFunds(fund1, fund2);

      // Scores should be very close
      expect(
        Math.abs(comparison.score1.score - comparison.score2.score)
      ).toBeLessThan(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const input = {
        returns3Y: 0,
        sharpeRatio: 0,
        alpha: 0,
        beta: 0,
      };

      const result = computeSmartScore(input);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative returns', () => {
      const input = {
        returns1Y: -15.5,
        returns3Y: -8.2,
        returns5Y: 2.1,
      };

      const result = computeSmartScore(input);
      expect(result.score).toBeLessThan(40);
      expect(result.recommendation).toMatch(/Sell/);
    });

    it('should handle extreme values', () => {
      const input = {
        returns3Y: 100, // Unrealistic but should handle
        sharpeRatio: 10,
        alpha: 50,
      };

      const result = computeSmartScore(input);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
