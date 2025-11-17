# Mutual Funds Portal API Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Authentication Endpoints](#authentication-endpoints)
- [Fund Endpoints](#fund-endpoints)
- [Portfolio Endpoints](#portfolio-endpoints)
- [Watchlist Endpoints](#watchlist-endpoints)
- [Goal Endpoints](#goal-endpoints)
- [Market Data Endpoints](#market-data-endpoints)
- [Calculator Endpoints](#calculator-endpoints)
- [Rate Limiting](#rate-limiting)

---

## Overview

The Mutual Funds Portal API provides comprehensive access to mutual fund data, portfolio management, financial goal tracking, and investment calculators. All data is sourced from official AMFI (Association of Mutual Funds in India) feeds and real-time market APIs.

**Current Version:** v1  
**Protocol:** REST  
**Data Format:** JSON

---

## Authentication

The API uses **JWT (JSON Web Token)** based authentication with both **access tokens** and **refresh tokens**.

### Authentication Flow

1. **Register** or **Login** to obtain tokens
2. Include `Authorization: Bearer <access_token>` header in protected requests
3. Access tokens expire after **15 minutes**
4. Use refresh token to obtain new access tokens (expires after **7 days**)

### Token Storage

**Frontend (Browser):**

- Store tokens in `localStorage`
- On auth success: `localStorage.setItem('accessToken', token)`
- On API requests: Include `Authorization` header

**Security Best Practices:**

- Never store tokens in cookies without HttpOnly flag
- Clear tokens on logout
- Implement token refresh before expiration

---

## Base URL

```
Development: http://localhost:3002/api
Production: https://your-domain.com/api
```

---

## Response Format

All API responses follow a consistent structure:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning               | Description                             |
| ---- | --------------------- | --------------------------------------- |
| 200  | OK                    | Request succeeded                       |
| 201  | Created               | Resource created successfully           |
| 400  | Bad Request           | Invalid request data/validation error   |
| 401  | Unauthorized          | Missing or invalid authentication token |
| 403  | Forbidden             | Insufficient permissions                |
| 404  | Not Found             | Resource not found                      |
| 409  | Conflict              | Resource already exists                 |
| 429  | Too Many Requests     | Rate limit exceeded                     |
| 500  | Internal Server Error | Server error                            |

### Common Error Examples

**401 Unauthorized:**

```json
{
  "error": "Access denied. No token provided."
}
```

**400 Validation Error:**

```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Authentication Endpoints

### Register New User

Create a new user account and receive authentication tokens.

**Endpoint:** `POST /auth/register`  
**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "age": 30,
  "riskLevel": "MEDIUM"
}
```

**Field Validations:**

- `email` (required): Valid email format
- `password` (required): Minimum 8 characters, must include uppercase, lowercase, number, and special character
- `name` (required): 1-100 characters
- `age` (optional): Positive integer
- `riskLevel` (optional): One of: `LOW`, `MEDIUM`, `HIGH`

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "60d5ec49f1b2c8b1f8e4e1a1",
      "email": "user@example.com",
      "name": "John Doe",
      "age": 30,
      "riskLevel": "MEDIUM",
      "role": "USER",
      "isVerified": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "User registered successfully"
}
```

**Error Responses:**

- `400`: Validation error (weak password, invalid email, etc.)
- `409`: Email already exists

---

### Login

Authenticate with email and password to receive tokens.

**Endpoint:** `POST /auth/login`  
**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "60d5ec49f1b2c8b1f8e4e1a1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Login successful"
}
```

**Error Responses:**

- `400`: Validation error
- `401`: Invalid credentials

---

### Refresh Token

Obtain new access and refresh tokens using a valid refresh token.

**Endpoint:** `POST /auth/refresh`  
**Authentication:** Not required (but requires valid refresh token)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Tokens refreshed successfully"
}
```

**Error Responses:**

- `401`: Invalid or expired refresh token

---

### Google OAuth Login

Redirect to Google OAuth for authentication.

**Endpoint:** `GET /auth/google`  
**Authentication:** Not required

**Response:** Redirects to Google OAuth consent screen

---

**Endpoint:** `GET /auth/google/callback`  
**Authentication:** Not required (handled by Google OAuth)

**Query Parameters:**

- `code`: Authorization code from Google

**Response:** Redirects to frontend with tokens in URL or sets HttpOnly cookies

---

## Fund Endpoints

### Get All Funds

Retrieve paginated list of mutual funds with optional filtering.

**Endpoint:** `GET /funds`  
**Authentication:** Not required

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | number | Page number (1-indexed) | 1 |
| `limit` | number | Results per page (max 100) | 20 |
| `category` | string | Filter by fund category | - |
| `type` | string | Filter by fund type (EQUITY, DEBT, HYBRID, etc.) | - |
| `search` | string | Search in fund name | - |
| `sortBy` | string | Sort field (name, returns, expenseRatio) | name |
| `order` | string | Sort order (asc, desc) | asc |

**Example Request:**

```
GET /funds?page=1&limit=20&category=Large Cap&type=EQUITY&sortBy=returns&order=desc
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "funds": [
      {
        "id": "60d5ec49f1b2c8b1f8e4e1a2",
        "amfiCode": "119551",
        "name": "Axis Bluechip Fund - Direct Plan - Growth",
        "type": "EQUITY",
        "category": "Large Cap",
        "fundHouse": "Axis Mutual Fund",
        "expenseRatio": 0.45,
        "aum": 35000000000,
        "minInvestment": 500,
        "exitLoad": "1% if redeemed within 1 year",
        "returns": {
          "oneYear": 15.5,
          "threeYear": 18.2,
          "fiveYear": 16.8
        },
        "latestNav": {
          "value": 42.5678,
          "date": "2024-01-15"
        },
        "riskLevel": "HIGH"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 11,
      "totalFunds": 203,
      "hasMore": true
    }
  },
  "message": "Funds fetched successfully"
}
```

---

### Get Fund by ID

Retrieve detailed information for a specific fund.

**Endpoint:** `GET /funds/:id`  
**Authentication:** Not required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "fund": {
      "id": "60d5ec49f1b2c8b1f8e4e1a2",
      "amfiCode": "119551",
      "name": "Axis Bluechip Fund - Direct Plan - Growth",
      "type": "EQUITY",
      "category": "Large Cap",
      "fundHouse": "Axis Mutual Fund",
      "launchDate": "2010-01-01",
      "expenseRatio": 0.45,
      "aum": 35000000000,
      "minInvestment": 500,
      "minSip": 500,
      "sipDates": [1, 5, 10, 15, 20, 25],
      "exitLoad": "1% if redeemed within 1 year",
      "returns": {
        "oneMonth": 2.5,
        "threeMonth": 5.8,
        "sixMonth": 8.2,
        "oneYear": 15.5,
        "threeYear": 18.2,
        "fiveYear": 16.8,
        "tenYear": 14.5
      },
      "riskLevel": "HIGH",
      "rating": 4.5,
      "benchmark": "Nifty 50",
      "fundManager": {
        "name": "Shreyash Devalkar",
        "experience": "10 years"
      }
    }
  },
  "message": "Fund details fetched successfully"
}
```

**Error Responses:**

- `404`: Fund not found

---

### Get Fund NAV History

Retrieve historical NAV data for charting.

**Endpoint:** `GET /funds/:id/nav-history`  
**Authentication:** Not required

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `days` | number | Number of days (30, 90, 180, 365, 1095) | 365 |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "fundId": "60d5ec49f1b2c8b1f8e4e1a2",
    "fundName": "Axis Bluechip Fund - Direct Plan - Growth",
    "navData": [
      {
        "date": "2024-01-15",
        "nav": 42.5678
      },
      {
        "date": "2024-01-14",
        "nav": 42.4532
      }
    ],
    "dataPoints": 365
  },
  "message": "NAV history fetched successfully"
}
```

---

### Search Funds

Search for funds with autocomplete support.

**Endpoint:** `GET /funds/search`  
**Authentication:** Not required

**Query Parameters:**
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `q` | string | Search query (min 3 characters) | Yes |
| `limit` | number | Max results (default 10) | No |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "60d5ec49f1b2c8b1f8e4e1a2",
        "name": "Axis Bluechip Fund - Direct Plan - Growth",
        "category": "Large Cap",
        "type": "EQUITY",
        "latestNav": 42.5678
      }
    ],
    "count": 5
  }
}
```

---

## Portfolio Endpoints

**⚠️ All portfolio endpoints require authentication**

### Get All Portfolios

Retrieve all portfolios for the authenticated user with current values.

**Endpoint:** `GET /portfolio`  
**Authentication:** Required

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49f1b2c8b1f8e4e1a3",
      "name": "Retirement Portfolio",
      "totalInvested": 500000,
      "totalValue": 575000,
      "totalReturns": 75000,
      "totalReturnsPercent": 15,
      "items": [
        {
          "id": "60d5ec49f1b2c8b1f8e4e1a4",
          "fundId": "60d5ec49f1b2c8b1f8e4e1a2",
          "fund": {
            "name": "Axis Bluechip Fund - Direct Plan - Growth",
            "category": "Large Cap"
          },
          "units": 1000,
          "investedAmount": 40000,
          "currentValue": 42567.8,
          "returns": 2567.8,
          "returnsPercent": 6.42
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "message": "Portfolios fetched successfully"
}
```

---

### Get Portfolio by ID

Retrieve detailed information for a specific portfolio.

**Endpoint:** `GET /portfolio/:id`  
**Authentication:** Required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a3",
    "name": "Retirement Portfolio",
    "totalInvested": 500000,
    "totalValue": 575000,
    "totalReturns": 75000,
    "totalReturnsPercent": 15,
    "items": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Portfolio fetched successfully"
}
```

**Error Responses:**

- `401`: Unauthorized (invalid/missing token)
- `404`: Portfolio not found or doesn't belong to user

---

### Create Portfolio

Create a new portfolio.

**Endpoint:** `POST /portfolio`  
**Authentication:** Required

**Request Body:**

```json
{
  "name": "Retirement Portfolio"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a3",
    "name": "Retirement Portfolio",
    "totalValue": 0,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Portfolio created successfully"
}
```

---

### Update Portfolio

Update portfolio name.

**Endpoint:** `PUT /portfolio/:id`  
**Authentication:** Required

**Request Body:**

```json
{
  "name": "Updated Portfolio Name"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a3",
    "name": "Updated Portfolio Name",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "message": "Portfolio updated successfully"
}
```

---

### Delete Portfolio

Delete a portfolio and all its items.

**Endpoint:** `DELETE /portfolio/:id`  
**Authentication:** Required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Portfolio deleted successfully"
}
```

---

### Get Portfolio Summary

Get aggregated data across all portfolios with allocation breakdown.

**Endpoint:** `GET /portfolio/summary`  
**Authentication:** Required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalValue": 1500000,
    "totalInvested": 1200000,
    "totalReturns": 300000,
    "totalReturnsPercent": 25,
    "portfolioCount": 3,
    "holdingsCount": 15,
    "allocation": [
      {
        "category": "Large Cap",
        "value": 600000,
        "percentage": 40
      },
      {
        "category": "Mid Cap",
        "value": 450000,
        "percentage": 30
      }
    ],
    "holdings": [...]
  },
  "message": "Portfolio summary fetched successfully"
}
```

---

## Watchlist Endpoints

**⚠️ All watchlist endpoints require authentication**

### Add to Watchlist

Add a fund to user's watchlist.

**Endpoint:** `POST /watchlist`  
**Authentication:** Required

**Request Body:**

```json
{
  "fundId": "60d5ec49f1b2c8b1f8e4e1a2"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a5",
    "fundId": "60d5ec49f1b2c8b1f8e4e1a2",
    "fund": {
      "name": "Axis Bluechip Fund - Direct Plan - Growth",
      "category": "Large Cap"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Fund added to watchlist successfully"
}
```

**Error Responses:**

- `404`: Fund not found
- `409`: Fund already in watchlist

---

### Remove from Watchlist

Remove a fund from watchlist.

**Endpoint:** `DELETE /watchlist/:id`  
**Authentication:** Required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Fund removed from watchlist successfully"
}
```

---

### Get Watchlist

Retrieve user's complete watchlist with latest NAV.

**Endpoint:** `GET /watchlist`  
**Authentication:** Required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49f1b2c8b1f8e4e1a5",
      "fundId": "60d5ec49f1b2c8b1f8e4e1a2",
      "fund": {
        "id": "60d5ec49f1b2c8b1f8e4e1a2",
        "name": "Axis Bluechip Fund - Direct Plan - Growth",
        "category": "Large Cap",
        "type": "EQUITY",
        "expenseRatio": 0.45,
        "performances": [
          {
            "nav": 42.5678,
            "date": "2024-01-15"
          }
        ]
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "message": "Watchlist retrieved successfully"
}
```

---

## Goal Endpoints

**⚠️ All goal endpoints require authentication**

### Get All Goals

Retrieve all financial goals for the authenticated user.

**Endpoint:** `GET /goals`  
**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `status` | string | Filter by status (IN_PROGRESS, ACHIEVED, ABANDONED) | - |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49f1b2c8b1f8e4e1a6",
      "name": "House Down Payment",
      "targetAmount": 2000000,
      "currentAmount": 500000,
      "targetDate": "2026-12-31T00:00:00.000Z",
      "priority": "HIGH",
      "category": "HOUSE",
      "status": "IN_PROGRESS",
      "progress": 25,
      "remaining": 1500000,
      "daysRemaining": 720,
      "linkedFunds": ["60d5ec49f1b2c8b1f8e4e1a2"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Goals fetched successfully"
}
```

---

### Create Goal

Create a new financial goal.

**Endpoint:** `POST /goals`  
**Authentication:** Required

**Request Body:**

```json
{
  "name": "House Down Payment",
  "targetAmount": 2000000,
  "currentAmount": 500000,
  "targetDate": "2026-12-31T00:00:00.000Z",
  "priority": "HIGH",
  "category": "HOUSE",
  "description": "Save for house down payment",
  "linkedFunds": ["60d5ec49f1b2c8b1f8e4e1a2"]
}
```

**Field Validations:**

- `name` (required): 1-100 characters
- `targetAmount` (required): Positive number
- `currentAmount` (optional): Non-negative number, default 0
- `targetDate` (required): ISO 8601 datetime string
- `priority` (optional): LOW, MEDIUM, HIGH (default: MEDIUM)
- `category` (required): RETIREMENT, EDUCATION, HOUSE, VACATION, EMERGENCY, OTHER

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a6",
    "name": "House Down Payment",
    "targetAmount": 2000000,
    "currentAmount": 500000,
    "status": "IN_PROGRESS",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Goal created successfully"
}
```

---

### Update Goal

Update an existing goal.

**Endpoint:** `PUT /goals/:id`  
**Authentication:** Required

**Request Body:** (All fields optional)

```json
{
  "currentAmount": 600000,
  "status": "IN_PROGRESS"
}
```

**Response:** `200 OK`

---

### Delete Goal

Delete a goal.

**Endpoint:** `DELETE /goals/:id`  
**Authentication:** Required

**Response:** `200 OK`

---

### Get Goals Summary

Get aggregated goal statistics.

**Endpoint:** `GET /goals/summary`  
**Authentication:** Required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalGoals": 5,
    "activeGoals": 3,
    "achievedGoals": 2,
    "totalTargetAmount": 5000000,
    "totalCurrentAmount": 2000000,
    "overallProgress": 40,
    "byCategory": {
      "HOUSE": {
        "count": 1,
        "targetAmount": 2000000,
        "currentAmount": 500000
      },
      "RETIREMENT": {
        "count": 2,
        "targetAmount": 3000000,
        "currentAmount": 1500000
      }
    },
    "upcomingDeadlines": [...]
  },
  "message": "Goals summary fetched successfully"
}
```

---

## Market Data Endpoints

### Get Market Indices

Retrieve real-time market indices data.

**Endpoint:** `GET /market-indices`  
**Authentication:** Not required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "indices": [
      {
        "symbol": "^NSEI",
        "name": "NIFTY 50",
        "value": 21725.45,
        "change": 125.3,
        "changePercent": 0.58,
        "lastUpdated": "2024-01-15T15:30:00.000Z"
      },
      {
        "symbol": "^BSESN",
        "name": "SENSEX",
        "value": 71483.75,
        "change": 402.15,
        "changePercent": 0.57,
        "lastUpdated": "2024-01-15T15:30:00.000Z"
      }
    ]
  },
  "message": "Market indices fetched successfully"
}
```

---

## Calculator Endpoints

### SIP Calculator

Calculate SIP investment returns.

**Endpoint:** `POST /calculators/sip`  
**Authentication:** Not required

**Request Body:**

```json
{
  "monthlyInvestment": 10000,
  "expectedReturn": 12,
  "years": 10
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalInvestment": 1200000,
    "estimatedReturns": 1120000,
    "totalValue": 2320000,
    "breakdown": [
      {
        "year": 1,
        "invested": 120000,
        "value": 127440
      }
    ]
  }
}
```

---

### Lumpsum Calculator

Calculate lumpsum investment returns.

**Endpoint:** `POST /calculators/lumpsum`  
**Authentication:** Not required

**Request Body:**

```json
{
  "investment": 100000,
  "expectedReturn": 12,
  "years": 5
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalInvestment": 100000,
    "estimatedReturns": 76234,
    "totalValue": 176234
  }
}
```

---

## Rate Limiting

To prevent abuse, the API implements rate limiting:

**Limits:**

- **Public endpoints**: 100 requests per 15 minutes per IP
- **Authenticated endpoints**: 500 requests per 15 minutes per user
- **Heavy operations** (calculators, search): 50 requests per 15 minutes

**Rate Limit Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642252800
```

**Response when limit exceeded:** `429 Too Many Requests`

```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

---

## Example Usage (JavaScript/TypeScript)

### Authentication Flow

```typescript
// Register
const registerResponse = await fetch(
  'http://localhost:3002/api/auth/register',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'SecurePass123!',
      name: 'John Doe',
      age: 30,
      riskLevel: 'MEDIUM',
    }),
  }
);
const { data } = await registerResponse.json();
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);

// Protected API call
const portfolioResponse = await fetch('http://localhost:3002/api/portfolio', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
});
const portfolios = await portfolioResponse.json();

// Token refresh
const refreshResponse = await fetch('http://localhost:3002/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken'),
  }),
});
const newTokens = await refreshResponse.json();
localStorage.setItem('accessToken', newTokens.data.tokens.accessToken);
localStorage.setItem('refreshToken', newTokens.data.tokens.refreshToken);
```

---

## Support

For issues or questions:

- **Email**: support@mutualfundsportal.com
- **GitHub Issues**: https://github.com/your-repo/issues
- **Documentation**: https://docs.mutualfundsportal.com

---

**Last Updated:** January 2024  
**API Version:** v1.0.0
