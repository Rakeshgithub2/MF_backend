# API Testing Guide - AI Mutuals Backend

Complete guide to test all API endpoints manually.

---

## Prerequisites

```bash
# Set base URL
export BASE_URL="http://localhost:3002"

# For Windows PowerShell:
$BASE_URL = "http://localhost:3002"
```

---

## 1. Health & Test Endpoints

### Health Check

```bash
curl $BASE_URL/health

# Expected: {"status":"OK","timestamp":"...","uptime":...}
```

### Test Endpoint

```bash
curl $BASE_URL/api/test

# Expected: {"message":"API is working!"}
```

---

## 2. Authentication APIs

### Register

```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "name": "Test User"
  }'

# Save the token from response
export TOKEN="<your-token-here>"
```

### Login

```bash
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

### Get User Profile

```bash
curl $BASE_URL/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. ML & AI APIs

### Calculate Smart Score

```bash
curl -X POST $BASE_URL/api/ml/smart-score \
  -H "Content-Type: application/json" \
  -d '{
    "alpha": 5.2,
    "beta": 0.95,
    "stdDev": 12.5,
    "returns1Y": 18.5,
    "returns3Y": 16.2,
    "returns5Y": 14.8,
    "sharpeRatio": 1.8,
    "sortinoRatio": 2.2,
    "expenseRatio": 1.2,
    "aum": 5000,
    "consistencyIndex": 82,
    "maxDrawdown": -15.2,
    "informationRatio": 0.85
  }'

# Expected: Score, grade, recommendation, insights
```

### Risk Analysis

```bash
curl -X POST $BASE_URL/api/ml/risk-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "returns": [12.5, 8.2, -3.5, 15.8, 10.2, 18.5, -5.2, 14.5, 9.8, 16.2, 11.3, 7.8],
    "marketReturns": [10.0, 7.5, -2.0, 14.0, 9.5, 16.0, -4.0, 12.5, 8.5, 15.0, 10.5, 7.0],
    "riskFreeRate": 6.5
  }'

# Expected: Volatility, beta, sharpe, sortino, VaR, etc.
```

### Performance Prediction

```bash
curl -X POST $BASE_URL/api/ml/predict-performance \
  -H "Content-Type: application/json" \
  -d '{
    "navHistory": [
      {"date": "2024-01-01", "nav": 45.50},
      {"date": "2024-01-02", "nav": 46.20},
      {"date": "2024-01-03", "nav": 45.80},
      {"date": "2024-01-04", "nav": 47.10},
      {"date": "2024-01-05", "nav": 47.50}
    ]
  }'

# Note: Add 30+ days of data for better predictions
```

### Compare Funds

```bash
curl -X POST $BASE_URL/api/ml/compare-funds \
  -H "Content-Type: application/json" \
  -d '{
    "fund1": {
      "returns3Y": 18.5,
      "sharpeRatio": 2.0,
      "alpha": 4.5,
      "beta": 1.0,
      "stdDev": 12.0
    },
    "fund2": {
      "returns3Y": 10.2,
      "sharpeRatio": 0.8,
      "alpha": -1.2,
      "beta": 1.2,
      "stdDev": 22.0
    }
  }'
```

### AI Chat

```bash
curl -X POST $BASE_URL/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is SIP and how does it work?",
    "context": {}
  }'

# Try different queries:
# - "What are the best large-cap funds?"
# - "Explain Sharpe ratio"
# - "How to reduce risk in mutual funds?"
```

---

## 4. Calculator APIs

### SIP Calculator

```bash
curl -X POST $BASE_URL/api/calculator/sip \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyInvestment": 5000,
    "expectedReturn": 12,
    "timePeriod": 10
  }'

# Expected: investedAmount, estimatedReturns, totalValue, yearWiseBreakup
```

### Lumpsum Calculator

```bash
curl -X POST $BASE_URL/api/calculator/lumpsum \
  -H "Content-Type: application/json" \
  -d '{
    "investment": 100000,
    "expectedReturn": 12,
    "timePeriod": 5
  }'
```

### Step-up SIP

```bash
curl -X POST $BASE_URL/api/calculator/step-up-sip \
  -H "Content-Type: application/json" \
  -d '{
    "initialSIP": 5000,
    "stepUpPercentage": 10,
    "expectedReturn": 12,
    "timePeriod": 10
  }'
```

### Goal Planner

```bash
curl -X POST $BASE_URL/api/calculator/goal \
  -H "Content-Type: application/json" \
  -d '{
    "targetAmount": 1000000,
    "currentSavings": 100000,
    "timePeriod": 10,
    "expectedReturn": 12,
    "goalName": "Child Education"
  }'
```

### Retirement Calculator

```bash
curl -X POST $BASE_URL/api/calculator/retirement \
  -H "Content-Type: application/json" \
  -d '{
    "currentAge": 30,
    "retirementAge": 60,
    "currentSavings": 500000,
    "monthlyExpense": 50000,
    "expectedReturn": 12,
    "inflationRate": 6
  }'
```

---

## 5. Funds APIs

### List Funds

```bash
# Basic listing
curl "$BASE_URL/api/funds"

# With filters
curl "$BASE_URL/api/funds?category=Equity&riskLevel=Moderate&page=1&limit=10"

# With search
curl "$BASE_URL/api/funds?search=HDFC&minReturns3Y=15"
```

### Get Fund Details

```bash
# Replace {fundId} with actual fund ID
curl "$BASE_URL/api/funds/{fundId}"
```

### Compare Funds

```bash
curl -X POST "$BASE_URL/api/comparison/compare" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fundIds": ["fund1-id", "fund2-id", "fund3-id"]
  }'
```

---

## 6. Market Data APIs

### Market Indices

```bash
curl "$BASE_URL/api/market-indices"

# Expected: NIFTY 50, SENSEX, etc. with live data
```

### Latest News

```bash
curl "$BASE_URL/api/news"

# With category filter
curl "$BASE_URL/api/news?category=stock-market"
```

---

## 7. Portfolio & Watchlist

### Add to Watchlist

```bash
curl -X POST "$BASE_URL/api/watchlist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fundId": "fund-id-here"
  }'
```

### Get Watchlist

```bash
curl "$BASE_URL/api/watchlist" \
  -H "Authorization: Bearer $TOKEN"
```

### Remove from Watchlist

```bash
curl -X DELETE "$BASE_URL/api/watchlist/{watchlistItemId}" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 8. Alerts

### Create Alert

```bash
curl -X POST "$BASE_URL/api/alerts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fundId": "fund-id-here",
    "targetNAV": 150.50,
    "condition": "above",
    "alertType": "email"
  }'
```

### Get User Alerts

```bash
curl "$BASE_URL/api/alerts" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing with Postman

### Import Collection

1. Open Postman
2. Click Import
3. Paste this JSON:

```json
{
  "info": {
    "name": "AI Mutuals Backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "Smart Score",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/ml/smart-score",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"returns3Y\": 15.5,\n  \"sharpeRatio\": 1.8,\n  \"alpha\": 3.2\n}"
        },
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    },
    {
      "name": "AI Chat",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/ai/chat",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"query\": \"What is SIP?\"\n}"
        },
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    },
    {
      "name": "SIP Calculator",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/calculator/sip",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"monthlyInvestment\": 5000,\n  \"expectedReturn\": 12,\n  \"timePeriod\": 10\n}"
        },
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3002"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

---

## Automated Testing Script

### Bash Script (Linux/Mac)

```bash
#!/bin/bash

BASE_URL="http://localhost:3002"

echo "Testing AI Mutuals Backend..."

# Health check
echo -e "\n1. Health Check"
curl -s "$BASE_URL/health" | jq

# Smart score
echo -e "\n2. Smart Score"
curl -s -X POST "$BASE_URL/api/ml/smart-score" \
  -H "Content-Type: application/json" \
  -d '{"returns3Y":15.5,"sharpeRatio":1.8}' | jq

# AI Chat
echo -e "\n3. AI Chat"
curl -s -X POST "$BASE_URL/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is SIP?"}' | jq

# SIP Calculator
echo -e "\n4. SIP Calculator"
curl -s -X POST "$BASE_URL/api/calculator/sip" \
  -H "Content-Type: application/json" \
  -d '{"monthlyInvestment":5000,"expectedReturn":12,"timePeriod":10}' | jq

echo -e "\nAll tests completed!"
```

### PowerShell Script (Windows)

```powershell
$BASE_URL = "http://localhost:3002"

Write-Host "Testing AI Mutuals Backend..." -ForegroundColor Green

# Health check
Write-Host "`n1. Health Check" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/health" | ConvertTo-Json

# Smart score
Write-Host "`n2. Smart Score" -ForegroundColor Yellow
$body = @{returns3Y=15.5; sharpeRatio=1.8} | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE_URL/api/ml/smart-score" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json

# AI Chat
Write-Host "`n3. AI Chat" -ForegroundColor Yellow
$body = @{query="What is SIP?"} | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE_URL/api/ai/chat" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json

Write-Host "`nAll tests completed!" -ForegroundColor Green
```

---

## Response Examples

### Smart Score Response

```json
{
  "success": true,
  "data": {
    "score": 84.2,
    "grade": "A",
    "recommendation": "Strong Buy",
    "summary": "This fund has demonstrated exceptional performance with a grade of A...",
    "breakdown": {
      "returnScore": 88.5,
      "riskScore": 82.3,
      "consistencyScore": 85.0,
      "costScore": 78.5,
      "alphaScore": 90.0
    },
    "insights": [
      "✅ Exceptional historical returns",
      "✅ Low volatility",
      "✅ Strong alpha indicates superior fund management"
    ]
  }
}
```

### AI Chat Response

```json
{
  "success": true,
  "data": {
    "answer": "SIP (Systematic Investment Plan) is a disciplined way to invest...",
    "sources": [
      {
        "title": "Systematic Investment Plan (SIP)",
        "content": "SIP is a method of investing fixed amounts...",
        "relevance": 95
      }
    ],
    "followUpQuestions": [
      "What is the ideal SIP amount for a beginner?",
      "How does SIP compare to lumpsum investment?"
    ]
  }
}
```

---

## Tips

1. **Use jq for JSON formatting**: `curl ... | jq`
2. **Save token**: After login, export token to environment
3. **Test in order**: Health → Auth → ML → Calculators
4. **Check logs**: View backend logs for debugging
5. **Use Postman**: For easier testing with collections

---

## Troubleshooting

### Connection Refused

```bash
# Check if server is running
curl http://localhost:3002/health

# If not, start it
npm run dev
```

### 401 Unauthorized

```bash
# Get fresh token
curl -X POST http://localhost:3002/api/auth/login \
  -d '{"email":"...","password":"..."}'
```

### 500 Internal Server Error

```bash
# Check backend logs
docker-compose logs -f backend

# Or if running locally
tail -f logs/error.log
```

---

**Happy Testing! 🧪**
