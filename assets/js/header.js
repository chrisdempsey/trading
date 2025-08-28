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
    $.getJSON('https://api.ipify.org?format=json', function(data) {
        const ip = data.ip;
        const originalText = 'Your IP: ' + ip;

        $ipAddressSpan.text(originalText)
            .css('cursor', 'pointer')
            .attr('title', 'Click to copy IP');

        // .off() prevents multiple handlers from being attached if this function is ever called more than once.
        $ipAddressSpan.off('click').on('click', function() {
            navigator.clipboard.writeText(ip).then(() => {
                // On success, provide visual feedback
                $ipAddressSpan.text('Copied!');
                setTimeout(() => {
                    $ipAddressSpan.text(originalText);
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy IP to clipboard: ', err);
            });
        });
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
$(document).on('show.bs.modal', '#global-settings-modal', function () {
    const modalBody = $('#global-settings-modal-body');
    const configUrl = '/trading/tools/config.html';

    // Load the main content from the config page into the modal.
    // The callback function runs after the content is loaded.
    modalBody.load(configUrl + ' main', function(response, status, xhr) {
        if (status === "error") {
            modalBody.html(`<p class="text-danger">Error loading settings: ${xhr.statusText}</p>`);
            return;
        }

        // The content is loaded, now we need to make it functional.
        // This logic is adapted from config.html to work in the modal context.
        function initializeSettings() {
            // --- API Key Display ---
            $('#global-settings-modal #api-key-id').val(AppConfig.ALPACA_API.KEY_ID);
            $('#global-settings-modal #api-secret-key').val(AppConfig.ALPACA_API.SECRET_KEY);

            // --- Cache Settings ---
            const CACHE_ENABLED_KEY = 'apiCacheEnabled';
            const CACHE_DURATION_KEY = 'apiCacheDurationSeconds';
            const CACHE_DATA_KEY = 'apiPriceCache';

            const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
            const duration = localStorage.getItem(CACHE_DURATION_KEY) || 180;
            $('#global-settings-modal #enable-api-cache-switch').prop('checked', isEnabled);
            $('#global-settings-modal #cache-duration').val(duration);

            $('#global-settings-modal').on('change', '#enable-api-cache-switch, #cache-duration', function() {
                localStorage.setItem(CACHE_ENABLED_KEY, $('#global-settings-modal #enable-api-cache-switch').is(':checked'));
                localStorage.setItem(CACHE_DURATION_KEY, $('#global-settings-modal #cache-duration').val());
            });

            $('#global-settings-modal').on('click', '#clear-cache-btn', function() {
                localStorage.removeItem(CACHE_DATA_KEY);
                const btn = $(this);
                btn.text('Cache Cleared!').addClass('btn-success').removeClass('btn-outline-danger');
                setTimeout(() => btn.text('Clear API Cache').removeClass('btn-success').addClass('btn-outline-danger'), 2000);
            });
        }

        // Ensure AppConfig is available before initializing.
        if (typeof AppConfig !== 'undefined') {
            initializeSettings();
        } else {
            // If config.js hasn't been loaded on the current page, load it now.
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
                    <strong>Note:</strong> no data is sent to the server, all information is private and stored in your browser's local storage.
                    This will be lost if you clear your cache - make sure you export a backup using the Data Management tool first.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            $('body').prepend(noticeHtml);
            // Use a delegated event handler for reliability with dynamically added elements
            $('body').on('close.bs.alert', '#global-privacy-notice', () => localStorage.setItem(NOTICE_DISMISSED_KEY, 'true'));
        }
    });
})();