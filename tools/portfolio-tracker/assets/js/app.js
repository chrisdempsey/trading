$(document).ready(function() {
    // --- Constants and State ---
    const FRANKFURTER_API_URL = 'https://api.frankfurter.app';
    const LOCAL_STORAGE_KEY = 'portfolioTrackerData';

    let state = {
        config: {
            accounts: [],
            assets: [],
            settings: {
                allowFractional: false,
                currency: 'USD',
                apiCache: true,
                cashCurrency: 'USD' // New setting for cash table
            }
        },
        portfolio: [],
        cash: {}, // To store cash balances { 'IBKR': 1000 }
        prices: {}, // To store fetched prices { 'TICKER': 123.45 }
        currencyRates: {} // To store currency conversion rates
    };

    // --- UI Element Selectors ---
    const $accountsList = $('#accounts-list');
    const $assetsList = $('#assets-list');
    const $portfolioHead = $('#portfolio-head');
    const $portfolioBody = $('#portfolio-body');
    const $portfolioFoot = $('#portfolio-foot');
    const $cashHead = $('#cash-head');
    const $cashBody = $('#cash-body');
    const $cashFoot = $('#cash-foot');

    // --- UI State Persistence ---
    function initializeCollapseStates() {
        const $configCollapse = $('#configuration-collapse');
        const $cashCollapse = $('#cash-collapse');

        // Restore state for Configuration section
        const configCollapseState = localStorage.getItem('configCollapseState');
        if (configCollapseState === 'false') { // It's open by default, so only act if it should be closed
            $configCollapse.removeClass('show');
        }
        $configCollapse.on('shown.bs.collapse hidden.bs.collapse', () => {
            localStorage.setItem('configCollapseState', $configCollapse.hasClass('show'));
        });

        // Restore state for Cash section
        const cashCollapseState = localStorage.getItem('cashCollapseState');
        if (cashCollapseState === 'true') {
            $cashCollapse.collapse('show');
        }
        $cashCollapse.on('shown.bs.collapse hidden.bs.collapse', () => {
            localStorage.setItem('cashCollapseState', $cashCollapse.hasClass('show'));
        });
    }

    // --- Initialization ---
    function initializeApp() {
        loadState();
        loadSharedComponents();
        renderAll();
        registerEventListeners();
        initializeCollapseStates();
        fetchData();
    }

    function loadSharedComponents() {
        $("#header-placeholder").load("/trading/assets/includes/_header.html", () => initializeHeader && initializeHeader());
        $("#navbar-placeholder").load("/trading/assets/includes/_navbar.html");
        $("#footer-placeholder").load("/trading/assets/includes/_footer.html");
    }

    // --- State Management ---
    function loadState() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            state = JSON.parse(savedData);
            // Ensure cash object exists for backward compatibility
            if (!state.cash) {
                state.cash = {};
            }
            // Ensure cashCurrency setting exists for backward compatibility
            if (!state.config.settings.cashCurrency) {
                state.config.settings.cashCurrency = 'USD';
            }
        }
    }

    function saveState() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    }

    // --- Rendering ---
    function renderAll() {
        renderConfigLists();
        renderPortfolio();
        renderCashTable();
        renderSettings();
    }

    function renderConfigLists() {
        $accountsList.empty();
        state.config.accounts.forEach(acc => {
            $accountsList.append(`<li class="list-group-item d-flex justify-content-between align-items-center">${acc}<button class="btn-close remove-account-btn" data-account="${acc}"></button></li>`);
        });

        $assetsList.empty();
        state.config.assets.forEach(asset => {
            $assetsList.append(`<li class="list-group-item d-flex justify-content-between align-items-center"><span class="editable-asset" data-original-asset="${asset}">${asset}</span><button class="btn-close remove-asset-btn" data-asset="${asset}"></button></li>`);
        });

        // Hide the "Add Asset" to portfolio button if no assets are configured.
        $('#add-portfolio-row-btn').toggle(state.config.assets.length > 0);
    }

    function renderPortfolio() {
        renderPortfolioHeader();
        renderPortfolioBody();
        renderPortfolioFooter();
    }

    function renderPortfolioHeader() {
        let headers = '<tr><th>Asset</th>';
        state.config.accounts.forEach(acc => headers += `<th>${acc}</th>`);
        headers += '<th>Total Qty</th><th>Price</th><th>Value</th><th>Actions</th></tr>';
        $portfolioHead.html(headers);
    }

    function renderPortfolioBody() {
        $portfolioBody.empty();
        state.portfolio.forEach((item, index) => {
            let row = `<tr data-index="${index}">`;
            // Asset cell
            row += `<td class="editable asset-cell" data-field="asset">${item.asset || 'Select...'}</td>`;
            // Account quantity cells
            state.config.accounts.forEach(acc => {
                const qty = item.accounts[acc] || 0;
                row += `<td class="editable qty-cell" data-field="qty" data-account="${acc}">${qty}</td>`;
            });
            // Calculated cells
            row += `<td class="total-qty-cell">${item.totalQty.toLocaleString(undefined, {maximumFractionDigits: state.config.settings.allowFractional ? 8 : 0})}</td>`;
            row += `<td class="price-cell">${formatCurrency(item.price, state.config.settings.currency)}</td>`;
            row += `<td class="value-cell fw-bold">${formatCurrency(item.value, state.config.settings.currency)}</td>`;
            // Actions cell
            row += `<td><button class="btn btn-sm btn-outline-danger remove-row-btn"><span class="material-symbols-outlined icon-inline-sm">delete</span></button></td>`;
            row += '</tr>';
            $portfolioBody.append(row);
        });
    }
    
    function renderPortfolioFooter() {
        const portfolioValue = state.portfolio.reduce((sum, item) => sum + item.value, 0);
        const cashValue = Object.values(state.cash).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        const totalValue = portfolioValue + cashValue;

        let footer = '<tr>';
        footer += `<th colspan="${state.config.accounts.length + 2}">Total Portfolio Value</th>`;
        footer += `<th colspan="2" class="text-center fs-5">${formatCurrency(totalValue, state.config.settings.currency)}</th>`;
        footer += '</tr>';
        $portfolioFoot.html(footer);
    }

    function renderCashTable() {
        if (state.config.accounts.length === 0) {
            $cashHead.empty();
            $cashBody.html('<tr><td class="text-center text-muted">Add a brokerage account in the Configuration section to track cash balances.</td></tr>');
            $cashFoot.empty();
            return;
        }

        // Header
        let header = '<tr>';
        state.config.accounts.forEach(acc => header += `<th>${acc}</th>`);
        const currencySelectorHtml = `
            <select id="cash-currency-select" class="form-select form-select-sm" style="width: auto;">
                <option value="USD">USD</option><option value="GBP">GBP</option>
            </select>
        `;
        header += `<th class="d-flex justify-content-between align-items-center"><span>Total Cash</span> ${currencySelectorHtml}</th>`;
        header += '</tr>';
        $cashHead.html(header);
        $('#cash-currency-select').val(state.config.settings.cashCurrency);

        // Body
        let body = '<tr>';
        state.config.accounts.forEach(acc => {
            const balance = state.cash[acc] || 0; // Cash is always stored in USD
            const displayCurrency = state.config.settings.cashCurrency;
            const rate = state.currencyRates[displayCurrency] || 1;
            const convertedBalance = balance * rate;
            body += `<td class="editable-cash" data-account="${acc}">${formatCurrency(convertedBalance, displayCurrency)}</td>`;
        });
        const totalCash = Object.values(state.cash).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        const displayCurrency = state.config.settings.cashCurrency;
        const rate = state.currencyRates[displayCurrency] || 1;
        const convertedTotalCash = totalCash * rate;
        body += `<td class="fw-bold">${formatCurrency(convertedTotalCash, displayCurrency)}</td>`;
        body += '</tr>';
        $cashBody.html(body);

        // Clear the footer as it's no longer used
        $cashFoot.empty();
    }

    function renderSettings() {
        $('#fractional-shares-switch').prop('checked', state.config.settings.allowFractional);
        $('#currency-display-select').val(state.config.settings.currency);
        $('#api-cache-switch').prop('checked', state.config.settings.apiCache);
    }

    // --- Event Listeners ---
    function registerEventListeners() {
        // Config
        $('#add-account-btn').on('click', handleAddAccount);
        $('#new-account-name').on('keydown', e => {
            if (e.key === 'Enter') {
                handleAddAccount();
            }
        });
        $accountsList.on('click', '.remove-account-btn', handleRemoveAccount);

        $('#add-asset-btn').on('click', handleAddAsset);
        $('#new-asset-ticker').on('keydown', e => {
            if (e.key === 'Enter') {
                handleAddAsset();
            }
        });
        $assetsList.on('click', '.remove-asset-btn', handleRemoveAsset);
        $assetsList.on('dblclick', '.editable-asset', function() {
            const $span = $(this);
            if ($span.find('input').length > 0) return;

            const originalAsset = $span.data('original-asset');
            const editor = $(`<input type="text" class="form-control form-control-sm text-uppercase" value="${originalAsset}" />`);
            $span.html(editor);
            editor.focus().select();

            const saveOrCancel = (e) => {
                if (e.type === 'blur' || e.key === 'Enter') {
                    const newAsset = editor.val().trim().toUpperCase();
                    
                    // If the name is unchanged or empty, just revert without saving.
                    if (newAsset === originalAsset || !newAsset) {
                        $span.text(originalAsset);
                        return;
                    }

                    // Check if the new name already exists (and it's not the same as the original)
                    if (state.config.assets.includes(newAsset)) {
                        showToast('Error', `Asset "${newAsset}" already exists.`, 'danger');
                        $span.text(originalAsset); // Revert
                        return;
                    }

                    // Update state
                    const assetIndex = state.config.assets.indexOf(originalAsset);
                    if (assetIndex > -1) state.config.assets[assetIndex] = newAsset;
                    state.portfolio.forEach(item => { if (item.asset === originalAsset) item.asset = newAsset; });
                    saveAndRender();
                } else if (e.key === 'Escape') {
                    $span.text(originalAsset);
                }
            };

            editor.on('blur keydown', saveOrCancel);
        });

        // Portfolio
        $('#add-portfolio-row-btn').on('click', showAddAssetModal);
        $('#save-asset-btn').on('click', handleAddPortfolioRow);
        $portfolioBody.on('click', '.remove-row-btn', handleRemovePortfolioRow);

        // Use a clean, delegated event handler for cell editing to avoid listener leakage.
        $portfolioBody.on('dblclick', '.editable', function() {
            const $cell = $(this);
            if ($cell.find('input, select').length > 0) return; // Already in edit mode

            const originalContent = $cell.text();
            const field = $cell.data('field');
            const index = $cell.closest('tr').data('index');
            let editor;

            if (field === 'asset') {
                const assignedAssets = state.portfolio.map(p => p.asset);
                const availableAssets = state.config.assets.filter(a => !assignedAssets.includes(a) || a === originalContent);
                editor = $('<select class="form-control form-control-sm"></select>');
                editor.append('<option value="">Select...</option>');
                availableAssets.forEach(asset => {
                    editor.append(`<option value="${asset}" ${asset === originalContent ? 'selected' : ''}>${asset}</option>`);
                });
            } else { // qty
                const originalValue = parseFloat(originalContent) || 0;
                const valueAttr = originalValue !== 0 ? `value="${originalValue}"` : '';
                editor = $(`<input type="number" class="form-control form-control-sm" ${valueAttr} placeholder="0" />`);
                if (!state.config.settings.allowFractional) {
                    editor.attr('step', 1);
                }
            }

            $cell.html(editor);
            editor.focus();

            // This listener is scoped to the new editor and will be destroyed with it.
            editor.on('blur keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent form submission if it's in a form
                    const newValue = $(this).val();
                    const portfolioItem = state.portfolio[index];
                    if (field === 'asset') portfolioItem.asset = newValue;
                    else portfolioItem.accounts[$cell.data('account')] = parseFloat(newValue) || 0;
                    
                    updateCalculations();
                    saveAndRender();
                    fetchData();
                } else if (e.key === 'Escape' || e.type === 'blur') {
                    // Revert to original content and remove editor
                    $cell.text(originalContent);
                }
            });
        });

        // Cash Table Editing
        $cashBody.on('dblclick', '.editable-cash', function() {
            const $cell = $(this);
            if ($cell.find('input').length > 0) return;

            const account = $cell.data('account');
            const originalUsdValue = state.cash[account] || 0;
            const displayCurrency = state.config.settings.cashCurrency;
            const rate = state.currencyRates[displayCurrency] || 1;
            const displayValue = originalUsdValue * rate;

            const valueAttr = displayValue !== 0 ? `value="${displayValue.toFixed(2)}"` : '';
            const editor = $(`<input type="number" class="form-control form-control-sm" ${valueAttr} placeholder="0" step="0.01" />`);
            $cell.html(editor);
            $cell.append(`<div class="form-text text-muted small mt-1">Enter cash value in ${displayCurrency}</div>`);
            editor.focus().select();

            editor.on('blur keydown', function(e) {
                if (e.key === 'Enter' || e.type === 'blur') {
                    const enteredValue = parseFloat($(this).val()) || 0;
                    const displayCurrency = state.config.settings.cashCurrency;
                    const rate = state.currencyRates[displayCurrency] || 1;

                    // Convert the entered value back to USD for storage
                    const valueInUsd = rate > 0 ? enteredValue / rate : 0;

                    state.cash[account] = valueInUsd;
                    saveAndRender();
                } else if (e.key === 'Escape') {
                    saveAndRender(); // Re-render to revert to original value
                }
            });
        });

        // Cash Currency Selector
        $(document).on('change', '#cash-currency-select', function() {
            state.config.settings.cashCurrency = $(this).val();
            // Provide immediate feedback to the user while the new rate is fetched.
            $cashBody.find('.editable-cash').html('<span class="text-muted fst-italic">Calculating...</span>');
            // Also update the total cash cell
            $cashBody.find('.fw-bold').html('<span class="text-muted fst-italic">Calculating...</span>');
            // Fetch new currency rate, then save and re-render.
            fetchData();
        });

        // Settings
        $('#fractional-shares-switch').on('change', handleSettingChange);
        $('#currency-display-select').on('change', handleSettingChange);
        $('#api-cache-switch').on('change', handleSettingChange);
        
        // Data Management
        $('#export-csv-btn').on('click', exportCSV);
        $('#import-csv-input').on('change', importCSV);
        $('#clear-portfolio-btn').on('click', () => confirmAction('Are you sure you want to clear the entire portfolio?', clearPortfolio));
        $('#clear-all-data-btn').on('click', () => confirmAction('Are you sure you want to delete all accounts, assets, and portfolio data?', clearAllData));
    }

    // --- Handlers ---
    function handleAddAccount() {
        const newAccount = $('#new-account-name').val().trim();
        if (newAccount && !state.config.accounts.includes(newAccount)) {
            state.config.accounts.push(newAccount);
            saveAndRender();
            $('#new-account-name').val('');
        }
    }

    function handleRemoveAccount(e) {
        const accountToRemove = $(e.currentTarget).data('account');
        const itemsWithBalance = state.portfolio.filter(p => p.accounts[accountToRemove] > 0).length;

        // Also remove from cash state
        delete state.cash[accountToRemove];

        let message = `Are you sure you want to delete the Brokerage Account: ${accountToRemove}?`;
        if (itemsWithBalance > 0) {
            message += ` This will also remove all associated Assets and Wuantities from your portfolio.`;
        }

        confirmAction(message, () => deleteAccount(accountToRemove));
    }

    function deleteAccount(accountToRemove) {
        state.config.accounts = state.config.accounts.filter(acc => acc !== accountToRemove);
        state.portfolio.forEach(item => {
            delete item.accounts[accountToRemove];
        });
        saveAndRender();
        showToast('Success', `Account "${accountToRemove}" has been deleted.`, 'success');
    }
    async function handleAddAsset() {
        const newAsset = $('#new-asset-ticker').val().trim().toUpperCase();
        if (!newAsset) return;

        if (state.config.assets.includes(newAsset)) {
            showToast('Info', `Asset "${newAsset}" already exists.`, 'info');
            return;
        }

        // Check if API keys are configured before attempting to validate
        if (!window.appConfig?.ALPACA_API?.KEY_ID || !window.appConfig?.ALPACA_API?.SECRET_KEY) {
            confirmAction(`Can't verify the stock ticker "${newAsset}". Please set the Alpaca API keys in Global Configuration.`, () => {}, { isError: true, confirmText: 'OK' });
            return;
        }

        const result = await AlpacaAPI.getLatestPrice(newAsset, false); // Don't use cache for validation

        const proceedToAdd = () => {
            state.config.assets.push(newAsset);
            saveAndRender();
            $('#new-asset-ticker').val('');
        };
        
        if (result.price !== null) {
            proceedToAdd();
        } else {
            confirmAction(`The asset: ${newAsset} was not found by the API. Are you sure you want to add it?`, proceedToAdd);
        }
    }
    
    function handleRemoveAsset(e) {
        const assetToRemove = $(e.currentTarget).data('asset');
        const portfolioItemsWithAsset = state.portfolio.filter(p => p.asset === assetToRemove && p.totalQty > 0);

        let message = `Are you sure you want to delete the asset "${assetToRemove}"?`;
        if (portfolioItemsWithAsset.length > 0) {
            message += ` This will also remove ${portfolioItemsWithAsset.length} row(s) from your portfolio.`;
        }

        confirmAction(message, () => deleteAsset(assetToRemove));
    }

    function deleteAsset(assetToRemove) {
        state.config.assets = state.config.assets.filter(a => a !== assetToRemove);
        state.portfolio = state.portfolio.filter(p => p.asset !== assetToRemove);
        saveAndRender();
        showToast('Success', `Asset "${assetToRemove}" has been deleted.`, 'success');
    }

    function showAddAssetModal() {
        const $assetSelect = $('#add-asset-select');
        const $quantitiesDiv = $('#add-asset-quantities');
        $assetSelect.empty().append('<option value="" selected>Select an asset...</option>');
        $quantitiesDiv.empty();

        // Populate asset dropdown
        const assignedAssets = state.portfolio.map(p => p.asset);
        const availableAssets = state.config.assets.filter(a => !assignedAssets.includes(a));
        availableAssets.forEach(asset => {
            $assetSelect.append(`<option value="${asset}">${asset}</option>`);
        });

        // Create quantity inputs for each account
        let quantityInputs = '<h5>Quantities</h5>';
        state.config.accounts.forEach(account => {
            quantityInputs += `
                <div class="mb-3">
                    <label for="qty-input-${account}" class="form-label">${account}</label>
                    <input type="number" class="form-control" id="qty-input-${account}" data-account="${account}" placeholder="0" step="any" min="0">
                </div>
            `;
        });
        $quantitiesDiv.html(quantityInputs);

        const addAssetModal = new bootstrap.Modal($('#add-asset-modal'));
        addAssetModal.show();
    }

    function handleAddPortfolioRow() {
        const selectedAsset = $('#add-asset-select').val();
        if (!selectedAsset) {
            showToast('Error', 'Please select an asset.', 'danger');
            return;
        }

        const newRow = {
            asset: selectedAsset,
            accounts: {},
            totalQty: 0,
            price: 0,
            value: 0
        };

        $('#add-asset-quantities input').each(function() {
            const account = $(this).data('account');
            const qty = parseFloat($(this).val()) || 0;
            newRow.accounts[account] = qty;
        });

        state.portfolio.push(newRow);
        updateCalculations(); // Recalculate totals for the new row
        saveAndRender();
        fetchData(); // Fetch price for the new asset

        // Hide the modal
        const addAssetModal = bootstrap.Modal.getInstance($('#add-asset-modal'));
        addAssetModal.hide();
    }
    
    function handleRemovePortfolioRow(e) {
        const $row = $(e.currentTarget).closest('tr');
        const index = $row.data('index');
        const assetName = state.portfolio[index]?.asset || 'this item';

        const message = `Are you sure you want to remove ${assetName} from your portfolio?`;
        confirmAction(message, () => state.portfolio.splice(index, 1) && saveAndRender());
    }

    function handleSettingChange(e) {
        const $target = $(e.target);
        const setting = $target.attr('id').replace('-switch', '').replace('-select', '');
        const value = $target.is(':checkbox') ? $target.prop('checked') : $target.val();
        
        if (setting === 'fractional-shares') state.config.settings.allowFractional = value;
        if (setting === 'currency-display') state.config.settings.currency = value;
        if (setting === 'api-cache') state.config.settings.apiCache = value;
        
        updateCalculations();
        saveAndRender();
        fetchData(); // Refetch data for new currency
    }

    // --- Data Fetching & Calculations ---
    async function fetchData() {
        await fetchAssetPrices();
        await fetchCurrencyRates();
        updateCalculations();
        saveAndRender();
    }

    async function fetchAssetPrices() {
        const assetsToFetch = state.portfolio.map(p => p.asset).filter(Boolean);
        if (assetsToFetch.length === 0) return;

        for (const asset of assetsToFetch) {
            const result = await AlpacaAPI.getLatestPrice(asset, state.config.settings.apiCache);
            if (result.price !== null) {
                state.prices[asset] = result.price;
            } else if (result.error) {
                // If there was an error, show a toast but don't block the UI.
                showToast('API Error', `Could not fetch price for ${asset}: ${result.error}`, 'warning');
            }
        }
    }
    
    async function fetchCurrencyRates() {
        const portfolioCurrency = state.config.settings.currency;
        const cashCurrency = state.config.settings.cashCurrency;
        const currenciesToFetch = new Set([portfolioCurrency, cashCurrency]);
        currenciesToFetch.delete('USD'); // No need to fetch USD against itself

        if (currenciesToFetch.size === 0) {
            state.currencyRates = { USD: 1 };
            return;
        }

        try {
            const response = await fetch(`${FRANKFURTER_API_URL}/latest?from=USD&to=${[...currenciesToFetch].join(',')}`);
            const data = await response.json();
            state.currencyRates = data.rates;
            state.currencyRates['USD'] = 1; // Always include the base rate
        } catch (error) {
            console.error('Failed to fetch currency rates:', error);
            showToast('Error', 'Could not fetch currency conversion rates.', 'danger');
        }
    }

    function updateCalculations() {
        const rate = state.currencyRates[state.config.settings.currency] || 1;
        state.portfolio.forEach(item => {
            item.totalQty = Object.values(item.accounts).reduce((sum, qty) => sum + (parseFloat(qty) || 0), 0);
            item.price = (state.prices[item.asset] || 0) * rate;
            item.value = item.totalQty * item.price;
        });
    }
    
    function saveAndRender() {
        saveState();
        renderAll();
    }

    // --- Data Management ---
    function exportCSV() {
        let csvContent = "data:text/csv;charset=utf-8,";
        // Header Row
        const headers = ['Asset', ...state.config.accounts, 'Total Qty', 'Price', 'Value'];
        csvContent += headers.join(',') + '\r\n';
        // Data Rows
        state.portfolio.forEach(item => {
            const row = [
                item.asset,
                ...state.config.accounts.map(acc => item.accounts[acc] || 0),
                item.totalQty,
                item.price,
                item.value
            ];
            csvContent += row.join(',') + '\r\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "portfolio.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function importCSV(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            const headers = rows.shift().trim().split(',');
            
            const assetIndex = headers.indexOf('Asset');
            const accountHeaders = state.config.accounts;

            const newPortfolio = rows.map(rowStr => {
                const cells = rowStr.trim().split(',');
                const asset = cells[assetIndex];
                const accounts = {};
                accountHeaders.forEach(acc => {
                    const accIndex = headers.indexOf(acc);
                    if (accIndex > -1) {
                        accounts[acc] = parseFloat(cells[accIndex]) || 0;
                    }
                });
                return { asset, accounts, totalQty: 0, price: 0, value: 0 };
            });
            
            state.portfolio = newPortfolio;
            updateCalculations();
            saveAndRender();
            fetchData();
            showToast('Success', 'Portfolio imported successfully.', 'success');
        };
        reader.readAsText(file);
        $('#import-csv-input').val(''); // Reset input
    }

    function clearPortfolio() {
        state.portfolio = [];
        saveAndRender();
        showToast('Success', 'Portfolio has been cleared.', 'success');
    }

    function clearAllData() {
        state.config.accounts = [];
        state.config.assets = [];
        state.portfolio = [];
        state.cash = {};
        saveAndRender();
        showToast('Success', 'All data has been cleared.', 'success');
    }

    // --- Utilities ---
    function formatCurrency(value, currency) {
        return (value || 0).toLocaleString('en-US', {
            style: 'currency',
            currency: currency,
        });
    }

    function confirmAction(message, callback) {
        const modal = new bootstrap.Modal($('#confirm-action-modal'));
        $('#confirm-action-modal-body').text(message);
        $('#confirm-action-btn').off('click').on('click', () => {
            callback();
            modal.hide();
        });
        modal.show();
    }

    function showToast(title, message, type = 'info') {
        const toastEl = $('#app-toast');
        toastEl.removeClass('text-bg-info text-bg-success text-bg-danger text-bg-warning');
        toastEl.addClass(`text-bg-${type}`);
        $('#toast-title').text(title);
        $('#toast-body').text(message);
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

    // --- Run Application ---
    initializeApp();
});
