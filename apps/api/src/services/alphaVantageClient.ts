interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

interface AlphaVantageTimeSeriesData {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

interface AlphaVantageTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: AlphaVantageTimeSeriesData;
  };
}

interface AlphaVantageIntradayData {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

interface AlphaVantageIntradayResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Output Size': string;
    '6. Time Zone': string;
  };
  'Time Series (1min)': {
    [datetime: string]: AlphaVantageIntradayData;
  };
}

interface AlphaVantageSearchMatch {
  '1. symbol': string;
  '2. name': string;
  '3. type': string;
  '4. region': string;
  '5. marketOpen': string;
  '6. marketClose': string;
  '7. timezone': string;
  '8. currency': string;
  '9. matchScore': string;
}

interface AlphaVantageSearchResponse {
  bestMatches: AlphaVantageSearchMatch[];
}

interface AlphaVantageMarketMoversResponse {
  metadata: string;
  last_updated: string;
  top_gainers: Array<{
    ticker: string;
    price: string;
    change_amount: string;
    change_percentage: string;
    volume: string;
  }>;
  top_losers: Array<{
    ticker: string;
    price: string;
    change_amount: string;
    change_percentage: string;
    volume: string;
  }>;
  most_actively_traded: Array<{
    ticker: string;
    price: string;
    change_amount: string;
    change_percentage: string;
    volume: string;
  }>;
}

interface AlphaVantageNewsItem {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  banner_image: string;
  source: string;
  category_within_source: string;
  source_domain: string;
  topics: Array<{
    topic: string;
    relevance_score: string;
  }>;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }>;
}

interface AlphaVantageNewsResponse {
  items: string;
  sentiment_score_definition: string;
  relevance_score_definition: string;
  feed: AlphaVantageNewsItem[];
}

interface AlphaVantageMarketStatusResponse {
  endpoint: string;
  markets: Array<{
    market_type: string;
    region: string;
    primary_exchanges: string;
    local_open: string;
    local_close: string;
    current_status: string;
    notes: string;
  }>;
}

export class AlphaVantageClient {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Alpha Vantage free tier: 25 requests per day, 5 requests per minute
    // Standard tier: 75 requests per minute, 1000 requests per day
    const minInterval = this.apiKey === 'demo' ? 12000 : 800; // 12s for free, 0.8s for standard

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json();

      // Handle API limit exceeded
      if (data['Information'] && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const quote = data['Global Quote'] as AlphaVantageQuote;

      if (!quote || !quote['05. price']) {
        throw new Error(`No price data found for symbol: ${symbol}`);
      }

      return parseFloat(quote['05. price']);
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  async getHistoricalPrices(
    symbol: string,
    days: number
  ): Promise<Array<{ date: Date; price: number; volume: number }>> {
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json() as AlphaVantageTimeSeriesResponse;

      // Handle API limit exceeded
      if ('Information' in data && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const timeSeries = data['Time Series (Daily)'];

      if (!timeSeries) {
        throw new Error(`No historical data found for symbol: ${symbol}`);
      }

      const prices = Object.entries(timeSeries)
        .slice(0, days)
        .map(([dateStr, priceData]) => ({
          date: new Date(dateStr),
          price: parseFloat(priceData['4. close']),
          volume: parseFloat(priceData['5. volume'])
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return prices;
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  async getMarketStats(symbol: string): Promise<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
  }> {
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json();

      // Handle API limit exceeded
      if (data['Information'] && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const quote = data['Global Quote'] as AlphaVantageQuote;

      if (!quote) {
        throw new Error(`No market data found for symbol: ${symbol}`);
      }

      return {
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        close: parseFloat(quote['05. price']),
        volume: parseFloat(quote['06. volume']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', ''))
      };
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching market stats for ${symbol}:`, error);
      throw error;
    }
  }

  async getIntradayPrices(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '60min' = '1min',
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<Array<{ datetime: Date; open: number; high: number; low: number; close: number; volume: number }>> {
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&outputsize=${outputSize}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json() as AlphaVantageIntradayResponse;

      // Handle API limit exceeded
      if ('Information' in data && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const timeSeries = data['Time Series (1min)'];

      if (!timeSeries) {
        throw new Error(`No intraday data found for symbol: ${symbol}`);
      }

      const prices = Object.entries(timeSeries)
        .map(([datetimeStr, priceData]) => ({
          datetime: new Date(datetimeStr),
          open: parseFloat(priceData['1. open']),
          high: parseFloat(priceData['2. high']),
          low: parseFloat(priceData['3. low']),
          close: parseFloat(priceData['4. close']),
          volume: parseFloat(priceData['5. volume'])
        }))
        .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

      return prices;
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching intraday data for ${symbol}:`, error);
      throw error;
    }
  }

  async searchSymbol(keywords: string): Promise<Array<{
    symbol: string;
    name: string;
    type: string;
    region: string;
    marketOpen: string;
    marketClose: string;
    timezone: string;
    currency: string;
    matchScore: number;
  }>> {
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json() as AlphaVantageSearchResponse;

      // Handle API limit exceeded
      if ('Information' in data && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      if (!data.bestMatches) {
        return [];
      }

      return data.bestMatches.map(match => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
        marketOpen: match['5. marketOpen'],
        marketClose: match['6. marketClose'],
        timezone: match['7. timezone'],
        currency: match['8. currency'],
        matchScore: parseFloat(match['9. matchScore'])
      })).sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error(`[AlphaVantage] Error searching symbols for '${keywords}':`, error);
      throw error;
    }
  }

  async getMarketMovers(): Promise<{
    topGainers: Array<{
      ticker: string;
      price: number;
      changeAmount: number;
      changePercentage: number;
      volume: number;
    }>;
    topLosers: Array<{
      ticker: string;
      price: number;
      changeAmount: number;
      changePercentage: number;
      volume: number;
    }>;
    mostActive: Array<{
      ticker: string;
      price: number;
      changeAmount: number;
      changePercentage: number;
      volume: number;
    }>;
  }> {
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=TOP_GAINERS_LOSERS&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json() as AlphaVantageMarketMoversResponse;

      // Handle API limit exceeded
      if ('Information' in data && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const parseMovers = (movers: any[]) => movers.map(mover => ({
        ticker: mover.ticker,
        price: parseFloat(mover.price),
        changeAmount: parseFloat(mover.change_amount),
        changePercentage: parseFloat(mover.change_percentage.replace('%', '')),
        volume: parseInt(mover.volume)
      }));

      return {
        topGainers: parseMovers(data.top_gainers || []),
        topLosers: parseMovers(data.top_losers || []),
        mostActive: parseMovers(data.most_actively_traded || [])
      };
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching market movers:`, error);
      throw error;
    }
  }

  async getNewsSentiment(
    tickers?: string[],
    topics?: string[],
    timeFrom?: string,
    timeTo?: string,
    sort: 'LATEST' | 'EARLIEST' | 'RELEVANCE' = 'LATEST',
    limit: number = 50
  ): Promise<{
    items: number;
    sentimentScoreDefinition: string;
    relevanceScoreDefinition: string;
    feed: Array<{
      title: string;
      url: string;
      timePublished: Date;
      authors: string[];
      summary: string;
      bannerImage: string;
      source: string;
      categoryWithinSource: string;
      sourceDomain: string;
      topics: Array<{
        topic: string;
        relevanceScore: number;
      }>;
      overallSentimentScore: number;
      overallSentimentLabel: string;
      tickerSentiment: Array<{
        ticker: string;
        relevanceScore: number;
        tickerSentimentScore: number;
        tickerSentimentLabel: string;
      }>;
    }>;
  }> {
    await this.rateLimit();

    try {
      let url = `${this.baseUrl}?function=NEWS_SENTIMENT&sort=${sort}&limit=${limit}&apikey=${this.apiKey}`;

      if (tickers && tickers.length > 0) {
        url += `&tickers=${tickers.join(',')}`;
      }

      if (topics && topics.length > 0) {
        url += `&topics=${topics.join(',')}`;
      }

      if (timeFrom) {
        url += `&time_from=${timeFrom}`;
      }

      if (timeTo) {
        url += `&time_to=${timeTo}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json() as AlphaVantageNewsResponse;

      // Handle API limit exceeded
      if ('Information' in data && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      return {
        items: parseInt(data.items),
        sentimentScoreDefinition: data.sentiment_score_definition,
        relevanceScoreDefinition: data.relevance_score_definition,
        feed: data.feed.map(item => ({
          title: item.title,
          url: item.url,
          timePublished: new Date(item.time_published),
          authors: item.authors,
          summary: item.summary,
          bannerImage: item.banner_image,
          source: item.source,
          categoryWithinSource: item.category_within_source,
          sourceDomain: item.source_domain,
          topics: item.topics.map(topic => ({
            topic: topic.topic,
            relevanceScore: parseFloat(topic.relevance_score)
          })),
          overallSentimentScore: item.overall_sentiment_score,
          overallSentimentLabel: item.overall_sentiment_label,
          tickerSentiment: item.ticker_sentiment.map(sentiment => ({
            ticker: sentiment.ticker,
            relevanceScore: parseFloat(sentiment.relevance_score),
            tickerSentimentScore: parseFloat(sentiment.ticker_sentiment_score),
            tickerSentimentLabel: sentiment.ticker_sentiment_label
          }))
        }))
      };
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching news sentiment:`, error);
      throw error;
    }
  }

  async getMarketStatus(): Promise<Array<{
    marketType: string;
    region: string;
    primaryExchanges: string;
    localOpen: string;
    localClose: string;
    currentStatus: string;
    notes: string;
  }>> {
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=MARKET_STATUS&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json() as AlphaVantageMarketStatusResponse;

      // Handle API limit exceeded
      if ('Information' in data && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      if (!data.markets) {
        return [];
      }

      return data.markets.map(market => ({
        marketType: market.market_type,
        region: market.region,
        primaryExchanges: market.primary_exchanges,
        localOpen: market.local_open,
        localClose: market.local_close,
        currentStatus: market.current_status,
        notes: market.notes
      }));
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching market status:`, error);
      throw error;
    }
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  isDemoMode(): boolean {
    return this.apiKey === 'demo';
  }

  // Smart data fetching - chooses between intraday and daily based on market hours
  async getSmartPriceData(
    symbol: string,
    useIntraday: boolean = true
  ): Promise<{
    currentPrice: number;
    priceHistory: Array<{ datetime: Date; price: number; volume: number }>;
    isRealTime: boolean;
  }> {
    try {
      // Check if markets are open to determine if we should use intraday data
      const marketStatus = await this.getMarketStatus();
      const usMarket = marketStatus.find(m => m.region === 'United States');
      const isMarketOpen = usMarket?.currentStatus === 'open';

      const shouldUseIntraday = useIntraday && isMarketOpen;

      if (shouldUseIntraday) {
        try {
          const intradayData = await this.getIntradayPrices(symbol, '1min', 'compact');
          if (intradayData.length > 0) {
            const latest = intradayData[intradayData.length - 1];
            return {
              currentPrice: latest.close,
              priceHistory: intradayData.map(d => ({
                datetime: d.datetime,
                price: d.close,
                volume: d.volume
              })),
              isRealTime: true
            };
          }
        } catch (error) {
          console.warn(`[AlphaVantage] Intraday data failed for ${symbol}, falling back to daily:`, error);
        }
      }

      // Fallback to daily data
      const dailyData = await this.getHistoricalPrices(symbol, 30);
      const currentPrice = await this.getCurrentPrice(symbol);

      return {
        currentPrice,
        priceHistory: dailyData.map(d => ({
          datetime: d.date,
          price: d.price,
          volume: d.volume
        })),
        isRealTime: false
      };
    } catch (error) {
      console.error(`[AlphaVantage] Error in smart price data fetch for ${symbol}:`, error);
      throw error;
    }
  }

  // Rate limiting status
  getRateLimitInfo(): {
    requestCount: number;
    lastRequestTime: number;
    timeUntilNextRequest: number;
    isDemoMode: boolean;
  } {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 12000; // 12 seconds
    const timeUntilNextRequest = Math.max(0, minInterval - timeSinceLastRequest);

    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      timeUntilNextRequest,
      isDemoMode: this.isDemoMode()
    };
  }
}