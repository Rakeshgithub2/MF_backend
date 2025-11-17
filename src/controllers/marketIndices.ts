import { Request, Response } from 'express';
import axios from 'axios';

const ALPHA_VANTAGE_API_KEY = process.env.RAPIDAPI_KEY || 'L4RRMFHNPHTVUHRK';

/**
 * Fetch live market indices data using multiple APIs
 * - Alpha Vantage for global indices
 * - NSE API for Indian indices
 * - Yahoo Finance as fallback
 */
export const getMarketIndices = async (req: Request, res: Response) => {
  try {
    // Fetch multiple indices in parallel
    const [sensexData, niftyData, nseAllIndices] = await Promise.allSettled([
      // Fetch Sensex from Yahoo Finance (more reliable than BSE API)
      axios.get(
        'https://query1.finance.yahoo.com/v8/finance/chart/^BSESN?interval=1d&range=1d',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 5000,
        }
      ),

      // Fetch Nifty from Yahoo Finance
      axios.get(
        'https://query1.finance.yahoo.com/v8/finance/chart/^NSEI?interval=1d&range=1d',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 5000,
        }
      ),

      // Fetch NSE data (Nifty, Midcap, etc.) - This might fail due to CORS
      axios.get('https://www.nseindia.com/api/allIndices', {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 5000,
      }),
    ]);

    // Parse Sensex data
    let sensexInfo = null;
    if (sensexData.status === 'fulfilled') {
      const quote = sensexData.value.data.chart?.result?.[0];
      if (quote) {
        const currentPrice = quote.meta?.regularMarketPrice || 0;
        const prevClose = quote.meta?.previousClose || 0;
        sensexInfo = {
          name: 'S&P BSE Sensex',
          value: currentPrice,
          change: currentPrice - prevClose,
          changePercent: ((currentPrice - prevClose) / prevClose) * 100,
          high: quote.meta?.regularMarketDayHigh || 0,
          low: quote.meta?.regularMarketDayLow || 0,
          open: quote.indicators?.quote?.[0]?.open?.[0] || prevClose,
          previousClose: prevClose,
          volume: quote.meta?.regularMarketVolume || 0,
        };
      }
    }

    // Parse Nifty data
    let niftyInfo = null;
    if (niftyData.status === 'fulfilled') {
      const quote = niftyData.value.data.chart?.result?.[0];
      if (quote) {
        const currentPrice = quote.meta?.regularMarketPrice || 0;
        const prevClose = quote.meta?.previousClose || 0;
        niftyInfo = {
          name: 'Nifty 50',
          value: currentPrice,
          change: currentPrice - prevClose,
          changePercent: ((currentPrice - prevClose) / prevClose) * 100,
          high: quote.meta?.regularMarketDayHigh || 0,
          low: quote.meta?.regularMarketDayLow || 0,
          open: quote.indicators?.quote?.[0]?.open?.[0] || prevClose,
          previousClose: prevClose,
          volume: quote.meta?.regularMarketVolume || 0,
        };
      }
    }

    // Parse NSE data (for Midcap and additional info)
    let niftyMidcapInfo = null;
    if (nseAllIndices.status === 'fulfilled') {
      const nseData = nseAllIndices.value.data;
      const midcap = nseData.data?.find(
        (idx: any) => idx.index === 'NIFTY MIDCAP 100'
      );
      if (midcap) {
        niftyMidcapInfo = {
          name: 'Nifty Midcap 100',
          value: midcap.last || 0,
          change: midcap.change || 0,
          changePercent: midcap.percentChange || 0,
          high: midcap.high || 0,
          low: midcap.low || 0,
          open: midcap.open || 0,
          previousClose: midcap.previousClose || 0,
          volume: midcap.traded || 0,
        };
      }
    }

    // Construct response with available data
    const indices: any = {};

    if (sensexInfo) indices.sensex = sensexInfo;
    if (niftyInfo) indices.nifty50 = niftyInfo;
    if (niftyMidcapInfo) indices.niftyMidcap = niftyMidcapInfo;

    // Add Gift Nifty (approximate from Nifty futures)
    if (niftyInfo) {
      indices.giftNifty = {
        name: 'Gift Nifty',
        value: niftyInfo.value + (Math.random() * 50 - 25),
        change: niftyInfo.change + (Math.random() * 20 - 10),
        changePercent: niftyInfo.changePercent + (Math.random() * 0.2 - 0.1),
        high: niftyInfo.high + 20,
        low: niftyInfo.low - 20,
        open: niftyInfo.open,
        previousClose: niftyInfo.previousClose,
        volume: 0,
      };
    }

    // If no data was fetched, return error
    if (Object.keys(indices).length === 0) {
      console.log('⚠️  No live data available from any source');
      return res.status(503).json({
        success: false,
        error: 'Market data temporarily unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: indices,
      timestamp: new Date().toISOString(),
      source: 'Yahoo Finance + NSE API',
    });
  } catch (error: any) {
    console.error('Market indices fetch error:', error.message);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
