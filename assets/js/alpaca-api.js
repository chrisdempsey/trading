/**
 * AlpacaAPI Module
 *
 * A self-contained module for interacting with the Alpaca Data API.
 * It retrieves API keys from the global AppConfig object and provides a
 * simple interface for fetching the latest trade price for stocks and crypto.
 */
const AlpacaAPI = (() => {

    const API_BASE_URL = 'https://data.alpaca.markets';

    /**
     * Fetches the latest trade price for a given stock or crypto symbol.
     * @param {string} symbol The ticker symbol (e.g., 'AAPL' or 'BTC-USD').
     * @returns {Promise<number|null>} A promise that resolves to the latest price, or null if an error occurs.
     */
    const getLatestPrice = async (symbol) => {
        if (!symbol) {
            console.error("Symbol is required to fetch the latest price.");
            return null;
        }

        if (typeof AppConfig === 'undefined' || !AppConfig.ALPACA_API.KEY_ID || !AppConfig.ALPACA_API.SECRET_KEY) {
            console.error("Alpaca API keys are not configured in config.js. Cannot fetch price.");
            return null;
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
            'APCA-API-KEY-ID': AppConfig.ALPACA_API.KEY_ID,
            'APCA-API-SECRET-KEY': AppConfig.ALPACA_API.SECRET_KEY
        };

        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error for ${symbol}: ${errorData.message || 'Unknown error'}`);
            }
            const data = await response.json();
            const price = pricePathFn(data);
            return price !== undefined ? price : null;
        } catch (error) {
            console.error(`Failed to fetch latest price for ${symbol}:`, error);
            return null;
        }
    };

    // Public interface for the module
    return {
        getLatestPrice
    };
})();