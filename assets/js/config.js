/**
 * This file contains global configuration settings for the application.
 * Include this file in the <head> of your HTML pages to make these
 * settings available on all pages.
 */
window.appConfig = {
    /**
     * Debug Settings
     * When true, enables console logging. This value is controlled from the
     * config.html page and stored in localStorage. It defaults to false.
     */
    Debug: localStorage.getItem('debugModeEnabled') === 'true',

    /**
     * API Settings
     * Placeholders for API keys, endpoints, etc.
     */
    ALPACA_API: {
        KEY_ID: localStorage.getItem('alpacaApiKeyId') || '',
        SECRET_KEY: localStorage.getItem('alpacaApiSecretKey') || '',
        PAPER: localStorage.getItem('alpacaApiPaper') === 'true',
    }
};

/**
 * Global Logger
 * A wrapper for the console object that respects the appConfig.Debug setting.
 * Use logger.log(), logger.error(), etc. throughout the application.
 */
window.logger = {
    log: (...args) => window.appConfig?.Debug && console.log(...args),
    error: (...args) => window.appConfig?.Debug && console.error(...args),
    warn: (...args) => window.appConfig?.Debug && console.warn(...args),
    info: (...args) => window.appConfig?.Debug && console.info(...args),
};