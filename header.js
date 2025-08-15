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

    $.getJSON('https://api.ipify.org?format=json', function(data) {
        $('#ip-address').text('Your IP: ' + data.ip);
    }).fail(function() {
        $('#ip-address').text('Your IP: Not available');
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