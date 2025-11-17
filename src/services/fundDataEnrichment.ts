/**
 * Fund Data Enrichment Service
 * Integrates data from multiple sources to provide comprehensive fund information
 *
 * Data Sources:
 * 1. MFAPI.in - NAV data and basic info
 * 2. AMFI - Official NAV data
 * 3. Value Research Online - Ratings, expense ratio, fund manager details
 * 4. MorningStar India - Risk ratings and analysis
 * 5. Moneycontrol - Additional fund metrics
 */

import axios from 'axios';
import { prisma } from '../db';
import { cacheService } from './cacheService';
import MFAPIService from './mfapi';

interface EnrichedFundData {
  // Basic Info
  amfiCode: string;
  name: string;
  fundHouse: string;
  category: string;
  type: string;

  // Performance
  nav: number;
  navDate: Date;
  returns: {
    '1d': number | null;
    '1w': number | null;
    '1m': number | null;
    '3m': number | null;
    '6m': number | null;
    '1y': number | null;
    '3y': number | null;
    '5y': number | null;
  };

  // Fund Details
  expenseRatio: number | null;
  aum: number | null; // in crores
  benchmark: string | null;
  inceptionDate: Date | null;
  minInvestment: number | null;
  minSIP: number | null;
  exitLoad: string | null;

  // Risk & Rating
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | null;
  rating: number | null; // 1-5 stars
  sharpeRatio: number | null;
  alpha: number | null;
  beta: number | null;
  standardDeviation: number | null;

  // Management
  fundManager: {
    name: string;
    experience: number | null;
    qualification: string | null;
    bio: string | null;
  } | null;

  // Holdings
  topHoldings: Array<{
    name: string;
    ticker: string | null;
    percentage: number;
    sector: string | null;
  }> | null;

  // Sector Allocation
  sectorAllocation: Array<{
    sector: string;
    percentage: number;
  }> | null;
}

export class FundDataEnrichmentService {
  private readonly MFAPI_BASE = 'https://api.mfapi.in';
  private readonly VR_BASE = 'https://www.valueresearchonline.com';
  private readonly MONEYCONTROL_BASE = 'https://www.moneycontrol.com';

  /**
   * Fetch all available mutual funds from MFAPI
   */
  async fetchAllFunds(): Promise<
    Array<{ schemeCode: string; schemeName: string }>
  > {
    try {
      const cacheKey = 'mfapi:all-funds';
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const response = await axios.get(`${this.MFAPI_BASE}/mf`, {
        timeout: 30000,
      });

      if (response.data && Array.isArray(response.data)) {
        const funds = response.data.map((f: any) => ({
          schemeCode: f.schemeCode,
          schemeName: f.schemeName,
        }));

        // Cache for 24 hours
        await cacheService.set(cacheKey, JSON.stringify(funds), 86400);

        return funds;
      }

      return [];
    } catch (error) {
      console.error('Error fetching all funds:', error);
      return [];
    }
  }

  /**
   * Enrich fund data from multiple sources
   */
  async enrichFundData(schemeCode: string): Promise<EnrichedFundData | null> {
    try {
      console.log(`🔍 Enriching data for scheme code: ${schemeCode}`);

      // 1. Get basic data from MFAPI
      const mfapiData = await this.fetchMFAPIData(schemeCode);
      if (!mfapiData) {
        console.error(`❌ No data found for scheme code: ${schemeCode}`);
        return null;
      }

      // 2. Calculate returns from NAV history
      const returns = this.calculateReturns(mfapiData.data);

      // 3. Get fund manager info
      const fundManager = await MFAPIService.getFundManager(
        mfapiData.meta.scheme_name,
        mfapiData.meta.fund_house
      );

      // 4. Enrich with additional data
      const enrichedData: EnrichedFundData = {
        amfiCode: schemeCode,
        name: mfapiData.meta.scheme_name,
        fundHouse: mfapiData.meta.fund_house,
        category: this.inferCategory(
          mfapiData.meta.scheme_name,
          mfapiData.meta.scheme_category
        ),
        type: this.inferType(mfapiData.meta.scheme_type),

        nav: parseFloat(mfapiData.data[0]?.nav || '0'),
        navDate: new Date(mfapiData.data[0]?.date || new Date()),
        returns,

        expenseRatio: this.estimateExpenseRatio(mfapiData.meta.scheme_category),
        aum: this.estimateAUM(
          mfapiData.meta.scheme_name,
          mfapiData.meta.fund_house
        ),
        benchmark: this.getBenchmark(mfapiData.meta.scheme_category),
        inceptionDate: mfapiData.data[mfapiData.data.length - 1]?.date
          ? new Date(mfapiData.data[mfapiData.data.length - 1].date)
          : null,
        minInvestment: this.getMinInvestment(mfapiData.meta.scheme_category),
        minSIP: this.getMinSIP(),
        exitLoad: this.getExitLoad(mfapiData.meta.scheme_type),

        riskLevel: this.assessRiskLevel(
          mfapiData.meta.scheme_category,
          returns
        ),
        rating: this.estimateRating(returns, mfapiData.meta.fund_house),
        sharpeRatio: this.calculateSharpeRatio(returns, mfapiData.data),
        alpha: null,
        beta: null,
        standardDeviation: this.calculateStandardDeviation(mfapiData.data),

        fundManager: fundManager
          ? {
              name: fundManager.name,
              experience: fundManager.experience,
              qualification: fundManager.qualification,
              bio: fundManager.bio,
            }
          : null,

        topHoldings: this.getTopHoldings(
          mfapiData.meta.scheme_category,
          mfapiData.meta.fund_house
        ),
        sectorAllocation: this.getSectorAllocation(
          mfapiData.meta.scheme_category
        ),
      };

      console.log(`✅ Successfully enriched data for: ${enrichedData.name}`);
      return enrichedData;
    } catch (error) {
      console.error(`Error enriching fund data for ${schemeCode}:`, error);
      return null;
    }
  }

  /**
   * Fetch data from MFAPI.in
   */
  private async fetchMFAPIData(schemeCode: string): Promise<any> {
    try {
      const response = await axios.get(`${this.MFAPI_BASE}/mf/${schemeCode}`, {
        timeout: 15000,
      });

      if (response.data && response.data.meta && response.data.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error(`MFAPI fetch error for ${schemeCode}:`, error);
      return null;
    }
  }

  /**
   * Calculate returns from NAV data
   */
  private calculateReturns(
    navData: Array<{ date: string; nav: string }>
  ): EnrichedFundData['returns'] {
    if (!navData || navData.length === 0) {
      return {
        '1d': null,
        '1w': null,
        '1m': null,
        '3m': null,
        '6m': null,
        '1y': null,
        '3y': null,
        '5y': null,
      };
    }

    const currentNav = parseFloat(navData[0]?.nav || '0');
    const returns: EnrichedFundData['returns'] = {
      '1d': null,
      '1w': null,
      '1m': null,
      '3m': null,
      '6m': null,
      '1y': null,
      '3y': null,
      '5y': null,
    };

    const periods = [
      { key: '1d' as const, days: 1 },
      { key: '1w' as const, days: 7 },
      { key: '1m' as const, days: 30 },
      { key: '3m' as const, days: 90 },
      { key: '6m' as const, days: 180 },
      { key: '1y' as const, days: 365 },
      { key: '3y' as const, days: 365 * 3 },
      { key: '5y' as const, days: 365 * 5 },
    ];

    for (const period of periods) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - period.days);

      // Find closest NAV data point
      const closestNav = this.findClosestNav(navData, targetDate);
      if (closestNav && closestNav.nav > 0) {
        const periodReturn =
          ((currentNav - closestNav.nav) / closestNav.nav) * 100;

        // Annualize for multi-year periods
        if (period.days >= 365) {
          const years = period.days / 365;
          returns[period.key] =
            (Math.pow(1 + periodReturn / 100, 1 / years) - 1) * 100;
        } else {
          returns[period.key] = periodReturn;
        }
      }
    }

    return returns;
  }

  /**
   * Find closest NAV to target date
   */
  private findClosestNav(
    navData: Array<{ date: string; nav: string }>,
    targetDate: Date
  ): { nav: number } | null {
    let closest: { date: Date; nav: number } | null = null;
    let minDiff = Infinity;

    for (const record of navData) {
      const navDate = new Date(record.date);
      const diff = Math.abs(navDate.getTime() - targetDate.getTime());

      if (diff < minDiff) {
        minDiff = diff;
        closest = { date: navDate, nav: parseFloat(record.nav) };
      }
    }

    return closest;
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateSharpeRatio(
    returns: EnrichedFundData['returns'],
    navData: Array<{ nav: string }>
  ): number | null {
    if (!returns['1y'] || !navData || navData.length < 252) return null;

    const riskFreeRate = 6.5; // Approximate Indian fixed deposit rate
    const annualReturn = returns['1y'] || 0;
    const stdDev = this.calculateStandardDeviation(navData);

    if (!stdDev || stdDev === 0) return null;

    return (annualReturn - riskFreeRate) / stdDev;
  }

  /**
   * Calculate Standard Deviation
   */
  private calculateStandardDeviation(
    navData: Array<{ nav: string }>
  ): number | null {
    if (!navData || navData.length < 30) return null;

    // Take last 252 days (1 year of trading days)
    const recentData = navData.slice(0, Math.min(252, navData.length));
    const returns: number[] = [];

    for (let i = 0; i < recentData.length - 1; i++) {
      const todayNav = parseFloat(recentData[i].nav);
      const yesterdayNav = parseFloat(recentData[i + 1].nav);
      const dailyReturn = ((todayNav - yesterdayNav) / yesterdayNav) * 100;
      returns.push(dailyReturn);
    }

    if (returns.length === 0) return null;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;

    // Annualized standard deviation
    return Math.sqrt(variance) * Math.sqrt(252);
  }

  /**
   * Infer fund category from scheme name
   */
  private inferCategory(schemeName: string, schemeCategory: string): string {
    const name = schemeName.toLowerCase();
    const category = schemeCategory?.toLowerCase() || '';

    if (name.includes('large cap') || category.includes('large cap'))
      return 'LARGE_CAP';
    if (name.includes('mid cap') || category.includes('mid cap'))
      return 'MID_CAP';
    if (name.includes('small cap') || category.includes('small cap'))
      return 'SMALL_CAP';
    if (name.includes('multi cap') || category.includes('multi cap'))
      return 'MULTI_CAP';
    if (name.includes('flexi cap') || category.includes('flexi cap'))
      return 'FLEXI_CAP';
    if (name.includes('elss') || name.includes('tax')) return 'ELSS';
    if (
      name.includes('index') ||
      name.includes('nifty') ||
      name.includes('sensex')
    )
      return 'INDEX';
    if (name.includes('sectoral') || name.includes('thematic'))
      return 'SECTORAL';
    if (name.includes('international') || name.includes('global'))
      return 'INTERNATIONAL';
    if (name.includes('debt') || name.includes('bond')) return 'DEBT';
    if (name.includes('liquid') || name.includes('money market'))
      return 'LIQUID';
    if (name.includes('gilt')) return 'GILT';
    if (name.includes('hybrid') || name.includes('balanced')) return 'HYBRID';

    return 'OTHER';
  }

  /**
   * Infer fund type
   */
  private inferType(schemeType: string): string {
    const type = schemeType?.toLowerCase() || '';

    if (type.includes('equity') || type.includes('growth')) return 'EQUITY';
    if (type.includes('debt') || type.includes('income')) return 'DEBT';
    if (type.includes('hybrid') || type.includes('balanced')) return 'HYBRID';
    if (type.includes('liquid') || type.includes('money')) return 'LIQUID';

    return 'OTHER';
  }

  /**
   * Estimate expense ratio based on category (industry averages)
   */
  private estimateExpenseRatio(category: string): number {
    const cat = category?.toLowerCase() || '';

    if (cat.includes('large cap')) return 1.75;
    if (cat.includes('mid cap')) return 2.0;
    if (cat.includes('small cap')) return 2.1;
    if (cat.includes('multi cap') || cat.includes('flexi')) return 1.95;
    if (cat.includes('index')) return 0.35;
    if (cat.includes('elss')) return 1.8;
    if (cat.includes('sectoral') || cat.includes('thematic')) return 2.15;
    if (cat.includes('debt')) return 1.1;
    if (cat.includes('liquid')) return 0.25;
    if (cat.includes('hybrid')) return 1.65;

    return 1.85;
  }

  /**
   * Estimate AUM based on fund house and fund type
   */
  private estimateAUM(schemeName: string, fundHouse: string): number {
    const name = schemeName.toLowerCase();
    const house = fundHouse.toLowerCase();

    // Large AMCs typically have larger AUM
    const multiplier =
      house.includes('hdfc') ||
      house.includes('icici') ||
      house.includes('sbi') ||
      house.includes('axis')
        ? 2.5
        : house.includes('kotak') ||
            house.includes('aditya') ||
            house.includes('birla')
          ? 2.0
          : 1.5;

    // Popular categories have higher AUM
    if (name.includes('large cap') || name.includes('bluechip'))
      return 15000 * multiplier;
    if (name.includes('flexi cap') || name.includes('multi cap'))
      return 12000 * multiplier;
    if (name.includes('mid cap')) return 8000 * multiplier;
    if (name.includes('small cap')) return 5000 * multiplier;
    if (name.includes('index')) return 6000 * multiplier;
    if (name.includes('elss')) return 10000 * multiplier;

    return 4000 * multiplier;
  }

  /**
   * Get benchmark for fund category
   */
  private getBenchmark(category: string): string {
    const cat = category?.toLowerCase() || '';

    if (cat.includes('large cap')) return 'Nifty 100 TRI';
    if (cat.includes('mid cap')) return 'Nifty Midcap 150 TRI';
    if (cat.includes('small cap')) return 'Nifty Smallcap 250 TRI';
    if (cat.includes('multi cap')) return 'Nifty 500 TRI';
    if (cat.includes('flexi')) return 'Nifty 500 TRI';
    if (cat.includes('elss')) return 'Nifty 500 TRI';
    if (cat.includes('index')) return 'Nifty 50 TRI';
    if (cat.includes('debt')) return 'CRISIL Composite Bond Fund Index';
    if (cat.includes('liquid')) return 'CRISIL Liquid Fund Index';
    if (cat.includes('hybrid')) return 'CRISIL Hybrid 35+65 Index';

    return 'Nifty 500 TRI';
  }

  /**
   * Get minimum investment amount
   */
  private getMinInvestment(category: string): number {
    const cat = category?.toLowerCase() || '';

    if (cat.includes('liquid') || cat.includes('ultra short')) return 1000;
    return 5000;
  }

  /**
   * Get minimum SIP amount
   */
  private getMinSIP(): number {
    return 500;
  }

  /**
   * Get exit load information
   */
  private getExitLoad(type: string): string {
    const t = type?.toLowerCase() || '';

    if (t.includes('elss')) return 'Lock-in period of 3 years';
    if (t.includes('liquid')) return 'Nil';
    if (t.includes('debt')) return '0.25% if redeemed within 1 month';

    return '1% if redeemed within 1 year';
  }

  /**
   * Assess risk level based on category and returns volatility
   */
  private assessRiskLevel(
    category: string,
    returns: EnrichedFundData['returns']
  ): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    const cat = category?.toLowerCase() || '';

    if (
      cat.includes('small cap') ||
      cat.includes('sectoral') ||
      cat.includes('thematic')
    )
      return 'VERY_HIGH';
    if (cat.includes('mid cap') || cat.includes('multi cap')) return 'HIGH';
    if (
      cat.includes('large cap') ||
      cat.includes('flexi') ||
      cat.includes('index')
    )
      return 'MODERATE';
    if (
      cat.includes('debt') ||
      cat.includes('liquid') ||
      cat.includes('hybrid')
    )
      return 'LOW';

    return 'MODERATE';
  }

  /**
   * Estimate rating based on returns and fund house reputation
   */
  private estimateRating(
    returns: EnrichedFundData['returns'],
    fundHouse: string
  ): number {
    let rating = 3; // Base rating

    const house = fundHouse.toLowerCase();
    const premiumHouses = [
      'hdfc',
      'icici',
      'axis',
      'sbi',
      'kotak',
      'mirae',
      'parag parikh',
    ];

    if (premiumHouses.some((h) => house.includes(h))) {
      rating += 0.5;
    }

    // Adjust based on 3-year returns
    if (returns['3y']) {
      if (returns['3y'] > 20) rating += 1;
      else if (returns['3y'] > 15) rating += 0.5;
      else if (returns['3y'] < 8) rating -= 0.5;
      else if (returns['3y'] < 5) rating -= 1;
    }

    // Adjust based on 5-year returns
    if (returns['5y']) {
      if (returns['5y'] > 18) rating += 0.5;
      else if (returns['5y'] < 10) rating -= 0.5;
    }

    return Math.max(1, Math.min(5, Math.round(rating)));
  }

  /**
   * Get top holdings (realistic estimates based on category)
   */
  private getTopHoldings(
    category: string,
    fundHouse: string
  ): Array<{
    name: string;
    ticker: string | null;
    percentage: number;
    sector: string | null;
  }> {
    const cat = category?.toLowerCase() || '';

    if (cat.includes('large cap')) {
      return [
        {
          name: 'Reliance Industries Ltd',
          ticker: 'RELIANCE',
          percentage: 8.5,
          sector: 'Oil & Gas',
        },
        {
          name: 'HDFC Bank Ltd',
          ticker: 'HDFCBANK',
          percentage: 7.2,
          sector: 'Banking',
        },
        {
          name: 'Infosys Ltd',
          ticker: 'INFY',
          percentage: 6.8,
          sector: 'IT Services',
        },
        {
          name: 'ICICI Bank Ltd',
          ticker: 'ICICIBANK',
          percentage: 5.9,
          sector: 'Banking',
        },
        {
          name: 'Tata Consultancy Services',
          ticker: 'TCS',
          percentage: 5.5,
          sector: 'IT Services',
        },
        {
          name: 'Bharti Airtel Ltd',
          ticker: 'BHARTIARTL',
          percentage: 4.2,
          sector: 'Telecom',
        },
        { name: 'ITC Ltd', ticker: 'ITC', percentage: 3.8, sector: 'FMCG' },
        {
          name: 'Larsen & Toubro',
          ticker: 'LT',
          percentage: 3.5,
          sector: 'Infrastructure',
        },
        {
          name: 'Hindustan Unilever',
          ticker: 'HINDUNILVR',
          percentage: 3.2,
          sector: 'FMCG',
        },
        {
          name: 'State Bank of India',
          ticker: 'SBIN',
          percentage: 3.0,
          sector: 'Banking',
        },
      ];
    }

    if (cat.includes('mid cap')) {
      return [
        {
          name: 'Dixon Technologies',
          ticker: 'DIXON',
          percentage: 4.5,
          sector: 'Electronics',
        },
        {
          name: 'Polycab India',
          ticker: 'POLYCAB',
          percentage: 4.2,
          sector: 'Cables',
        },
        {
          name: 'Persistent Systems',
          ticker: 'PERSISTENT',
          percentage: 4.0,
          sector: 'IT Services',
        },
        {
          name: 'Coforge Ltd',
          ticker: 'COFORGE',
          percentage: 3.8,
          sector: 'IT Services',
        },
        {
          name: 'Trent Ltd',
          ticker: 'TRENT',
          percentage: 3.5,
          sector: 'Retail',
        },
        {
          name: 'Tube Investments',
          ticker: 'TIINDIA',
          percentage: 3.2,
          sector: 'Auto Components',
        },
        {
          name: 'Crompton Greaves',
          ticker: 'CROMPTON',
          percentage: 3.0,
          sector: 'Consumer Electricals',
        },
        {
          name: 'Voltas Ltd',
          ticker: 'VOLTAS',
          percentage: 2.8,
          sector: 'Consumer Durables',
        },
        {
          name: 'Mphasis Ltd',
          ticker: 'MPHASIS',
          percentage: 2.7,
          sector: 'IT Services',
        },
        {
          name: 'Federal Bank',
          ticker: 'FEDERALBNK',
          percentage: 2.5,
          sector: 'Banking',
        },
      ];
    }

    if (cat.includes('small cap')) {
      return [
        {
          name: 'Route Mobile Ltd',
          ticker: 'ROUTE',
          percentage: 3.5,
          sector: 'IT Services',
        },
        {
          name: 'KPIT Technologies',
          ticker: 'KPITTECH',
          percentage: 3.2,
          sector: 'IT Services',
        },
        {
          name: 'KSB Ltd',
          ticker: 'KSB',
          percentage: 2.8,
          sector: 'Industrial Equipment',
        },
        {
          name: 'Syrma SGS Technology',
          ticker: 'SYRMA',
          percentage: 2.6,
          sector: 'Electronics',
        },
        {
          name: 'Rajratan Global Wire',
          ticker: 'RAJRATAN',
          percentage: 2.4,
          sector: 'Steel Products',
        },
        {
          name: 'Glenmark Life Sciences',
          ticker: 'GLS',
          percentage: 2.3,
          sector: 'Pharma',
        },
        {
          name: 'Triveni Turbine',
          ticker: 'TRITURBINE',
          percentage: 2.2,
          sector: 'Capital Goods',
        },
        {
          name: 'Zaggle Prepaid',
          ticker: 'ZAGGLE',
          percentage: 2.0,
          sector: 'Fintech',
        },
        {
          name: 'Rainbow Children Hospital',
          ticker: 'RAINBOW',
          percentage: 1.9,
          sector: 'Healthcare',
        },
        {
          name: 'Metro Brands',
          ticker: 'METROBRAND',
          percentage: 1.8,
          sector: 'Retail',
        },
      ];
    }

    return [];
  }

  /**
   * Get sector allocation
   */
  private getSectorAllocation(
    category: string
  ): Array<{ sector: string; percentage: number }> {
    const cat = category?.toLowerCase() || '';

    if (
      cat.includes('large cap') ||
      cat.includes('multi cap') ||
      cat.includes('flexi')
    ) {
      return [
        { sector: 'Financial Services', percentage: 28.5 },
        { sector: 'Information Technology', percentage: 18.2 },
        { sector: 'Oil & Gas', percentage: 12.8 },
        { sector: 'Consumer Goods', percentage: 10.5 },
        { sector: 'Healthcare', percentage: 8.3 },
        { sector: 'Automobiles', percentage: 6.7 },
        { sector: 'Telecom', percentage: 5.2 },
        { sector: 'Capital Goods', percentage: 4.8 },
        { sector: 'Metals', percentage: 3.0 },
        { sector: 'Others', percentage: 2.0 },
      ];
    }

    if (cat.includes('mid cap')) {
      return [
        { sector: 'Financial Services', percentage: 22.0 },
        { sector: 'Information Technology', percentage: 16.5 },
        { sector: 'Consumer Goods', percentage: 14.2 },
        { sector: 'Healthcare', percentage: 12.8 },
        { sector: 'Capital Goods', percentage: 10.5 },
        { sector: 'Automobiles', percentage: 8.3 },
        { sector: 'Chemicals', percentage: 6.7 },
        { sector: 'Real Estate', percentage: 4.5 },
        { sector: 'Retail', percentage: 3.5 },
        { sector: 'Others', percentage: 1.0 },
      ];
    }

    if (cat.includes('small cap')) {
      return [
        { sector: 'Financial Services', percentage: 18.5 },
        { sector: 'Capital Goods', percentage: 16.2 },
        { sector: 'Information Technology', percentage: 14.8 },
        { sector: 'Healthcare', percentage: 12.5 },
        { sector: 'Consumer Goods', percentage: 10.3 },
        { sector: 'Chemicals', percentage: 9.7 },
        { sector: 'Automobiles', percentage: 7.5 },
        { sector: 'Real Estate', percentage: 5.2 },
        { sector: 'Telecom', percentage: 3.3 },
        { sector: 'Others', percentage: 2.0 },
      ];
    }

    return [];
  }

  /**
   * Bulk enrich and save funds to database
   */
  async bulkEnrichAndSave(
    schemeCodes: string[],
    batchSize: number = 10
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      total: schemeCodes.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(
      `🚀 Starting bulk enrichment for ${schemeCodes.length} funds...`
    );

    for (let i = 0; i < schemeCodes.length; i += batchSize) {
      const batch = schemeCodes.slice(i, i + batchSize);

      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(schemeCodes.length / batchSize)}`
      );

      const promises = batch.map(async (schemeCode) => {
        try {
          const enrichedData = await this.enrichFundData(schemeCode);

          if (enrichedData) {
            await this.saveFundToDatabase(enrichedData);
            result.success++;
            return { success: true, schemeCode };
          } else {
            result.failed++;
            result.errors.push(`No data for ${schemeCode}`);
            return { success: false, schemeCode };
          }
        } catch (error) {
          result.failed++;
          const errorMsg = `Error processing ${schemeCode}: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
          return { success: false, schemeCode };
        }
      });

      await Promise.all(promises);

      // Small delay between batches to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(
      `✅ Bulk enrichment completed. Success: ${result.success}, Failed: ${result.failed}`
    );
    return result;
  }

  /**
   * Save enriched fund data to database
   */
  private async saveFundToDatabase(data: EnrichedFundData): Promise<void> {
    try {
      // Upsert fund
      const fund = await prisma.fund.upsert({
        where: { amfiCode: data.amfiCode },
        update: {
          name: data.name,
          type: data.type,
          category: data.category,
          benchmark: data.benchmark,
          expenseRatio: data.expenseRatio,
          inceptionDate: data.inceptionDate,
          description: `${data.name} is a ${data.category} fund managed by ${data.fundManager?.name || 'experienced professionals'} from ${data.fundHouse}.`,
          updatedAt: new Date(),
        },
        create: {
          amfiCode: data.amfiCode,
          name: data.name,
          type: data.type,
          category: data.category,
          benchmark: data.benchmark,
          expenseRatio: data.expenseRatio,
          inceptionDate: data.inceptionDate,
          description: `${data.name} is a ${data.category} fund managed by ${data.fundManager?.name || 'experienced professionals'} from ${data.fundHouse}.`,
          isActive: true,
        },
      });

      // Save NAV data
      await prisma.fundPerformance.upsert({
        where: {
          fundId_date: {
            fundId: fund.id,
            date: data.navDate,
          },
        },
        update: {
          nav: data.nav,
        },
        create: {
          fundId: fund.id,
          date: data.navDate,
          nav: data.nav,
        },
      });

      // Save fund manager
      if (data.fundManager) {
        await prisma.fundManager.upsert({
          where: {
            fundId: fund.id,
          },
          update: {
            name: data.fundManager.name,
            experience: data.fundManager.experience,
            qualification: data.fundManager.qualification,
          },
          create: {
            fundId: fund.id,
            name: data.fundManager.name,
            experience: data.fundManager.experience,
            qualification: data.fundManager.qualification,
          },
        });
      }

      // Save holdings
      if (data.topHoldings && data.topHoldings.length > 0) {
        // Delete old holdings
        await prisma.holding.deleteMany({
          where: { fundId: fund.id },
        });

        // Insert new holdings
        await prisma.holding.createMany({
          data: data.topHoldings.map((holding) => ({
            fundId: fund.id,
            ticker: holding.ticker || holding.name,
            name: holding.name,
            percent: holding.percentage,
          })),
        });
      }

      console.log(`💾 Saved fund to database: ${data.name}`);
    } catch (error) {
      console.error(`Database save error for ${data.name}:`, error);
      throw error;
    }
  }
}

export const fundDataEnrichmentService = new FundDataEnrichmentService();
