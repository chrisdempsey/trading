/**
 * Applies a version query string to asset links for cache busting.
 * This scans existing elements and uses a MutationObserver to catch script/link tags 
 * as they are added to the DOM, ensuring the cache buster is applied.
 */
(function applyCacheBusting() {
    const setupCacheBusting = () => {
        const isEnabled = localStorage.getItem('cacheBusterEnabled') === 'true';
        const version = localStorage.getItem('cacheBusterVersion');
        const versionQuery = version ? `?v=${version}` : '';
        const applyToJs = localStorage.getItem('cacheBusterJsEnabled') === 'true';
        const applyToCss = localStorage.getItem('cacheBusterCssEnabled') === 'true';

        // Function to apply cache buster to an element
        const applyCacheBusterToElement = (element) => {
            if (applyToJs && isEnabled && element.tagName === 'SCRIPT' && element.src && element.src.includes('/trading/')) {
                if (!element.src.includes('?v=')) {
                    element.src += versionQuery;
                } else {
                    // Replace existing version parameter
                    element.src = element.src.replace(/\?v=[^&]*/, versionQuery);
                }
            }

            if (applyToCss && isEnabled && element.tagName === 'LINK' && element.rel === 'stylesheet' && element.href && element.href.includes('/trading/')) {
                if (!element.href.includes('?v=')) {
                    element.href += versionQuery;
                } else {
                    // Replace existing version parameter
                    element.href = element.href.replace(/\?v=[^&]*/, versionQuery);
                }
            }
        };

        // Function to remove cache buster from an element (when disabled)
        const removeCacheBusterFromElement = (element) => {
            if (element.tagName === 'SCRIPT' && element.src && element.src.includes('/trading/') && element.src.includes('?v=')) {
                element.src = element.src.replace(/\?v=[^&]*/, '');
            }
            if (element.tagName === 'LINK' && element.rel === 'stylesheet' && element.href && element.href.includes('/trading/') && element.href.includes('?v=')) {
                element.href = element.href.replace(/\?v=[^&]*/, '');
            }
        };

        // Process all existing elements
        const processExistingElements = () => {
            const elements = document.querySelectorAll('script[src*="/trading/"], link[rel="stylesheet"][href*="/trading/"]');
            elements.forEach(element => {
                if (isEnabled && version) {
                    applyCacheBusterToElement(element);
                } else {
                    removeCacheBusterFromElement(element);
                }
            });
        };

        // Set up observer for dynamically added elements
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    if (isEnabled && version) {
                        applyCacheBusterToElement(node);
                    }
                });
            }
        });

        // Start observing
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // Process existing elements immediately
        processExistingElements();

        return { processExistingElements, observer };
    };

    // Set up cache busting immediately for early elements
    let cacheBusterInstance = setupCacheBusting();
    
    // Re-run when DOM is fully loaded to catch any remaining elements
    document.addEventListener('DOMContentLoaded', () => {
        cacheBusterInstance.processExistingElements();
    });
    
    // Final run after everything is loaded
    window.addEventListener('load', () => {
        cacheBusterInstance.processExistingElements();
    });
})();

// This function should be called after the header HTML has been loaded.
function initializeHeader() {
    // --- Header Info ---
    function getWeekNumber(d) {
        // Create a copy of the date to avoid modifying the original
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        // Get first day of year
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        // Calculate full weeks to nearest Thursday
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        // Return week number
        return weekNo;
    }

    const today = new Date();
    const dateOptions = {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    };
    // Use 'en-GB' locale to get the desired DD Month YYYY format
    $('#current-date').text(today.toLocaleDateString('en-GB', dateOptions));
    $('#week-number').text('Week ' + getWeekNumber(today));

    const $ipAddressSpan = $('#ip-address');
    $.get('https://cloudflare.com/cdn-cgi/trace', function(data) {
        // Parse the trace data to extract IP address
        const lines = data.split('\n');
        let ip = null;
        
        for (const line of lines) {
            if (line.startsWith('ip=')) {
                ip = line.substring(3); // Remove 'ip=' prefix
                break;
            }
        }
        
        if (ip) {
            // Create the new structure
            const labelHtml = '<span title="IP address provided via cloudflare.com/cdn-cgi/trace, your details are not sent to our server.">Your IP: </span>';
            const valueHtml = `<span id="ip-address-value" style="cursor: pointer;" title="Click to copy IP">${ip}</span>`;

            $ipAddressSpan.html(labelHtml + valueHtml);

            const $ipValueSpan = $('#ip-address-value');

            // Attach click event only to the IP address value
            $ipValueSpan.on('click', function() {
                navigator.clipboard.writeText(ip).then(() => {
                    const originalIp = $ipValueSpan.text();
                    $ipValueSpan.text('Copied!');
                    setTimeout(() => {
                        $ipValueSpan.text(originalIp);
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy IP to clipboard: ', err);
                });
            });
        } else {
            $ipAddressSpan.text('Your IP: Not available').css('cursor', 'default');
        }
    }).fail(function() {
        $ipAddressSpan.text('Your IP: Not available').css('cursor', 'default');
    });

    // --- Theme Switcher ---
    function setTheme(theme) {
        $('html').attr('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
        $('#theme-switch-input').prop('checked', theme === 'dark');
        $('#theme-switch-label').text(theme === 'dark' ? 'Dark Mode' : 'Light Mode');
    }
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    $('body').on('change', '#theme-switch-input', () => setTheme($('#theme-switch-input').is(':checked') ? 'dark' : 'light'));
}

/**
 * Logic for the Global Settings Modal
 */
$(document).on('show.bs.modal', '#global-settings-modal', function() {
    const $modal = $(this);
    const modalBody = $modal.find('.modal-body');
    const configUrl = '/trading/tools/config.html';

    // Load the main content from config.html into the modal body.
    // The selector ' main' ensures we only grab the content, not the whole page.
    modalBody.load(configUrl + ' main', function(response, status, xhr) {
        if (status === "error") {
            modalBody.html(`<p class="text-danger">Error loading settings: ${xhr.statusText}</p>`);
            return;
        }

        // This function initializes all settings logic within the modal.
        // It's designed to run *after* the content is loaded.
        function initializeSettings() {
            // Use namespaced events for robust cleanup.
            $modal.off('.settingsModal');

            function setupDebugToggle() {
                const STORAGE_KEY = 'debugModeEnabled';
                const $toggle = $modal.find('#enable-debug-mode-switch');
                $toggle.prop('checked', localStorage.getItem(STORAGE_KEY) === 'true');

                $modal.on('change.settingsModal', '#enable-debug-mode-switch', function() {
                    const isEnabled = $(this).is(':checked');
                    localStorage.setItem(STORAGE_KEY, isEnabled);
                    if (window.appConfig) {
                        window.appConfig.Debug = isEnabled;
                        logger.log(`Debug mode has been ${isEnabled ? 'enabled' : 'disabled'}.`);
                    }
                });
            }

            function setupApiDisplay() {
                const KEY_ID_SELECTOR = '#api-key-id';
                const SECRET_KEY_SELECTOR = '#api-secret-key';
                const PAPER_TRADING_SELECTOR = '#api-paper-trading-switch';
                const SAVE_BTN_SELECTOR = '#save-api-keys-btn';

                function loadState() {
                    $modal.find(KEY_ID_SELECTOR).val(localStorage.getItem('alpacaApiKeyId') || '');
                    $modal.find(SECRET_KEY_SELECTOR).val(localStorage.getItem('alpacaApiSecretKey') || '');
                    $modal.find(PAPER_TRADING_SELECTOR).prop('checked', localStorage.getItem('alpacaApiPaper') === 'true');
                }

                function saveState(event) {
                    const keyId = $modal.find(KEY_ID_SELECTOR).val();
                    const secretKey = $modal.find(SECRET_KEY_SELECTOR).val();
                    localStorage.setItem('alpacaApiKeyId', keyId);
                    localStorage.setItem('alpacaApiSecretKey', secretKey);
                    localStorage.setItem('alpacaApiPaper', $modal.find(PAPER_TRADING_SELECTOR).is(':checked'));

                    // Also update the live config object so the change is immediate
                    if (window.appConfig && window.appConfig.ALPACA_API) {
                        window.appConfig.ALPACA_API.KEY_ID = keyId;
                        window.appConfig.ALPACA_API.SECRET_KEY = secretKey;
                    }

                    $(event.currentTarget).text('Saved!').addClass('btn-success').removeClass('btn-primary');
                    setTimeout(() => $(event.currentTarget).text('Save API Keys').removeClass('btn-success').addClass('btn-primary'), 2000);
                }
                $modal.on('click.settingsModal', SAVE_BTN_SELECTOR, saveState);
                loadState();
            }

            function setupCacheControls() {
                const ENABLED_KEY = 'apiCacheEnabled';
                const DURATION_KEY = 'apiCacheDurationSeconds';
                const DATA_KEY = 'apiPriceCache';
                const $toggle = $modal.find('#enable-api-cache-switch');
                const $duration = $modal.find('#cache-duration');

                $toggle.prop('checked', localStorage.getItem(ENABLED_KEY) === 'true');
                $duration.val(localStorage.getItem(DURATION_KEY) || 180);

                $modal.on('change.settingsModal', '#enable-api-cache-switch, #cache-duration', function() {
                    localStorage.setItem(ENABLED_KEY, $toggle.is(':checked'));
                    localStorage.setItem(DURATION_KEY, $duration.val());
                }).on('click.settingsModal', '#clear-cache-btn', function() {
                    localStorage.removeItem(DATA_KEY);
                    const btn = $(this);
                    btn.text('Cache Cleared!').addClass('btn-success').removeClass('btn-outline-danger');
                    setTimeout(() => btn.text('Clear API Cache').removeClass('btn-success').addClass('btn-outline-danger'), 2000);
                });
            }

            function setupCacheBusterControls() {
                const ENABLED_KEY = 'cacheBusterEnabled';
                const VERSION_KEY = 'cacheBusterVersion';
                const JS_KEY = 'cacheBusterJsEnabled';
                const CSS_KEY = 'cacheBusterCssEnabled';
                const $toggle = $modal.find('#enable-cache-buster-switch');
                const $version = $modal.find('#cache-buster-version-input');
                const $jsToggle = $modal.find('#cache-buster-js-switch');
                const $cssToggle = $modal.find('#cache-buster-css-switch');
                const $optionsContainer = $modal.find('#cache-buster-options');

                // Load state from localStorage
                const isEnabled = localStorage.getItem(ENABLED_KEY) === 'true';
                $toggle.prop('checked', isEnabled);
                $version.val(localStorage.getItem(VERSION_KEY) || '1.0.0');
                $jsToggle.prop('checked', localStorage.getItem(JS_KEY) === 'true');
                $cssToggle.prop('checked', localStorage.getItem(CSS_KEY) === 'true');
                $optionsContainer.toggle(isEnabled);

                // Save state on change
                $modal.on('change.settingsModal', '#enable-cache-buster-switch, #cache-buster-version-input, #cache-buster-js-switch, #cache-buster-css-switch', function() {
                    const isChecked = $toggle.is(':checked');
                    localStorage.setItem(ENABLED_KEY, isChecked);
                    localStorage.setItem(VERSION_KEY, $version.val());
                    localStorage.setItem(JS_KEY, $jsToggle.is(':checked'));
                    localStorage.setItem(CSS_KEY, $cssToggle.is(':checked'));
                    $optionsContainer.toggle(isChecked);
                });
            }

            // Initialize all settings components
            setupDebugToggle();
            setupApiDisplay();
            setupCacheControls();
            setupCacheBusterControls();
        }

        // Ensure the global appConfig object is available before initializing settings.
        // This is crucial because config.js might not be loaded on every page.
        if (typeof window.appConfig !== 'undefined') {
            initializeSettings();
        } else {
            // If config.js hasn't been loaded on the current page, load it dynamically
            // and then initialize the settings logic in the callback.
            $.getScript('/trading/assets/js/config.js', initializeSettings);
        }
    });
});

/**
 * Initializes Bootstrap tooltips on any new elements added to the page.
 * This is a global utility that runs on all pages that include header.js.
 */
(function() {
    /**
     * Finds and initializes any uninitialized Bootstrap tooltips within a given element.
     * @param {HTMLElement} parentElement The element to search within.
     */
    function initializeTooltipsInElement(parentElement) {
        const tooltipTriggerList = parentElement.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            // Check if a tooltip instance already exists to avoid re-initialization
            if (!bootstrap.Tooltip.getInstance(tooltipTriggerEl)) {
                new bootstrap.Tooltip(tooltipTriggerEl);
            }
        });
    }

    // Use a MutationObserver to watch for when new content is added to initialize tooltips.
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    initializeTooltipsInElement(node);
                }
            });
        }
    });

    // Start observing the document body for changes to the direct children and the entire subtree.
    observer.observe(document.body, { childList: true, subtree: true });

    // --- Global Privacy Notice (runs after the document is fully loaded) ---
    $(document).ready(function() {
        const NOTICE_DISMISSED_KEY = 'globalPrivacyNoticeDismissed';
        if (localStorage.getItem(NOTICE_DISMISSED_KEY) !== 'true') {
            const noticeHtml = `
                <div class="alert alert-info alert-dismissible fade show rounded-0 mb-0 text-center" role="alert" id="global-privacy-notice">
                    <strong>Note:</strong> no data is sent to the server, all information is private and held in your browser's local storage.
                    CRITICAL - your data will be lost if you clear your browser's cache without first creating a backup using the Data Management tool.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            $('body').prepend(noticeHtml);
            // Use a delegated event handler for reliability with dynamically added elements
            $('body').on('close.bs.alert', '#global-privacy-notice', () => localStorage.setItem(NOTICE_DISMISSED_KEY, 'true'));
        }
    });
})();

/**
 * Global Modal 'Enter' Key Handler
 * Listens for the 'Enter' key press when a modal is open and triggers the
 * primary action button.
 */
(function() {
    $(document).on('keydown', '.modal', function(e) {
        // Check if the pressed key is 'Enter' and the event target is not a textarea
        if (e.key === 'Enter' && !$(e.target).is('textarea')) {
            e.preventDefault(); // Prevent default form submission

            // Find the currently visible modal
            const $visibleModal = $('.modal.show');
            if ($visibleModal.length > 0) {
                // Find the primary button (or the specific confirm button) and click it
                const $primaryBtn = $visibleModal.find('.modal-footer .btn-primary, .modal-footer #confirm-action-btn').first();
                if ($primaryBtn.length > 0) {
                    $primaryBtn.trigger('click');
                }
            }
        }
    });
})();