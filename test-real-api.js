/**
 * Test script for Yahoo Finance API via RapidAPI
 * Tests the real-world API integration with the new API key
 */

const axios = require('axios');
require('dotenv').config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'L4RRMFHNPHTVUHRK';
const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || 'apidojo-yahoo-finance-v1.p.rapidapi.com';

async function testYahooFinanceAPI() {
  console.log('🔍 Testing Yahoo Finance API Integration...\n');
  console.log(`API Key: ${RAPIDAPI_KEY.substring(0, 8)}...`);
  console.log(`API Host: ${RAPIDAPI_HOST}\n`);

  // Test 1: Fetch Nifty 50 data
  console.log('📊 Test 1: Fetching Nifty 50 (^NSEI) data...');
  try {
    const symbol = '^NSEI';
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7); // Last 7 days
    const toDate = new Date();

    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);

    const url = `https://${RAPIDAPI_HOST}/v8/finance/chart/${symbol}?period1=${fromTimestamp}&period2=${toTimestamp}&interval=1d`;

    const response = await axios.get(url, {
      headers: {
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'X-RapidAPI-Key': RAPIDAPI_KEY,
      },
    });

    const data = response.data;

    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const meta = result.meta;

      console.log('✅ Success!');
      console.log(`   Symbol: ${meta.symbol}`);
      console.log(`   Exchange: ${meta.exchangeName}`);
      console.log(`   Currency: ${meta.currency}`);
      console.log(`   Current Price: ${meta.regularMarketPrice}`);
      console.log(`   Previous Close: ${meta.previousClose}`);
      console.log(`   Data Points: ${result.timestamp.length}`);
      console.log(
        `   Date Range: ${new Date(result.timestamp[0] * 1000).toLocaleDateString()} to ${new Date(result.timestamp[result.timestamp.length - 1] * 1000).toLocaleDateString()}`
      );
    } else {
      console.log('❌ No data returned');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    if (error.response?.status) {
      console.log(`   Status Code: ${error.response.status}`);
    }
  }

  console.log('\n');

  // Test 2: Fetch Sensex data
  console.log('📊 Test 2: Fetching Sensex (^BSESN) data...');
  try {
    const symbol = '^BSESN';
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const toDate = new Date();

    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);

    const url = `https://${RAPIDAPI_HOST}/v8/finance/chart/${symbol}?period1=${fromTimestamp}&period2=${toTimestamp}&interval=1d`;

    const response = await axios.get(url, {
      headers: {
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'X-RapidAPI-Key': RAPIDAPI_KEY,
      },
    });

    const data = response.data;

    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const meta = result.meta;

      console.log('✅ Success!');
      console.log(`   Symbol: ${meta.symbol}`);
      console.log(`   Current Price: ${meta.regularMarketPrice}`);
      console.log(`   Previous Close: ${meta.previousClose}`);
      console.log(`   Day High: ${meta.regularMarketDayHigh}`);
      console.log(`   Day Low: ${meta.regularMarketDayLow}`);
      console.log(`   Data Points: ${result.timestamp.length}`);
    } else {
      console.log('❌ No data returned');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    if (error.response?.status) {
      console.log(`   Status Code: ${error.response.status}`);
    }
  }

  console.log('\n');

  // Test 3: Fetch Quote data
  console.log('📊 Test 3: Fetching Quote for RELIANCE.NS...');
  try {
    const symbol = 'RELIANCE.NS';
    const url = `https://${RAPIDAPI_HOST}/v11/finance/quoteSummary/${symbol}?modules=price,summaryDetail`;

    const response = await axios.get(url, {
      headers: {
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'X-RapidAPI-Key': RAPIDAPI_KEY,
      },
    });

    const data = response.data;

    if (data.quoteSummary?.result?.[0]) {
      const result = data.quoteSummary.result[0];
      const price = result.price;

      console.log('✅ Success!');
      console.log(`   Symbol: ${price.symbol}`);
      console.log(`   Name: ${price.shortName}`);
      console.log(`   Current Price: ${price.regularMarketPrice?.fmt}`);
      console.log(`   Market Cap: ${price.marketCap?.fmt}`);
      console.log(`   Currency: ${price.currency}`);
    } else {
      console.log('❌ No data returned');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    if (error.response?.status) {
      console.log(`   Status Code: ${error.response.status}`);
    }
  }

  console.log('\n✨ API Integration Test Complete!\n');
}

// Run the test
testYahooFinanceAPI().catch(console.error);
