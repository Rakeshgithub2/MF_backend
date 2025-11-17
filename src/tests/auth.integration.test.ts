/**
 * Integration tests for authentication flow
 * Tests user registration, login, and database persistence
 */

import axios from 'axios';
import { mongodb } from '../db/mongodb';
import { User, RefreshToken } from '../types/mongodb';

const API_URL = process.env.API_URL || 'http://localhost:3002/api';

describe('Authentication Integration Tests', () => {
  let testEmail: string;
  let testPassword: string;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    // Connect to database
    await mongodb.connect();

    // Generate unique test email
    testEmail = `test_${Date.now()}@example.com`;
    testPassword = 'TestPassword123!';
  });

  afterAll(async () => {
    // Cleanup test data
    const usersCollection = mongodb.getCollection<User>('users');
    const refreshTokensCollection =
      mongodb.getCollection<RefreshToken>('refresh_tokens');

    await usersCollection.deleteMany({ email: testEmail });
    await refreshTokensCollection.deleteMany({ token: refreshToken });

    await mongodb.disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: testEmail,
        password: testPassword,
        name: 'Test User',
        age: 30,
        riskLevel: 'MEDIUM',
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user).toHaveProperty('id');
      expect(response.data.data.user.email).toBe(testEmail);
      expect(response.data.data.user.name).toBe('Test User');
      expect(response.data.data.tokens).toHaveProperty('accessToken');
      expect(response.data.data.tokens).toHaveProperty('refreshToken');

      // Store tokens for further tests
      accessToken = response.data.data.tokens.accessToken;
      refreshToken = response.data.data.tokens.refreshToken;
      userId = response.data.data.user.id;
    });

    it('should verify user data is stored correctly in database', async () => {
      const usersCollection = mongodb.getCollection<User>('users');
      const user = await usersCollection.findOne({ email: testEmail });

      expect(user).not.toBeNull();
      expect(user?.email).toBe(testEmail);
      expect(user?.name).toBe('Test User');
      expect(user?.age).toBe(30);
      expect(user?.riskLevel).toBe('MEDIUM');
      expect(user?.role).toBe('USER');
      expect(user?.isVerified).toBe(false);
      expect(user?.password).not.toBe(testPassword); // Password should be hashed
      expect(user?.createdAt).toBeInstanceOf(Date);
      expect(user?.updatedAt).toBeInstanceOf(Date);
    });

    it('should verify refresh token is stored in database', async () => {
      const refreshTokensCollection =
        mongodb.getCollection<RefreshToken>('refresh_tokens');
      const storedToken = await refreshTokensCollection.findOne({
        token: refreshToken,
      });

      expect(storedToken).not.toBeNull();
      expect(storedToken?.token).toBe(refreshToken);
      expect(storedToken?.userId.toString()).toBe(userId);
      expect(storedToken?.expiresAt).toBeInstanceOf(Date);
      expect(storedToken?.createdAt).toBeInstanceOf(Date);
    });

    it('should reject registration with existing email', async () => {
      try {
        await axios.post(`${API_URL}/auth/register`, {
          email: testEmail,
          password: 'AnotherPassword123!',
          name: 'Another User',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error).toContain('already exists');
      }
    });

    it('should reject registration with weak password', async () => {
      try {
        await axios.post(`${API_URL}/auth/register`, {
          email: `new_${Date.now()}@example.com`,
          password: 'weak',
          name: 'Test User',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('Validation error');
      }
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.email).toBe(testEmail);
      expect(response.data.data.tokens).toHaveProperty('accessToken');
      expect(response.data.data.tokens).toHaveProperty('refreshToken');

      // Update tokens
      accessToken = response.data.data.tokens.accessToken;
      refreshToken = response.data.data.tokens.refreshToken;
    });

    it('should reject login with incorrect password', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: testEmail,
          password: 'WrongPassword123!',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Invalid credentials');
      }
    });

    it('should reject login with non-existent email', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: 'nonexistent@example.com',
          password: testPassword,
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Invalid credentials');
      }
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken: refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tokens).toHaveProperty('accessToken');
      expect(response.data.data.tokens).toHaveProperty('refreshToken');

      // Verify new tokens are different
      expect(response.data.data.tokens.accessToken).not.toBe(accessToken);
      expect(response.data.data.tokens.refreshToken).not.toBe(refreshToken);

      // Update tokens
      accessToken = response.data.data.tokens.accessToken;
      refreshToken = response.data.data.tokens.refreshToken;
    });

    it('should verify old refresh token is updated in database', async () => {
      const refreshTokensCollection =
        mongodb.getCollection<RefreshToken>('refresh_tokens');
      const storedToken = await refreshTokensCollection.findOne({
        token: refreshToken,
      });

      expect(storedToken).not.toBeNull();
      expect(storedToken?.token).toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      try {
        await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: 'invalid.refresh.token',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Data Consistency Checks', () => {
    it('should ensure all user fields have correct data types', async () => {
      const usersCollection = mongodb.getCollection<User>('users');
      const user = await usersCollection.findOne({ email: testEmail });

      expect(user).not.toBeNull();
      expect(typeof user?.email).toBe('string');
      expect(typeof user?.password).toBe('string');
      expect(typeof user?.name).toBe('string');
      expect(typeof user?.age).toBe('number');
      expect(typeof user?.riskLevel).toBe('string');
      expect(typeof user?.role).toBe('string');
      expect(typeof user?.isVerified).toBe('boolean');
      expect(user?.createdAt).toBeInstanceOf(Date);
      expect(user?.updatedAt).toBeInstanceOf(Date);
    });

    it('should ensure password is hashed and not plain text', async () => {
      const usersCollection = mongodb.getCollection<User>('users');
      const user = await usersCollection.findOne({ email: testEmail });

      expect(user).not.toBeNull();
      expect(user?.password).not.toBe(testPassword);
      expect(user?.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });

    it('should ensure refresh token has valid expiration', async () => {
      const refreshTokensCollection =
        mongodb.getCollection<RefreshToken>('refresh_tokens');
      const storedToken = await refreshTokensCollection.findOne({
        token: refreshToken,
      });

      expect(storedToken).not.toBeNull();
      expect(storedToken?.expiresAt).toBeInstanceOf(Date);
      expect(storedToken!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
