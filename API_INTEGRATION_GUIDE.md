# 🔌 API Integration Guide - Live Data Sources

This document explains how your backend integrates with real external APIs for live data.

---

## 📊 **Active API Integrations**

### ✅ **1. Yahoo Finance API (via RapidAPI)**

**Purpose**: Real-time market data, benchmark indices (NIFTY, SENSEX)

**Configuration**:

```env
RAPIDAPI_KEY=90c72add46mshb5e4256d7aaae60p10c1fejsn41e66ecee4ab
RAPIDAPI_HOST=apidojo-yahoo-finance-v1.p.rapidapi.com
```

**Service File**: `src/services/yahooFinanceService.ts`

**Available Methods**:

```typescript
// Fetch historical price data
await yahooFinanceService.fetchHistoricalData(
  'NIFTY50', // Symbol
  '2024-01-01', // From date
  '2024-12-31' // To date
);

// Fetch benchmark data (NIFTY, SENSEX, NIFTY100)
await yahooFinanceService.fetchBenchmarkData(['NIFTY50', 'SENSEX', 'NIFTY100']);
```

**Example Response**:

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-11-05T00:00:00.000Z",
      "open": 24250.5,
      "high": 24380.2,
      "low": 24180.3,
      "close": 24350.8,
      "volume": 125000000,
      "symbol": "NIFTY50"
    }
  ]
}
```

**API Limits**: Depends on your RapidAPI plan

**Usage in Routes**:

```typescript
// GET /api/benchmarks/:symbol
router.get('/benchmarks/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const result = await yahooFinanceService.fetchHistoricalData(
    symbol,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    new Date().toISOString()
  );
  res.json(result);
});
```

---

### ✅ **2. Resend Email API**

**Purpose**: Transactional emails (verification, alerts, digests)

**Configuration**:

```env
RESEND_API_KEY=re_XeWNNhD8_2MX5QgyXSPUTkxUHRYKosddP
FROM_EMAIL=noreply@mutualfunds.com
```

**Limits**: 3000 emails/month on free tier

**Service File**: `src/services/emailService.ts`

**Available Email Types**:

1. **Verification Email**

```typescript
await emailService.sendVerificationEmail('user@example.com', {
  name: 'John Doe',
  verificationUrl: 'https://yourdomain.com/verify?token=abc123',
});
```

2. **Alert Email**

```typescript
await emailService.sendAlertEmail('user@example.com', {
  name: 'John Doe',
  fundName: 'HDFC Top 100 Fund',
  alertType: 'Price Drop',
  condition: 'NAV below ₹250',
  currentValue: '₹245.50',
});
```

3. **Daily Digest Email**

```typescript
await emailService.sendDigestEmail('user@example.com', {
  name: 'John Doe',
  portfolioSummary: {
    totalValue: '₹14,30,420',
    dayChange: '+₹12,500',
    dayChangePercent: '+0.88%',
  },
  topPerformers: [
    { name: 'SBI Small Cap Fund', change: '+2.5%' },
    { name: 'HDFC Mid-Cap Fund', change: '+1.8%' },
  ],
  alerts: [{ fundName: 'ICICI Value Fund', message: 'NAV crossed ₹250' }],
});
```

**Email Templates**: HTML templates with Handlebars are built into the service

**Usage in Background Jobs**:

```typescript
// Send daily digest at 8 AM
cron.schedule('0 8 * * *', async () => {
  const users = await prisma.user.findMany({ where: { emailVerified: true } });
  for (const user of users) {
    await emailService.sendDigestEmail(user.email, digestData);
  }
});
```

---

### ✅ **3. NewsData.io API**

**Purpose**: Financial news related to mutual funds and stock market

**Configuration**:

```env
NEWSDATA_API_KEY=pub_6102124e44fa4885b9df77c0c7aa5c0cbe7e8
```

**Limits**: 200 requests/day on free tier

**Service File**: `src/services/newsService.ts`

**Available Methods**:

```typescript
// Ingest news articles
await newsService.ingestNews(
  'business', // Category
  [
    // Keywords
    'mutual fund',
    'investment',
    'portfolio',
    'equity',
    'debt',
  ]
);

// Get recent news
const recentNews = await newsService.getRecentNews(10);
```

**Automatic Features**:

- **Duplicate Detection**: Checks if article already exists
- **Tag Extraction**: Automatically extracts financial terms
- **Category Mapping**: Maps news categories to internal types

**Example News Record**:

```json
{
  "id": "uuid",
  "title": "Mutual Fund Returns Hit 5-Year High",
  "source": "economic-times",
  "category": "MARKET",
  "tags": ["mutual fund", "returns", "equity", "nifty"],
  "publishedAt": "2024-11-05T10:30:00.000Z"
}
```

**Usage in Routes**:

```typescript
// GET /api/news/latest
router.get('/news/latest', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const news = await newsService.getRecentNews(limit);
  res.json({ success: true, data: news });
});
```

**Scheduled Ingestion**:

```typescript
// Ingest news every 6 hours
cron.schedule('0 */6 * * *', async () => {
  await newsService.ingestNews();
});
```

---

### ✅ **4. AMFI NAV Data**

**Purpose**: Official NAV data for all mutual funds in India

**Configuration**:

```env
AMFI_NAV_URL=https://www.amfiindia.com/spages/NAVAll.txt
```

**Limits**: Free, no rate limits (official source)

**Service File**: `src/services/amfiService.ts`

**Data Format**: Semicolon-separated text file

```
AMFI_Code;ISIN_Div_Payout_Growth;ISIN_Div_Reinvestment;Scheme_Name;Net_Asset_Value;Date
119551;INF204KA1H94;INF204KA1H86;Aditya Birla Sun Life Liquid Fund - Direct Plan-Growth;399.4523;05-Nov-2024
```

**Available Methods**:

```typescript
// Ingest NAV data from AMFI
const result = await amfiService.ingestNAVData();
console.log(`Processed: ${result.processed}, Errors: ${result.errors.length}`);
```

**Features**:

- **Batch Processing**: Processes 1000 records at a time
- **Fund Auto-Creation**: Creates fund if it doesn't exist
- **Type Inference**: Automatically infers fund type and category
- **Duplicate Handling**: Upserts NAV records to avoid duplicates
- **Cache Invalidation**: Clears cached fund data after ingestion

**Scheduled Ingestion**:

```typescript
// Run daily at 11 PM IST (after market closes)
cron.schedule('0 23 * * *', async () => {
  console.log('Starting daily AMFI NAV ingestion...');
  const result = await amfiService.ingestNAVData();
  console.log(`AMFI ingestion complete: ${result.processed} records`);
});
```

**Database Impact**:

- Updates `Fund` table
- Updates `FundPerformance` table with daily NAV

---

## 🔄 **Background Jobs Schedule**

All jobs are configured in `src/scripts/start-scheduler.ts`

```typescript
// Daily NAV Update (11 PM IST)
cron.schedule('0 23 * * *', async () => {
  await amfiService.ingestNAVData();
});

// Hourly Price Updates (Every hour)
cron.schedule('0 * * * *', async () => {
  await yahooFinanceService.fetchBenchmarkData();
});

// News Ingestion (Every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  await newsService.ingestNews();
});

// Daily Digest Email (8 AM IST)
cron.schedule('0 8 * * *', async () => {
  // Send digest to all users
});

// Alert Checking (Every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  // Check and trigger alerts
});
```

---

## 🛠️ **New API Endpoints to Create**

### Investment Email Notifications

Create: `src/services/investmentEmailService.ts`

```typescript
import { emailService } from './emailService';

export class InvestmentEmailService {
  async sendInvestmentConfirmation(data: {
    userEmail: string;
    userName: string;
    fundName: string;
    amount: number;
    units: number;
    nav: number;
    orderId: string;
  }) {
    const html = `
      <h2>Investment Confirmation</h2>
      <p>Dear ${data.userName},</p>
      <p>Your investment has been successfully processed.</p>
      <ul>
        <li><strong>Fund:</strong> ${data.fundName}</li>
        <li><strong>Amount:</strong> ₹${data.amount.toLocaleString()}</li>
        <li><strong>Units:</strong> ${data.units}</li>
        <li><strong>NAV:</strong> ₹${data.nav}</li>
        <li><strong>Order ID:</strong> ${data.orderId}</li>
      </ul>
    `;

    // Implementation using Resend
    return await this.sendEmail(
      data.userEmail,
      'Investment Confirmation',
      html
    );
  }

  async sendSIPConfirmation(data: {
    userEmail: string;
    userName: string;
    fundName: string;
    monthlyAmount: number;
    frequency: string;
    startDate: Date;
    mandateId: string;
  }) {
    const html = `
      <h2>SIP Mandate Created</h2>
      <p>Dear ${data.userName},</p>
      <p>Your SIP has been successfully set up.</p>
      <ul>
        <li><strong>Fund:</strong> ${data.fundName}</li>
        <li><strong>Monthly Amount:</strong> ₹${data.monthlyAmount.toLocaleString()}</li>
        <li><strong>Frequency:</strong> ${data.frequency}</li>
        <li><strong>Start Date:</strong> ${data.startDate.toDateString()}</li>
        <li><strong>Mandate ID:</strong> ${data.mandateId}</li>
      </ul>
    `;

    return await this.sendEmail(data.userEmail, 'SIP Confirmation', html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    // Use existing Resend integration
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    return await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@mutualfunds.com',
      to,
      subject,
      html,
    });
  }
}

export const investmentEmailService = new InvestmentEmailService();
```

### KYC Email Notifications

Create: `src/services/kycEmailService.ts`

```typescript
export class KYCEmailService {
  async sendKYCSubmission(userEmail: string, userName: string) {
    const html = `
      <h2>KYC Submitted Successfully</h2>
      <p>Dear ${userName},</p>
      <p>Your KYC documents have been received and are under review.</p>
      <p>Expected approval time: 24-48 hours</p>
      <p>You will receive an email once your KYC is approved.</p>
    `;

    return await this.sendEmail(userEmail, 'KYC Submission Confirmation', html);
  }

  async sendKYCApproval(userEmail: string, userName: string) {
    const html = `
      <h2>KYC Approved! 🎉</h2>
      <p>Dear ${userName},</p>
      <p>Your KYC has been successfully verified and approved.</p>
      <p>You can now start investing in mutual funds.</p>
      <a href="${process.env.FRONTEND_URL}/invest">Start Investing</a>
    `;

    return await this.sendEmail(userEmail, 'KYC Approved', html);
  }

  async sendKYCRejection(userEmail: string, userName: string, reason: string) {
    const html = `
      <h2>KYC Verification Issue</h2>
      <p>Dear ${userName},</p>
      <p>Unfortunately, we could not verify your KYC documents.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please resubmit your documents with the correct information.</p>
    `;

    return await this.sendEmail(userEmail, 'KYC Verification Issue', html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    return await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@mutualfunds.com',
      to,
      subject,
      html,
    });
  }
}

export const kycEmailService = new KYCEmailService();
```

---

## 📡 **Testing APIs**

### Test Yahoo Finance

```bash
curl -X GET \
  'https://apidojo-yahoo-finance-v1.p.rapidapi.com/v8/finance/chart/NIFTY50?period1=1704067200&period2=1735689600&interval=1d' \
  -H 'X-RapidAPI-Host: apidojo-yahoo-finance-v1.p.rapidapi.com' \
  -H 'X-RapidAPI-Key: 90c72add46mshb5e4256d7aaae60p10c1fejsn41e66ecee4ab'
```

### Test Resend Email

```typescript
// Test in your backend
const { emailService } = require('./services/emailService');

await emailService.sendVerificationEmail('test@example.com', {
  name: 'Test User',
  verificationUrl: 'http://localhost:3000/verify?token=test123',
});
```

### Test NewsData.io

```bash
curl 'https://newsdata.io/api/1/latest?apikey=pub_6102124e44fa4885b9df77c0c7aa5c0cbe7e8&q=mutual%20fund&language=en&country=in'
```

### Test AMFI

```bash
curl 'https://www.amfiindia.com/spages/NAVAll.txt'
```

---

## 🚨 **Error Handling**

All services include comprehensive error handling:

```typescript
try {
  const result = await amfiService.ingestNAVData();
  if (result.errors.length > 0) {
    console.error('AMFI ingestion errors:', result.errors);
    // Send alert to admin
  }
} catch (error) {
  console.error('Critical error:', error);
  // Log to error monitoring service (Sentry)
}
```

---

## 📊 **API Usage Monitoring**

Create a simple usage tracking service:

```typescript
// src/utils/apiUsageTracker.ts
export class APIUsageTracker {
  private static usage = new Map<string, number>();

  static track(apiName: string) {
    const current = this.usage.get(apiName) || 0;
    this.usage.set(apiName, current + 1);
  }

  static getUsage() {
    return Object.fromEntries(this.usage);
  }

  static reset() {
    this.usage.clear();
  }
}

// Usage
APIUsageTracker.track('yahoo-finance');
APIUsageTracker.track('newsdata');
```

---

## ✅ **Production Checklist**

- [x] Yahoo Finance API integrated
- [x] Resend Email API integrated
- [x] NewsData.io API integrated
- [x] AMFI NAV ingestion working
- [ ] Investment confirmation emails
- [ ] KYC notification emails
- [ ] Alert triggering system
- [ ] Daily digest emails
- [ ] Error monitoring (Sentry)
- [ ] API usage monitoring
- [ ] Rate limit handling
- [ ] Retry logic for failed API calls

---

## 🔗 **Useful Links**

- [Yahoo Finance API Docs](https://rapidapi.com/apidojo/api/yahoo-finance1)
- [Resend API Docs](https://resend.com/docs)
- [NewsData.io Docs](https://newsdata.io/documentation)
- [AMFI Official Site](https://www.amfiindia.com)

---

**Last Updated**: November 5, 2025  
**Status**: All APIs Active and Configured
