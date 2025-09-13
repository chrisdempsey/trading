/**
 * AlpacaAPI Module
 *
 * A self-contained module for interacting with the Alpaca Data API.
 * It retrieves API keys from the global AppConfig object and provides a
 * simple interface for fetching the latest trade price for stocks and crypto.
 */
const AlpacaAPI = (() => {

    const API_BASE_URL = 'https://data.alpaca.markets';
    const CACHE_KEY = 'apiPriceCache';
    const DEFAULT_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    const getCache = () => {
        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            return cachedData ? JSON.parse(cachedData) : {};
        } catch (e) {
            console.error("Error reading from API cache:", e);
            return {};
        }
    };

    const setCache = (cache) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.error("Error writing to API cache:", e);
        }
    };

    /**
     * Fetches the latest trade price for a given stock or crypto symbol.
     * @param {string} symbol The ticker symbol (e.g., 'AAPL' or 'BTC-USD').
     * @param {boolean} useCache Whether to use the cached value if available and not expired.
     * @returns {Promise<{price: number|null, error: string|null}>} A promise that resolves to an object with the price and an optional error message.
     */
    const getLatestPrice = async (symbol, useCache = true) => {
        if (!symbol) {
            console.error("Symbol is required to fetch the latest price.");
            return null;
        }

        if (typeof window.appConfig === 'undefined' || !window.appConfig.ALPACA_API.KEY_ID || !window.appConfig.ALPACA_API.SECRET_KEY) {
            console.error("Alpaca API keys are not configured in config.js. Cannot fetch price.");
            return { price: null, error: "API keys not configured." };
        }

        const cache = getCache();
        const now = new Date().getTime();
        const cacheDuration = (localStorage.getItem('apiCacheDurationSeconds') || 300) * 1000;

        if (useCache && cache[symbol] && (now - cache[symbol].timestamp < cacheDuration) && cache[symbol].price !== null) {
            logger.log(`Using cached price for ${symbol}:`, cache[symbol].price);
            return { price: cache[symbol].price, error: null };
        }

        const isCrypto = symbol.includes('-USD');
        let url;
        let pricePathFn;

        if (isCrypto) {
            // Crypto uses a different endpoint and symbol format (e.g., BTC/USD)
            const cryptoSymbol = symbol.replace('-', '/');
            url = `${API_BASE_URL}/v1beta3/crypto/us/trades/latest?symbols=${cryptoSymbol}`;
            pricePathFn = (data) => data.trades[cryptoSymbol]?.p;
        } else {
            // Stock endpoint
            url = `${API_BASE_URL}/v2/stocks/${symbol}/trades/latest`;
            pricePathFn = (data) => data.trade?.p;
        }

        const headers = {
            'APCA-API-KEY-ID': window.appConfig.ALPACA_API.KEY_ID,
            'APCA-API-SECRET-KEY': window.appConfig.ALPACA_API.SECRET_KEY
        };

        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.message || 'Unknown error';
                console.warn(`API Error for ${symbol}: ${errorMessage}`);
                return { price: null, error: errorMessage };
            }
            const data = await response.json();
            const price = pricePathFn(data);

            // Cache the result, even if it's null, to prevent repeated failed lookups.
            cache[symbol] = { price: price !== undefined ? price : null, timestamp: now };
            setCache(cache);

            return { price: price !== undefined ? price : null, error: null };
        } catch (error) {
            console.error(`Failed to fetch latest price for ${symbol}:`, error);
            return { price: null, error: "A network error occurred." };
        }
    };

    // Public interface for the module
    return {
        getLatestPrice
    };
})();