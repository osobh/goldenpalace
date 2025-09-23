import express from 'express';
import { MarketDataService } from '../services/marketData.service';

const router = express.Router();
const marketDataService = new MarketDataService();

// Symbol search endpoint
router.get('/search', async (req, res) => {
  try {
    const { q: keywords } = req.query;

    if (!keywords || typeof keywords !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid search keywords',
        message: 'Please provide search keywords as query parameter "q"'
      });
    }

    const results = await marketDataService.searchSymbol(keywords);

    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('[MarketData API] Symbol search error:', error);
    res.status(500).json({
      error: 'Symbol search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Market movers endpoint
router.get('/movers', async (req, res) => {
  try {
    const movers = await marketDataService.getMarketMovers();

    res.json({
      success: true,
      data: movers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MarketData API] Market movers error:', error);
    res.status(500).json({
      error: 'Failed to fetch market movers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// News sentiment endpoint
router.get('/news', async (req, res) => {
  try {
    const {
      tickers,
      topics,
      limit = '20'
    } = req.query;

    const tickerList = tickers ? (tickers as string).split(',').map(t => t.trim()) : undefined;
    const topicList = topics ? (topics as string).split(',').map(t => t.trim()) : undefined;
    const newsLimit = Math.min(Math.max(parseInt(limit as string) || 20, 1), 100);

    const news = await marketDataService.getNewsSentiment(tickerList, topicList, newsLimit);

    res.json({
      success: true,
      data: news,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MarketData API] News sentiment error:', error);
    res.status(500).json({
      error: 'Failed to fetch news sentiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Market status endpoint
router.get('/status', async (req, res) => {
  try {
    const status = await marketDataService.getMarketStatus();

    res.json({
      success: true,
      markets: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MarketData API] Market status error:', error);
    res.status(500).json({
      error: 'Failed to fetch market status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Intraday data endpoint
router.get('/intraday/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1min' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        error: 'Missing symbol parameter',
        message: 'Symbol is required in the URL path'
      });
    }

    const validIntervals = ['1min', '5min', '15min', '30min', '60min'];
    if (!validIntervals.includes(interval as string)) {
      return res.status(400).json({
        error: 'Invalid interval parameter',
        message: `Interval must be one of: ${validIntervals.join(', ')}`
      });
    }

    const data = await marketDataService.getIntradayPrices(
      symbol.toUpperCase(),
      interval as '1min' | '5min' | '15min' | '30min' | '60min'
    );

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      interval,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MarketData API] Intraday data error:', error);
    res.status(500).json({
      error: 'Failed to fetch intraday data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Historical data endpoint
router.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = '30' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        error: 'Missing symbol parameter',
        message: 'Symbol is required in the URL path'
      });
    }

    const dayCount = Math.min(Math.max(parseInt(days as string) || 30, 1), 365);
    const data = await marketDataService.getHistoricalPrices(symbol.toUpperCase(), dayCount);

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      days: dayCount,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MarketData API] Historical data error:', error);
    res.status(500).json({
      error: 'Failed to fetch historical data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Quote endpoint (current price + stats)
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Missing symbol parameter',
        message: 'Symbol is required in the URL path'
      });
    }

    const [currentPrice, marketStats] = await Promise.all([
      marketDataService.getCurrentPrice(symbol.toUpperCase()),
      marketDataService.getMarketStats(symbol.toUpperCase())
    ]);

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      data: {
        price: currentPrice,
        ...marketStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MarketData API] Quote error:', error);
    res.status(500).json({
      error: 'Failed to fetch quote data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Batch quotes endpoint
router.post('/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid symbols array',
        message: 'Please provide an array of symbols in the request body'
      });
    }

    if (symbols.length > 20) {
      return res.status(400).json({
        error: 'Too many symbols requested',
        message: 'Maximum 20 symbols allowed per request'
      });
    }

    const quotes = await Promise.allSettled(
      symbols.map(async (symbol: string) => {
        const [price, stats] = await Promise.all([
          marketDataService.getCurrentPrice(symbol.toUpperCase()),
          marketDataService.getMarketStats(symbol.toUpperCase())
        ]);
        return {
          symbol: symbol.toUpperCase(),
          price,
          ...stats
        };
      })
    );

    const results = quotes.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { success: true, data: result.value };
      } else {
        return {
          success: false,
          symbol: symbols[index].toUpperCase(),
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    res.json({
      success: true,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MarketData API] Batch quotes error:', error);
    res.status(500).json({
      error: 'Failed to fetch batch quotes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API status and rate limiting info
router.get('/api-status', async (req, res) => {
  try {
    const status = marketDataService.getApiStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MarketData API] API status error:', error);
    res.status(500).json({
      error: 'Failed to fetch API status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as marketDataRoutes };