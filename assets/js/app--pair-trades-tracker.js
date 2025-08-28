$(document).ready(function() {
    'use strict';

    const DB_NAME = 'PairTradeTrackerDB';
    const DB_VERSION = 1;
    const PAIRS_STORE = 'pairs';
    const TRADES_STORE = 'trades';

    let db;
    let currentPair = null;
    let confirmActionModal;
    let closeTradeModal;
    let allowFractionalShares = false;
    let isPairNameManuallyEdited = false;

    // --- DATABASE MANAGEMENT ---
    const DB = {
        init: function() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (event) => {
                    const dbInstance = event.target.result;
                    if (!dbInstance.objectStoreNames.contains(PAIRS_STORE)) {
                        dbInstance.createObjectStore(PAIRS_STORE, { keyPath: 'id', autoIncrement: true });
                    }
                    if (!dbInstance.objectStoreNames.contains(TRADES_STORE)) {
                        const tradesStore = dbInstance.createObjectStore(TRADES_STORE, { keyPath: 'id', autoIncrement: true });
                        tradesStore.createIndex('pairId', 'pairId', { unique: false });
                    }
                };
                request.onsuccess = (event) => {
                    db = event.target.result;
                    resolve(db);
                };
                request.onerror = (event) => {
                    console.error('Database error:', event.target.errorCode);
                    reject(event.target.errorCode);
                };
            });
        },
        add: function(storeName, item) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(item);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },
        getAll: function(storeName) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },
        get: function(storeName, key) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },
        put: function(storeName, item) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(item);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },
        delete: function(storeName, key) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },
        deletePairAndTrades: function(pairId) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([TRADES_STORE, PAIRS_STORE], 'readwrite');
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                const tradesStore = transaction.objectStore(TRADES_STORE);
                const pairsStore = transaction.objectStore(PAIRS_STORE);
                const tradesIndex = tradesStore.index('pairId');
                const cursorRequest = tradesIndex.openCursor(IDBKeyRange.only(pairId));
                cursorRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        pairsStore.delete(pairId);
                    }
                };
            });
        },
        clearTradesForPair: function(pairId) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([TRADES_STORE], 'readwrite');
                const store = transaction.objectStore(TRADES_STORE);
                const index = store.index('pairId');
                const request = index.openCursor(IDBKeyRange.only(pairId));
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        },
        clearAllData: function() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([PAIRS_STORE, TRADES_STORE], 'readwrite');
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                const pairsStore = transaction.objectStore(PAIRS_STORE);
                const tradesStore = transaction.objectStore(TRADES_STORE);
                pairsStore.clear();
                tradesStore.clear();
            });
        },
        getTradesByPairId: function(pairId) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([TRADES_STORE], 'readonly');
                const store = transaction.objectStore(TRADES_STORE);
                const index = store.index('pairId');
                const request = index.getAll(pairId);
                request.onsuccess = () => {
                    const sortedTrades = [...request.result].sort((a, b) => {
                        const dateA = new Date(a.open ? a.open.date : a.date);
                        const dateB = new Date(b.open ? b.open.date : b.date);
                        return dateA - dateB;
                    });
                    resolve(sortedTrades);
                };
                request.onerror = () => reject(request.error);
            });
        },
        bulkAdd: function(storeName, items) {
            return new Promise((resolve, reject) => {
                if (items.length === 0) {
                    return resolve();
                }
                const transaction = db.transaction([storeName], 'readwrite');
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                const store = transaction.objectStore(storeName);
                items.forEach(item => store.add(item));
            });
        }
    };

    // --- UI MANAGEMENT & RENDERERS ---
    const UI = {
        dateSortOrder: 'asc',
        showMainContent: function(shouldShow) {
            if (shouldShow) {
                $('#welcome-message').addClass('d-none');
                $('#main-content').removeClass('d-none');
                $('#pair-configuration').removeClass('d-none');
                $('#delete-pair-btn').prop('disabled', false);
            } else {
                $('#welcome-message').removeClass('d-none');
                $('#main-content').addClass('d-none');
                $('#pair-configuration').addClass('d-none');
                $('#delete-pair-btn').prop('disabled', true);
                this.resetNewTradeHeaders();
            }
        },
        populatePairSelector: function(pairs) {
            const selector = $('#pair-selector');
            selector.empty();
            if (pairs.length === 0) {
                this.showMainContent(false);
                selector.append('<option>No pairs created</option>');
            } else {
                this.showMainContent(true);
                pairs.forEach(pair => {
                    selector.append(`<option value="${pair.id}">${pair.pairName}</option>`);
                });
            }
        },
        renderTradeLog: function(trades) {
            const tbody = $('#trade-log-body');
            tbody.empty();
            if (!currentPair) return;

            const NUM_COLUMNS = 9;
            const iconName = this.dateSortOrder === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down';
            $('#date-sort-icon').html(iconName).addClass('material-symbols-outlined icon-inline-sm sort-icon');
            $('.stock-a-qty-header').text(`${currentPair.stockATicker}`);
            $('.stock-b-qty-header').text(`${currentPair.stockBTicker}`);
            $('#trade-log-table th:contains("Actions / Outcome")').addClass('text-center');

            const renderLegRow = (leg, tradeId, legType, stripeClass, isEditable = false, outcome = null, isClosable = false) => {
                const qtyDisplayFormat = { minimumFractionDigits: 0, maximumFractionDigits: allowFractionalShares ? 4 : 0 };
                const legSwapQty = parseFloat(leg.swapQty);
                const legDisplayRatio = Helpers.calculatePairRatio(parseFloat(leg.fromPrice), parseFloat(leg.toPrice), leg.fromTicker);
                const legSwapQtyDisplay = legSwapQty.toLocaleString(undefined, qtyDisplayFormat);
                const legToQty = leg.toQty;
                const legToQtyDisplay = legToQty.toLocaleString(undefined, qtyDisplayFormat);
                const editableClass = isEditable ? 'editable-cell' : '';
                const notesIcon = leg.notes ? 'description' : 'note_add';
                const notesTitle = leg.notes ? 'View the notes for this trade' : 'Add notes to this trade';
                const directionDisplay = `${leg.fromTicker} &gt; ${leg.toTicker}`;

                let idCellHtml = '';
                if (legType === 'open') {
                    // If the trade is NOT closable, it means it's a closed trade with two rows.
                    const rowspanAttr = !isClosable ? 'rowspan="2"' : '';
                    idCellHtml = `<td class="trade-id-cell align-middle text-center" ${rowspanAttr}>${tradeId}</td>`;
                }

                let actionsCellHtml = '';
                if (legType === 'open') {
                    let actionsContent = '';
                    let actionsRowspan = '';
                    let actionsClasses = 'actions-cell align-middle text-center';

                    const notesButtonHtml = `<button class="btn btn-sm notes-icon-btn toggle-notes-btn me-1" title="${notesTitle}"><span class="material-symbols-outlined">${notesIcon}</span></button>`;
                    const closeButtonHtml = isClosable ?
                        `<button class="btn btn-sm notes-icon-btn close-trade-btn me-1" title="Close Trade"><span class="material-symbols-outlined">check_box_outline_blank</span></button>` :
                        `<span class="btn btn-sm notes-icon-btn non-interactive-icon shadow-none me-1" title="This trade is closed" style="cursor: default;"><span class="material-symbols-outlined">check_box</span></span>`;
                    const deleteButtonHtml = `<button class="btn btn-sm notes-icon-btn delete-trade-btn" title="Delete this trade"><span class="material-symbols-outlined text-danger">delete</span></button>`;
                    const buttonsGroup = `<div class="action-buttons">${notesButtonHtml}${closeButtonHtml}${deleteButtonHtml}</div>`;

                    if (outcome) { // This means the trade is closed, so we show the outcome and span the row
                        const qtyAClass = outcome.qtyAChange >= 0 ? 'text-success' : 'text-danger';
                        const qtyBClass = outcome.qtyBChange >= 0 ? 'text-success' : 'text-danger';
                        const dollarClass = outcome.dollarChange >= 0 ? 'text-success' : 'text-danger';
                        const outcomeQtyFormat = { minimumFractionDigits: allowFractionalShares ? 2 : 0, maximumFractionDigits: allowFractionalShares ? 4 : 0 };
                        const formatQty = (num) => num >= 0 ? `+${num.toLocaleString(undefined, outcomeQtyFormat)}` : num.toLocaleString(undefined, outcomeQtyFormat);
                        const formatDollar = (num) => num >= 0 ? `+$${num.toFixed(2)}` : `-$${Math.abs(num).toFixed(2)}`;

                        const outcomeHtml = `
                            <div class="trade-outcome small mb-2">
                                <div>
                                    ${currentPair.stockATicker}: <span class="${qtyAClass}">${formatQty(outcome.qtyAChange)}</span>,
                                    ${currentPair.stockBTicker}: <span class="${qtyBClass}">${formatQty(outcome.qtyBChange)}</span>,
                                    Cash: <span class="${dollarClass} fw-bold">${formatDollar(outcome.dollarChange)}</span>
                                </div>
                            </div>`;
                        actionsContent = outcomeHtml + buttonsGroup;
                        actionsRowspan = 'rowspan="2"';
                    } else { // Trade is open, just show buttons
                        actionsContent = buttonsGroup;
                    }
                    actionsCellHtml = `<td class="${actionsClasses}" ${actionsRowspan}>${actionsContent}</td>`;
                }

                const rowHtml = `
                    <tr data-trade-id="${tradeId}" data-leg-type="${legType}" class="leg-row ${legType}-leg ${stripeClass}">
                        ${idCellHtml}
                        <td class="${editableClass}" data-field="date">${Helpers.formatDateForDisplay(leg.date)}</td>
                        <td>${directionDisplay}</td>
                        <td class="${editableClass}" data-field="swapQty">${legSwapQtyDisplay}</td>
                        <td class="${editableClass}" data-field="fromPrice">$${parseFloat(leg.fromPrice).toFixed(2)}</td>
                        <td>${legToQtyDisplay}</td>
                        <td class="${editableClass}" data-field="toPrice">$${parseFloat(leg.toPrice).toFixed(2)}</td>
                        <td class="text-center">${legDisplayRatio !== null ? legDisplayRatio.toFixed(4) : 'N/A'}</td>
                        ${actionsCellHtml}
                    </tr>`;
                tbody.append(rowHtml);

            };

            const holdingsHistory = Helpers.calculateAllHoldings(trades);
            let combinedData = trades.map((trade, index) => ({
                trade: trade,
                holdings: holdingsHistory[index]
            }));

            combinedData.sort((a, b) => { // Sort by open date
                const dateA = new Date(a.trade.open ? a.trade.open.date : a.trade.date);
                const dateB = new Date(b.trade.open ? b.trade.open.date : b.trade.date);
                return this.dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });

            let isEvenRow = false;
            combinedData.forEach(data => {
                const stripeClass = isEvenRow ? 'trade-row-even' : 'trade-row-odd';
                isEvenRow = !isEvenRow;

                const { trade, holdings } = data;

                if (trade.open) { // New round-trip format
                    const isClosable = !trade.close;
                    let outcome = null;
                    if (!isClosable) {
                        outcome = Helpers.calculateTradeOutcome(trade);
                    }
                    renderLegRow(trade.open, trade.id, 'open', stripeClass, true, outcome, isClosable);
                    if (trade.close) {
                        // The outcome is passed for consistency, but it's not used for the action cell in the 'close' leg.
                        renderLegRow(trade.close, trade.id, 'close', stripeClass, true, outcome, false);
                    }

                    // After rendering all leg rows for a trade, render its notes row.
                    // This ensures it appears after both legs of a closed trade.
                    const notesContent = `<textarea class="form-control form-control-sm notes-editor" data-field="notes" rows="2" placeholder="Double-click to add/edit notes..." readonly>${trade.open.notes || ''}</textarea>`;
                    const notesRow = `<tr class="notes-row d-none ${stripeClass}" data-notes-for-trade-id="${trade.id}" data-leg-type="open"><td colspan="${NUM_COLUMNS}">${notesContent}</td></tr>`;
                    tbody.append(notesRow);
                } else { // Legacy flat format (read-only for now)
                    const qtyDisplayFormat = { minimumFractionDigits: 0, maximumFractionDigits: allowFractionalShares ? 4 : 0 };
                    const swapQty = parseFloat(trade.swapQty);
                    const ratio = parseFloat(trade.fromPrice) / parseFloat(trade.toPrice);
                    const isComplete = trade.isComplete || false;
                    const row = `
                        <tr data-trade-id="${trade.id}" class="legacy-trade ${stripeClass}">
                            <td>${trade.id}</td>
                            <td>${Helpers.formatDateForDisplay(trade.date)}</td>
                            <td>${trade.fromTicker} &gt; ${trade.toTicker}</td>
                            <td>${swapQty.toLocaleString(undefined, qtyDisplayFormat)}</td>
                            <td>$${parseFloat(trade.fromPrice).toFixed(2)}</td>
                            <td>${(swapQty * ratio).toLocaleString(undefined, qtyDisplayFormat)}</td>
                            <td>$${parseFloat(trade.toPrice).toFixed(2)}</td>
                            <td colspan="2" class="text-center text-muted fst-italic">Legacy trade - please migrate to new format</td>
                        </tr>`;
                    tbody.append(row);
                }

                // Add a spacer row after each trade group for visual separation
                const spacerRow = `<tr class="trade-spacer-row"><td colspan="${NUM_COLUMNS}"></td></tr>`;
                tbody.append(spacerRow);
            });
        },
        renderNewTradeRow: function() {
            const newTradeBody = $('#new-trade-body');
            newTradeBody.empty();
            if (!currentPair) return;

            const directionAtoB = `${currentPair.stockATicker} &gt; ${currentPair.stockBTicker}`;
            const directionBtoA = `${currentPair.stockBTicker} &gt; ${currentPair.stockATicker}`;
            const directionOptions = `<option value="A_TO_B">${directionAtoB}</option><option value="B_TO_A">${directionBtoA}</option>`;
            const newTradeRow = `
                <tr id="new-trade-row" class="align-middle">
                    <td><input type="date" id="new-date" class="form-control form-control-sm"></td>
                    <td><select id="new-direction" class="form-select form-select-sm trade-select">${directionOptions}</select></td>
                    <td><input type="number" id="new-swap-qty" class="form-control form-control-sm trade-input" min="0" step="any"></td>
                    <td><input type="number" id="new-from-price" class="form-control form-control-sm trade-input" min="0" step="0.01"></td>
                    <td><div id="new-to-qty" class="text-center"></div></td>
                    <td><input type="number" id="new-to-price" class="form-control form-control-sm trade-input" min="0" step="0.01"></td>
                    <td><div id="new-ratio" class="text-center"></div></td>
                    <td><button id="save-trade-btn" class="btn btn-sm btn-success">Save</button></td>
                </tr>`;
            newTradeBody.append(newTradeRow);
            $('#new-date').val(new Date().toISOString().split('T')[0]);
            this.updateNumberInputs();
            this.initializeTooltips();
            this.updateNewTradeHeaders($('#new-direction').val());
        },
        renderPerformance: function(trades) {
            const metrics = Helpers.getPerformanceMetrics(trades);
            if (!metrics) {
                $('#initial-state').html('<p class="card-text text-muted">Configure a pair and add a trade to see starting values.</p>');
                $('#current-state').html('<p class="card-text text-muted">No trades logged yet.</p>');
                $('#performance-metrics').html('<p class="card-text text-muted">Awaiting trade data for calculations.</p>');
                return;
            }
            const qtyDisplayFormat = { minimumFractionDigits: 0, maximumFractionDigits: allowFractionalShares ? 4 : 0 };
            $('#initial-state').html(`
                <dl class="row mb-0">
                    <dt class="col-sm-7">${metrics.initial.qtyA.toLocaleString(undefined, qtyDisplayFormat)} ${currentPair.stockATicker}</dt>
                    <dd class="col-sm-5 text-end">$${metrics.initial.valueA.toFixed(2)}</dd>
                    <dt class="col-sm-7">${metrics.initial.qtyB.toLocaleString(undefined, qtyDisplayFormat)} ${currentPair.stockBTicker}</dt>
                    <dd class="col-sm-5 text-end">$${metrics.initial.valueB.toFixed(2)}</dd>
                    <dt class="col-sm-7 border-top pt-2 mt-1">Total Initial Value</dt>
                    <dd class="col-sm-5 text-end border-top pt-2 mt-1"><strong>$${metrics.initial.totalValue.toFixed(2)}</strong></dd>
                </dl>`);
            $('#current-state').html(`
                <dl class="row mb-0">
                    <dt class="col-sm-7">${metrics.current.qtyA.toLocaleString(undefined, qtyDisplayFormat)} ${currentPair.stockATicker}</dt>
                    <dd class="col-sm-5 text-end">$${metrics.current.valueA.toFixed(2)}</dd>
                    <dt class="col-sm-7">${metrics.current.qtyB.toLocaleString(undefined, qtyDisplayFormat)} ${currentPair.stockBTicker}</dt>
                    <dd class="col-sm-5 text-end">$${metrics.current.valueB.toFixed(2)}</dd>
                    <dt class="col-sm-7 border-top pt-2 mt-1">Total Current Value</dt>
                    <dd class="col-sm-5 text-end border-top pt-2 mt-1"><strong>$${metrics.current.totalValue.toFixed(2)}</strong></dd>
                </dl>`);
            const plClass = metrics.performance.totalPL >= 0 ? 'text-success' : 'text-danger';
            $('#performance-metrics').html(`
                <dl class="row mb-0">
                    <dt class="col-sm-8">Total P/L</dt>
                    <dd class="col-sm-4 text-end ${plClass}"><strong>$${metrics.performance.totalPL.toFixed(2)}</strong></dd>
                    <dt class="col-sm-8">Percentage Gain/Loss</dt>
                    <dd class="col-sm-4 text-end ${plClass}"><strong>${metrics.performance.percentageGain.toFixed(2)}%</strong></dd>
                </dl>`);
        },
        renderCurrentHoldings: function(holdings) {
            if (!currentPair || !holdings) {
                $('#holdings-stock-a-ticker').text('--');
                $('#holdings-stock-a-qty').text('0');
                $('#holdings-stock-a-value').html('&nbsp;');
                $('#holdings-stock-b-ticker').text('--');
                $('#holdings-stock-b-qty').text('0');
                $('#holdings-stock-b-value').html('&nbsp;');
                $('#holdings-total-value').text('$0.00');
                return;
            }
            const qtyDisplayFormat = { minimumFractionDigits: 0, maximumFractionDigits: allowFractionalShares ? 4 : 0 };
            $('#holdings-stock-a-ticker').text(currentPair.stockATicker);
            $('#holdings-stock-a-qty').text(holdings.qtyA.toLocaleString(undefined, qtyDisplayFormat));
            $('#holdings-stock-b-ticker').text(currentPair.stockBTicker);
            $('#holdings-stock-b-qty').text(holdings.qtyB.toLocaleString(undefined, qtyDisplayFormat));

            // Reset fields to a loading state, then fetch live data
            $('#holdings-stock-a-value').text('Fetching price...');
            $('#holdings-stock-b-value').text('Fetching price...');
            $('#holdings-total-value').text('...');
            this.updateLiveHoldingsValues(holdings);
        },
        updateLiveHoldingsValues: async function(holdings) {
            if (!currentPair || !holdings || typeof AlpacaAPI === 'undefined' || typeof AppConfig === 'undefined') return;

            if (!AppConfig.ALPACA_API.KEY_ID) {
                const prompt = '<span class="text-muted small">Set API keys in config to see live values.</span>';
                $('#holdings-stock-a-value').html(prompt);
                $('#holdings-stock-b-value').html(prompt);
                $('#holdings-total-value').text('$?.??');
                return;
            }

            try {
                const [priceA, priceB] = await Promise.all([
                    AlpacaAPI.getLatestPrice(currentPair.stockATicker),
                    AlpacaAPI.getLatestPrice(currentPair.stockBTicker)
                ]);

                let totalValue = 0;
                const valueFormat = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

                if (priceA !== null) {
                    const valueA = holdings.qtyA * priceA;
                    totalValue += valueA;
                    const valueAHtml = `<div>Live price: $${priceA.toFixed(2)}</div>
                                        <div>Current Value: <span class="fw-bold">$${valueA.toLocaleString(undefined, valueFormat)}</span></div>`;
                    $('#holdings-stock-a-value').html(valueAHtml);
                } else {
                    $('#holdings-stock-a-value').html(`<span class="text-danger small">Could not fetch price for ${currentPair.stockATicker}.</span>`);
                }

                if (priceB !== null) {
                    const valueB = holdings.qtyB * priceB;
                    totalValue += valueB;
                    const valueBHtml = `<div>Live price: $${priceB.toFixed(2)}</div>
                                        <div>Current Value: <span class="fw-bold">$${valueB.toLocaleString(undefined, valueFormat)}</span></div>`;
                    $('#holdings-stock-b-value').html(valueBHtml);
                } else {
                    $('#holdings-stock-b-value').html(`<span class="text-danger small">Could not fetch price for ${currentPair.stockBTicker}.</span>`);
                }

                $('#holdings-total-value').text(`$${totalValue.toLocaleString(undefined, valueFormat)}`);
            } catch (error) {
                console.error("Error fetching live holding values:", error);
                const errorMsg = '<span class="text-danger small">API Error</span>';
                $('#holdings-stock-a-value').html(errorMsg);
                $('#holdings-stock-b-value').html(errorMsg);
                $('#holdings-total-value').text('$?.??');
            }
        },
        updateNumberInputs: function() {
            const step = allowFractionalShares ? 'any' : '1';
            $('#config-stock-a-qty, #config-stock-b-qty, #new-swap-qty, #stock-a-initial-qty, #stock-b-initial-qty').attr('step', step);
        },
        updateCalculatedFields: function() {
            const fromPrice = parseFloat($('#new-from-price').val());
            const swapQty = parseFloat($('#new-swap-qty').val());
            const toPrice = parseFloat($('#new-to-price').val());
            const toQtyInput = $('#new-to-qty');
            const ratioInput = $('#new-ratio');
            const qtyDisplayFormat = { minimumFractionDigits: allowFractionalShares ? 4 : 0, maximumFractionDigits: allowFractionalShares ? 4 : 0 };

            if (!isNaN(fromPrice) && fromPrice > 0 && !isNaN(swapQty) && swapQty > 0 && !isNaN(toPrice) && toPrice > 0) {
                const calculatedToQty = (fromPrice * swapQty) / toPrice;
                toQtyInput.text(calculatedToQty.toLocaleString(undefined, qtyDisplayFormat));
            } else {
                toQtyInput.text('');
            }

            if (!isNaN(fromPrice) && fromPrice > 0 && !isNaN(toPrice) && toPrice > 0) {
                const direction = $('#new-direction').val();
                const fromTicker = direction === 'A_TO_B' ? currentPair.stockATicker : currentPair.stockBTicker;
                const displayRatio = Helpers.calculatePairRatio(fromPrice, toPrice, fromTicker);
                ratioInput.text(displayRatio !== null ? displayRatio.toFixed(4) : '');
            } else {
                ratioInput.text('');
            }
        },
        updateCloseTradeRatio: function() {
            const fromPrice = parseFloat($('#close-from-price').val());
            const toPrice = parseFloat($('#close-to-price').val());
            const fromTicker = $('#close-from-ticker-label').text();
            const ratioDiv = $('#close-trade-ratio');

            if (!isNaN(fromPrice) && fromPrice > 0 && !isNaN(toPrice) && toPrice > 0) {
                const displayRatio = Helpers.calculatePairRatio(fromPrice, toPrice, fromTicker);
                ratioDiv.html(displayRatio !== null ? displayRatio.toFixed(4) : '&nbsp;');
            } else {
                ratioDiv.html('&nbsp;');
            }
        },
        updateNewTradeHeaders: function(directionValue) {
            if (!currentPair) return;

            const { stockATicker, stockBTicker } = currentPair;
            const $swapFromHeader = $('#new-trade-swap-from-header');
            const $swapToHeader = $('#new-trade-swap-to-header');

            let fromTicker, toTicker;

            if (directionValue === 'A_TO_B') {
                fromTicker = stockATicker;
                toTicker = stockBTicker;
            } else if (directionValue === 'B_TO_A') {
                fromTicker = stockBTicker;
                toTicker = stockATicker;
            }

            if (fromTicker && toTicker) {
                $swapFromHeader.html(`Swap From <span class="text-info">${fromTicker}</span>`);
                $swapToHeader.html(`Swap To <span class="text-info">${toTicker}</span>`);
            } else {
                this.resetNewTradeHeaders();
            }
        },
        resetNewTradeHeaders: function() {
            $('#new-trade-swap-from-header').text('Swap From');
            $('#new-trade-swap-to-header').text('Swap To');
        },
        initializeTooltips: function() {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function(tooltipTriggerEl) {
                const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                if (existingTooltip) {
                    existingTooltip.dispose();
                }
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        },
        showToast: function(title, message, isError = false) {
            $('#toast-title').text(title);
            $('#toast-body').text(message);
            $('#app-toast').attr('data-toast-type', isError ? 'error' : 'success');
            const appToast = new bootstrap.Toast(document.getElementById('app-toast'));
            appToast.show();
        },
        validateRow: function() {
            let isValid = true;
            const fields = ['#new-date', '#new-swap-qty', '#new-from-price', '#new-to-price'];
            fields.forEach(fieldId => {
                const field = $(fieldId);
                let isFieldValid = true;
                if (field.attr('type') === 'number') {
                    isFieldValid = field.val() && parseFloat(field.val()) > 0;
                } else {
                    isFieldValid = !!field.val();
                }
                if (!isFieldValid) {
                    field.addClass('is-invalid');
                    isValid = false;
                } else {
                    field.removeClass('is-invalid');
                }
            });
            return isValid;
        },
        createCellEditor: function(field, currentValue) {
            if (field === 'fromTicker') {
                const toTicker = (currentValue === currentPair.stockATicker) ? currentPair.stockBTicker : currentPair.stockATicker;
                return `<select class="form-select form-select-sm"><option value="${currentValue}" selected>${currentValue}</option><option value="${toTicker}">${toTicker}</option></select>`;
            }
            if (field === 'date') {
                return `<input type="date" class="form-control form-control-sm" value="${currentValue}">`;
            }
            const step = field === 'swapQty' ? (allowFractionalShares ? 'any' : '1') : '0.01';
            return `<input type="number" class="form-control form-control-sm trade-input" value="${currentValue}" step="${step}">`;
        },
        updateCacheStatusIndicator: function() {
            const cacheStatusSpan = $('#api-cache-status');
            const isEnabled = localStorage.getItem('apiCacheEnabled') === 'true';

            if (isEnabled) {
                cacheStatusSpan.text('enabled').removeClass('text-danger').addClass('text-success');
            } else {
                cacheStatusSpan.text('disabled').removeClass('text-success').addClass('text-danger');
            }
        },
        init: function() {
            confirmActionModal = new bootstrap.Modal(document.getElementById('confirm-action-modal'));
            closeTradeModal = new bootstrap.Modal(document.getElementById('close-trade-modal'));
            if (localStorage.getItem('isDataManagementExpanded') === 'true') {
                new bootstrap.Collapse('#data-management-collapse', { toggle: false }).show();
            }
            if (localStorage.getItem('isSettingsExpanded') === 'true') {
                new bootstrap.Collapse('#settings-collapse', { toggle: false }).show();
            }
        }
    };

    // --- HELPERS ---
    const Helpers = {
        calculatePairRatio: function(price1, price2, ticker1) {
            if (!currentPair || !currentPair.stockATicker) return null;
            const { stockATicker } = currentPair;
            let priceA, priceB;
            if (ticker1 === stockATicker) {
                priceA = price1;
                priceB = price2;
            } else {
                priceA = price2;
                priceB = price1;
            }
            if (priceA > 0 && priceB > 0) return priceA / priceB;
            return null;
        },
        formatDateForDisplay: function(dateString) {
            if (!dateString || typeof dateString !== 'string') return 'N/A';
            const parts = dateString.split('-');
            if (parts.length !== 3) return dateString;
            const year = parseInt(parts[0], 10);
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const date = new Date(Date.UTC(year, monthIndex, day));
            if (isNaN(date.getTime())) return dateString;
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            return `${String(date.getUTCDate()).padStart(2, '0')}-${monthNames[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
        },
        calculateTradeOutcome: function(trade) {
            if (!trade || !trade.open || !trade.close) return null;

            const openLeg = trade.open;
            const closeLeg = trade.close;
            const stockATicker = currentPair.stockATicker;

            let qtyAChange = 0;
            let qtyBChange = 0;

            // Open leg effect
            if (openLeg.fromTicker === stockATicker) {
                qtyAChange -= parseFloat(openLeg.swapQty);
                qtyBChange += parseFloat(openLeg.toQty);
            } else {
                qtyBChange -= parseFloat(openLeg.swapQty);
                qtyAChange += parseFloat(openLeg.toQty);
            }

            // Close leg effect
            if (closeLeg.fromTicker === stockATicker) {
                qtyAChange -= parseFloat(closeLeg.swapQty);
                qtyBChange += parseFloat(closeLeg.toQty);
            } else {
                qtyBChange -= parseFloat(closeLeg.swapQty);
                qtyAChange += parseFloat(closeLeg.toQty);
            }

            const valueIn = parseFloat(openLeg.swapQty) * parseFloat(openLeg.fromPrice);
            const valueOut = parseFloat(closeLeg.swapQty) * parseFloat(closeLeg.fromPrice);
            const dollarChange = valueOut - valueIn;

            return { qtyAChange, qtyBChange, dollarChange };
        },
        calculateAllHoldings: function(trades) {
            const holdingsHistory = [];
            if (!currentPair) return holdingsHistory;
            let qtyA = parseFloat(currentPair.stockAInitialQty);
            let qtyB = parseFloat(currentPair.stockBInitialQty);

            const processLeg = (leg) => {
                if (!leg || !leg.fromPrice || !leg.toPrice) return;
                const ratio = parseFloat(leg.fromPrice) / parseFloat(leg.toPrice);
                const swapQty = parseFloat(leg.swapQty);
                if (leg.fromTicker === currentPair.stockATicker) {
                    qtyA -= swapQty;
                    qtyB += (swapQty * ratio);
                } else {
                    qtyB -= swapQty;
                    qtyA += (swapQty * ratio);
                }
            };

            trades.forEach(trade => {
                // New format has an 'open' property. Old format does not.
                if (trade.open) {
                    processLeg(trade.open);
                    if (trade.close) {
                        processLeg(trade.close);
                    }
                } else {
                    // Legacy format
                    processLeg(trade);
                }

                holdingsHistory.push({ qtyA: qtyA, qtyB: qtyB });
            });
            return holdingsHistory;
        },
        calculateHoldings: function(trades) {
            if (!currentPair) return { qtyA: 0, qtyB: 0 };
            if (trades.length === 0) {
                return { qtyA: parseFloat(currentPair.stockAInitialQty), qtyB: parseFloat(currentPair.stockBInitialQty) };
            }
            const history = this.calculateAllHoldings(trades);
            return history[history.length - 1];
        },
        getPerformanceMetrics: function(trades) {
            if (!currentPair || trades.length === 0) return null;
            const initialQtyA = parseFloat(currentPair.stockAInitialQty);
            const initialQtyB = parseFloat(currentPair.stockBInitialQty);

            const firstTradeOpenLeg = trades[0].open ? trades[0].open : trades[0];
            let initialPriceA, initialPriceB;
            if (firstTradeOpenLeg.fromTicker === currentPair.stockATicker) {
                initialPriceA = parseFloat(firstTradeOpenLeg.fromPrice);
                initialPriceB = parseFloat(firstTradeOpenLeg.toPrice);
            } else {
                initialPriceB = parseFloat(firstTradeOpenLeg.fromPrice);
                initialPriceA = parseFloat(firstTradeOpenLeg.toPrice);
            }

            const initialValueA = initialQtyA * initialPriceA;
            const initialValueB = initialQtyB * initialPriceB;
            const initialTotalValue = initialValueA + initialValueB;

            const finalHoldings = this.calculateHoldings(trades);
            const lastTrade = trades[trades.length - 1];
            // Use the close leg if it exists, otherwise the open leg
            const lastLeg = lastTrade.close ? lastTrade.close : (lastTrade.open ? lastTrade.open : lastTrade);

            let lastPriceA, lastPriceB;
            if (lastLeg.fromTicker === currentPair.stockATicker) {
                lastPriceA = parseFloat(lastLeg.fromPrice);
                lastPriceB = parseFloat(lastLeg.toPrice);
            } else {
                lastPriceB = parseFloat(lastLeg.fromPrice);
                lastPriceA = parseFloat(lastLeg.toPrice);
            }
            const currentValueA = finalHoldings.qtyA * lastPriceA;
            const currentValueB = finalHoldings.qtyB * lastPriceB;
            const currentTotalValue = currentValueA + currentValueB;
            const totalPL = currentTotalValue - initialTotalValue;
            const percentageGain = initialTotalValue > 0 ? (totalPL / initialTotalValue) * 100 : 0;
            return {
                initial: { qtyA: initialQtyA, qtyB: initialQtyB, valueA: initialValueA, valueB: initialValueB, totalValue: initialTotalValue },
                current: { qtyA: finalHoldings.qtyA, qtyB: finalHoldings.qtyB, valueA: currentValueA, valueB: currentValueB, totalValue: currentTotalValue },
                performance: { totalPL: totalPL, percentageGain: percentageGain }
            };
        },
        validateTradeUpdate: async function(trade, legType, field, newValue) {
            let sanitizedValue = newValue;
            if (field !== 'notes') {
                if (field === 'fromPrice' || field === 'toPrice') {
                    sanitizedValue = sanitizedValue.replace('$', '');
                }
                if (field === 'swapQty' || field === 'fromPrice' || field === 'toPrice') {
                    if (isNaN(parseFloat(sanitizedValue)) || parseFloat(sanitizedValue) <= 0) {
                        return { isValid: false, error: 'Price and quantity must be positive numbers.' };
                    }
                }
                const allTrades = await DB.getTradesByPairId(currentPair.id);
                const tradeIndex = allTrades.findIndex(t => t.id === trade.id);
                if (tradeIndex === -1) {
                    return { isValid: false, error: 'Could not find the trade to validate against.' };
                }

                // Calculate holdings before the leg being edited
                const tradesBeforeThisTrade = allTrades.slice(0, tradeIndex);
                let holdingsBeforeThisLeg;
                if (legType === 'open') {
                    holdingsBeforeThisLeg = this.calculateHoldings(tradesBeforeThisTrade);
                } else { // legType === 'close'
                    const tradesIncludingOpenLeg = [...tradesBeforeThisTrade];
                    const currentTradeWithOpenLegOnly = { ...allTrades[tradeIndex], close: null };
                    tradesIncludingOpenLeg.push(currentTradeWithOpenLegOnly);
                    holdingsBeforeThisLeg = this.calculateHoldings(tradesIncludingOpenLeg);
                }

                const leg = trade[legType];
                const fromTicker = field === 'fromTicker' ? sanitizedValue : leg.fromTicker;
                const swapQty = field === 'swapQty' ? parseFloat(sanitizedValue) : parseFloat(leg.swapQty);
                if (fromTicker === currentPair.stockATicker && swapQty > holdingsBeforeThisLeg.qtyA) {
                    return { isValid: false, error: `Swap quantity exceeds holdings for ${fromTicker} at that time.` };
                }
                if (fromTicker === currentPair.stockBTicker && swapQty > holdingsBeforeThisLeg.qtyB) {
                    return { isValid: false, error: `Swap quantity exceeds holdings for ${fromTicker} at that time.` };
                }
            }
            return { isValid: true, sanitizedValue: sanitizedValue };
        },
        validateNewPair: async function(newPair) {
            if (!newPair.pairName || !newPair.stockATicker || !newPair.stockBTicker) {
                return { isValid: false, error: 'All fields are required to create a pair.', field: 'general' };
            }
            const existingPairs = await DB.getAll(PAIRS_STORE);
            if (existingPairs.some(pair => pair.pairName === newPair.pairName)) {
                return { isValid: false, error: `A pair named "${newPair.pairName}" already exists. Please choose a unique name.`, field: 'pair-name' };
            }
            return { isValid: true };
        },
        generateExportFilename: function(pairName) {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${year}${month}${day}`;
            const safePairName = pairName.replace(/\//g, '-');
            return `${dateStr}--${safePairName}-SWAP-DB.csv`;
        },
        generateDemoTrades: function(pair) {
            const trades = [];
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 20); // Give more room for close dates

            for (let i = 0; i < 8; i++) {
                // --- Create Open Leg ---
                const openDate = new Date(startDate);
                openDate.setDate(openDate.getDate() + (i * 2)); // Space out trades
                const fromTickerOpen = (i % 2 === 0) ? pair.stockATicker : pair.stockBTicker;
                const toTickerOpen = (i % 2 === 0) ? pair.stockBTicker : pair.stockATicker;
                const swapQtyOpen = parseFloat((Math.random() * 9 + 1).toFixed(allowFractionalShares ? 4 : 0));
                const fromPriceOpen = parseFloat((80 + Math.random() * 40).toFixed(2));
                const toPriceOpen = parseFloat((80 + Math.random() * 40).toFixed(2));
                const toQtyOpen = (fromPriceOpen * swapQtyOpen) / toPriceOpen;

                const trade = {
                    pairId: pair.id,
                    status: 'open',
                    open: {
                        date: openDate.toISOString().split('T')[0],
                        fromTicker: fromTickerOpen,
                        toTicker: toTickerOpen,
                        swapQty: swapQtyOpen,
                        fromPrice: fromPriceOpen,
                        toPrice: toPriceOpen,
                        toQty: toQtyOpen,
                        notes: `Demo open leg for trade ${i + 1}`
                    },
                    close: null
                };

                // --- Create Close Leg for first 4 trades ---
                if (i < 4) {
                    const closeDate = new Date(openDate);
                    closeDate.setDate(closeDate.getDate() + 1); // Close one day after open
                    const fromTickerClose = toTickerOpen; // Swapping back
                    const toTickerClose = fromTickerOpen;
                    const swapQtyClose = toQtyOpen;
                    const fromPriceClose = parseFloat((fromPriceOpen * (1 + (Math.random() - 0.4) * 0.1)).toFixed(2)); // price moves a bit
                    const toPriceClose = parseFloat((toPriceOpen * (1 + (Math.random() - 0.4) * 0.1)).toFixed(2));
                    const toQtyClose = (fromPriceClose * swapQtyClose) / toPriceClose;

                    trade.status = 'closed';
                    trade.close = {
                        date: closeDate.toISOString().split('T')[0],
                        fromTicker: fromTickerClose, toTicker: toTickerClose, swapQty: swapQtyClose,
                        fromPrice: fromPriceClose, toPrice: toPriceClose, toQty: toQtyClose,
                        notes: `Demo close leg for trade ${i + 1}`
                    };
                }
                trades.push(trade);
            }
            return trades;
        },
        validateNewTrade: async function() {
            if (!UI.validateRow()) {
                return { isValid: false, error: 'Please fill all required fields with valid positive numbers.' };
            }
            const allTrades = await DB.getTradesByPairId(currentPair.id);
            const holdingsBefore = this.calculateHoldings(allTrades);
            const direction = $('#new-direction').val();
            const fromTicker = direction === 'A_TO_B' ? currentPair.stockATicker : currentPair.stockBTicker;
            const toTicker = direction === 'A_TO_B' ? currentPair.stockBTicker : currentPair.stockATicker;
            const newSwapQty = parseFloat($('#new-swap-qty').val());
            const qtyDisplayFormat = { minimumFractionDigits: 0, maximumFractionDigits: allowFractionalShares ? 4 : 0 };
            if (fromTicker === currentPair.stockATicker && newSwapQty > holdingsBefore.qtyA) {
                $('#new-swap-qty').addClass('is-invalid');
                return { isValid: false, error: `Swap quantity (${newSwapQty.toLocaleString(undefined, qtyDisplayFormat)}) cannot exceed current holding of ${currentPair.stockATicker} (${holdingsBefore.qtyA.toLocaleString(undefined, qtyDisplayFormat)}).` };
            }
            if (fromTicker === currentPair.stockBTicker && newSwapQty > holdingsBefore.qtyB) {
                $('#new-swap-qty').addClass('is-invalid');
                return { isValid: false, error: `Swap quantity (${newSwapQty.toLocaleString(undefined, qtyDisplayFormat)}) cannot exceed current holding of ${currentPair.stockBTicker} (${holdingsBefore.qtyB.toLocaleString(undefined, qtyDisplayFormat)}).` };
            }
            let swapQty = $('#new-swap-qty').val();
            if (!allowFractionalShares) {
                swapQty = Math.floor(parseFloat(swapQty)).toString();
            }
            const fromPrice = parseFloat($('#new-from-price').val());
            const toPriceVal = $('#new-to-price').val();
            const toPrice = parseFloat(toPriceVal);
            const calculatedToQty = (fromPrice * parseFloat(swapQty)) / toPrice;

            return {
                isValid: true,
                trade: { // New Round-Trip Trade Structure
                    pairId: currentPair.id,
                    status: 'open',
                    open: {
                        date: $('#new-date').val(),
                        swapQty: swapQty,
                        fromTicker: fromTicker,
                        fromPrice: $('#new-from-price').val(),
                        toTicker: toTicker,
                        toPrice: toPriceVal,
                        toQty: calculatedToQty,
                        notes: '' // Notes are now added after creation via the icon
                    },
                    close: null
                }
            };
        }
    };

    // --- MAIN APP LOGIC & EVENT HANDLERS ---
    const App = {
        runDatabaseHealthCheck: async function() {
            try {
                console.log("Running database health check...");
                const allPairs = await DB.getAll(PAIRS_STORE);
                const allTrades = await DB.getAll(TRADES_STORE);
                const validPairIds = new Set(allPairs.map(p => p.id));
                const orphanedTrades = allTrades.filter(t => !validPairIds.has(t.pairId));

                if (orphanedTrades.length > 0) {
                    console.warn(`Found ${orphanedTrades.length} orphaned trade(s). Cleaning them up.`);
                    const deletePromises = orphanedTrades.map(t => DB.delete(TRADES_STORE, t.id));
                    await Promise.all(deletePromises);
                    UI.showToast('Data Integrity', `Removed ${orphanedTrades.length} orphaned trade(s).`, true);
                } else {
                    console.log("Database health check passed. No orphaned trades found.");
                }
            } catch (error) {
                console.error("Database health check failed:", error);
            }
        },
        init: async function() {
            // Load shared components first
            $("#header-placeholder").load("/trading/assets/includes/_header.html", function() {
                if (typeof initializeHeader === 'function') {
                    initializeHeader();
                }
            });
            $("#navbar-placeholder").load("/trading/assets/includes/_navbar.html");
            $("#footer-placeholder").load("/trading/assets/includes/_footer.html");

            allowFractionalShares = localStorage.getItem('allowFractionalShares') === 'true';
            $('#fractional-shares-switch').prop('checked', allowFractionalShares);
            UI.updateNumberInputs();
            try {
                await DB.init();
                await this.runDatabaseHealthCheck();
                UI.init();
                UI.updateCacheStatusIndicator();
                await this.loadPairs();
                this.bindEvents();
            } catch (error) {
                console.error("Failed to initialize the application:", error);
                UI.showToast('Initialization Failed', 'Could not load database. Please refresh.', true);
            }
        },
        loadPairs: async function() {
            const pairs = await DB.getAll(PAIRS_STORE);
            UI.populatePairSelector(pairs);
            if (pairs.length > 0) {
                const lastSelectedPairId = localStorage.getItem('lastSelectedPairId') || pairs[0].id;
                $('#pair-selector').val(lastSelectedPairId);
            }
            await this.loadPairData();
        },
        loadPairData: async function() {
            const selectedIdStr = $('#pair-selector').val();
            if (!selectedIdStr || selectedIdStr === 'No pairs created') {
                UI.showMainContent(false);
                UI.renderCurrentHoldings(null);
                return;
            }
            const selectedId = parseInt(selectedIdStr);
            localStorage.setItem('lastSelectedPairId', selectedId);
            const pairs = await DB.getAll(PAIRS_STORE);
            currentPair = pairs.find(p => p.id === selectedId);
            if (currentPair) {
                UI.showMainContent(true);
                $('#config-stock-a-label').text(`${currentPair.stockATicker} Initial Qty`);
                $('#config-stock-a-qty').val(currentPair.stockAInitialQty).prop('readonly', true);
                $('#config-stock-b-label').text(`${currentPair.stockBTicker} Initial Qty`);
                $('#config-stock-b-qty').val(currentPair.stockBInitialQty).prop('readonly', true);
                const trades = await DB.getTradesByPairId(currentPair.id);
                const finalHoldings = Helpers.calculateHoldings(trades);
                UI.renderCurrentHoldings(finalHoldings);
                UI.renderTradeLog(trades);
                UI.renderNewTradeRow();
                UI.renderPerformance(trades);
            } else {
                UI.showMainContent(false);
                UI.renderCurrentHoldings(null);
            }
        },
        saveNewPair: async function() {
            let qtyA = $('#stock-a-initial-qty').val().trim();
            let qtyB = $('#stock-b-initial-qty').val().trim();

            // Basic validation and default to 0 if empty or invalid
            qtyA = (qtyA === '' || isNaN(parseFloat(qtyA)) || parseFloat(qtyA) < 0) ? '0' : qtyA;
            qtyB = (qtyB === '' || isNaN(parseFloat(qtyB)) || parseFloat(qtyB) < 0) ? '0' : qtyB;

            // Handle fractional shares setting
            if (!allowFractionalShares) {
                qtyA = Math.floor(parseFloat(qtyA)).toString();
                qtyB = Math.floor(parseFloat(qtyB)).toString();
            }

            const newPair = {
                pairName: $('#pair-name').val().trim().toUpperCase(),
                stockATicker: $('#stock-a-ticker').val().trim().toUpperCase(),
                stockBTicker: $('#stock-b-ticker').val().trim().toUpperCase(),
                stockAInitialQty: qtyA,
                stockBInitialQty: qtyB
            };
            $('#pair-name').removeClass('is-invalid');
            const validationResult = await Helpers.validateNewPair(newPair);
            if (!validationResult.isValid) {
                UI.showToast('Validation Error', validationResult.error, true);
                if (validationResult.field === 'pair-name') {
                    $('#pair-name').addClass('is-invalid');
                }
                return;
            }
            const newId = await DB.add(PAIRS_STORE, newPair);
            newPair.id = newId;
            const addDemoData = $('#add-demo-data-checkbox').is(':checked');
            if (addDemoData) {
                newPair.stockAInitialQty = '100';
                newPair.stockBInitialQty = '100';
                await DB.put(PAIRS_STORE, newPair);
                const demoTrades = Helpers.generateDemoTrades(newPair);
                await DB.bulkAdd(TRADES_STORE, demoTrades);
            }
            bootstrap.Modal.getInstance($('#pair-config-modal')).hide();
            await this.loadPairs();
            $('#pair-selector').val(newId);
            await this.loadPairData();
            UI.showToast('Success', `Pair "${newPair.pairName}" created successfully.`);
        },
        saveNewTrade: async function() {
            const validationResult = await Helpers.validateNewTrade();
            if (!validationResult.isValid) {
                UI.showToast('Validation Error', validationResult.error, true);
                return;
            }
            await DB.add(TRADES_STORE, validationResult.trade);
            await this.loadPairData();
            UI.showToast('Success', 'Trade logged successfully.');
        },
        openCloseTradeModal: async function(tradeId) {
            const trade = await DB.get(TRADES_STORE, tradeId);
            if (!trade || !trade.open) {
                UI.showToast('Error', 'Could not find the trade to close.', true);
                return;
            }
            let fromQty = trade.open.toQty;
            if (!allowFractionalShares) {
                fromQty = Math.floor(fromQty);
            }
            $('#close-trade-id').val(trade.id);
            $('#close-date').val(new Date().toISOString().split('T')[0]);
            $('#close-from-ticker-label').text(trade.open.toTicker);
            $('#close-from-qty').val(fromQty);
            $('#close-to-ticker-label').text(trade.open.fromTicker);
            $('#close-from-price, #close-to-price').val('');
            $('#close-trade-ratio').html('&nbsp;');
            $('#close-trade-form .is-invalid').removeClass('is-invalid');
            closeTradeModal.show();
        },
        saveClosedTrade: async function() {
            try {
                const tradeId = parseInt($('#close-trade-id').val());
                const closeDate = $('#close-date').val();
                const fromQty = parseFloat($('#close-from-qty').val());
                const fromPrice = parseFloat($('#close-from-price').val());
                const toPrice = parseFloat($('#close-to-price').val());
                let isValid = true;
                if (!closeDate) { $('#close-date').addClass('is-invalid'); isValid = false; }
                if (isNaN(fromQty) || fromQty <= 0) { $('#close-from-qty').addClass('is-invalid'); isValid = false; }
                if (isNaN(fromPrice) || fromPrice <= 0) { $('#close-from-price').addClass('is-invalid'); isValid = false; }
                if (isNaN(toPrice) || toPrice <= 0) { $('#close-to-price').addClass('is-invalid'); isValid = false; }
                if (!isValid) {
                    UI.showToast('Validation Error', 'Please fill all fields with valid positive numbers.', true);
                    return;
                }
                const trade = await DB.get(TRADES_STORE, tradeId);
                if (!trade) {
                    UI.showToast('Error', 'Could not find original trade.', true);
                    return;
                }
                const calculatedToQty = (fromPrice * fromQty) / toPrice;
                trade.status = 'closed';
                trade.close = {
                    date: closeDate, fromTicker: trade.open.toTicker, swapQty: fromQty,
                    fromPrice: fromPrice, toTicker: trade.open.fromTicker, toPrice: toPrice,
                    toQty: calculatedToQty, notes: ''
                };
                await DB.put(TRADES_STORE, trade);
                closeTradeModal.hide();
                await this.loadPairs(); // Use the master refresh function for robustness
                UI.showToast('Success', 'Trade successfully closed.');
            } catch (error) {
                console.error("Failed to save closed trade:", error);
                UI.showToast('Error', 'An unexpected error occurred while closing the trade.', true);
            }
        },
        actionHandlers: {
            'clear-log': async function() {
                if (!currentPair) return;
                try {
                    await DB.clearTradesForPair(currentPair.id);
                    await App.loadPairData();
                    UI.showToast('Success', `All trades for "${currentPair.pairName}" have been cleared.`);
                } catch (error) {
                    UI.showToast('Error', 'Failed to clear trade log.', true);
                    console.error('Clear trade log error:', error);
                }
            },
            'clear-db': async function() {
                try {
                    await DB.clearAllData();
                    currentPair = null;
                    localStorage.clear();
                    $('#fractional-shares-switch').prop('checked', false);
                    allowFractionalShares = false;
                    await App.loadPairs();
                    UI.showToast('Success', 'All application data has been cleared.');
                } catch (error) {
                    UI.showToast('Error', 'Failed to clear the database.', true);
                    console.error('Clear database error:', error);
                }
            },
            'add-demo-data': async function() {
                if (!currentPair) return;
                try {
                    currentPair.stockAInitialQty = '100';
                    currentPair.stockBInitialQty = '100';
                    await DB.put(PAIRS_STORE, currentPair);
                    const demoTrades = Helpers.generateDemoTrades(currentPair);
                    await DB.bulkAdd(TRADES_STORE, demoTrades);
                    await App.loadPairData();
                    UI.showToast('Success', `Demo data added to "${currentPair.pairName}".`);
                } catch (error) {
                    UI.showToast('Error', 'Failed to add demo data.', true);
                    console.error('Add demo data error:', error);
                }
            },
            'delete-pair': async function() {
                if (!currentPair) return;
                try {
                    await DB.deletePairAndTrades(currentPair.id);
                    currentPair = null;
                    localStorage.removeItem('lastSelectedPairId');
                    await App.loadPairs();
                    UI.showToast('Success', 'Pair deleted successfully.');
                } catch (error) {
                    UI.showToast('Error', 'Failed to delete pair.', true);
                    console.error('Delete pair error:', error);
                }
            },
            'delete-trade': async function() {
                const tradeId = parseInt($('#confirm-action-modal').data('tradeId'));
                if (isNaN(tradeId)) return;
                try {
                    await DB.delete(TRADES_STORE, tradeId);
                    await App.loadPairData();
                    UI.showToast('Success', 'Trade deleted successfully.');
                } catch (error) {
                    UI.showToast('Error', 'Failed to delete trade.', true);
                    console.error('Delete trade error:', error);
                }
            },
        },
        handleConfirmAction: async function() {
            const action = $('#confirm-action-modal').data('action');
            confirmActionModal.hide();
            const handler = this.actionHandlers[action];
            if (handler) {
                await handler.call(this);
            }
        },
        confirmHistoricTradeUpdate: function() {
            return new Promise(resolve => {
                const modal = $('#confirm-action-modal');
                const confirmBtn = modal.find('#confirm-action-btn');
                modal.find('#confirm-action-modal-title').text('Confirm Trade Update');
                modal.find('#confirm-action-modal-body').html('<p>Are you sure you want to update the existing trade details?</p><p class="text-muted small">Updating an historic trade will change the Outcome and Performance metrics.</p>');
                confirmBtn.text('Confirm').removeClass('btn-danger').addClass('btn-primary');
                const onConfirm = () => {
                    cleanup();
                    resolve(true);
                };
                const onCancel = () => {
                    cleanup();
                    resolve(false);
                };
                const cleanup = () => {
                    confirmBtn.off('click', onConfirm);
                    modal.off('hidden.bs.modal', onCancel);
                    confirmActionModal.hide();
                };
                confirmBtn.one('click', onConfirm);
                modal.one('hidden.bs.modal', onCancel);
                confirmActionModal.show();
            });
        },
        handleTradeUpdate: async function(inputElement) {
            const $input = $(inputElement);
            const $row = $input.closest('tr');
            let tradeId, field, legType;
            if ($row.hasClass('notes-row')) {
                tradeId = $row.data('notes-for-trade-id');
                legType = $row.data('leg-type');
                field = $input.data('field');
            } else {
                const $cell = $input.closest('td');
                tradeId = $row.data('trade-id');
                legType = $row.data('leg-type');
                field = $cell.data('field');
            }
            const newValue = $input.val();
            const trade = await DB.get(TRADES_STORE, tradeId);

            if (!trade || !trade[legType]) {
                return this.loadPairData();
            }
            const leg = trade[legType];

            if (newValue == leg[field]) {
                return this.loadPairData();
            }

            const allTrades = await DB.getTradesByPairId(currentPair.id);
            const latestTrade = allTrades.length > 0 ? allTrades[allTrades.length - 1] : null;
            let isHistoric = true;
            if (latestTrade && trade.id === latestTrade.id) {
                if (legType === 'open' && !latestTrade.close) { isHistoric = false; }
                else if (legType === 'close') { isHistoric = false; }
            }

            if (isHistoric) {
                const confirmed = await this.confirmHistoricTradeUpdate();
                if (!confirmed) {
                    return this.loadPairData();
                }
            }
            const validationResult = await Helpers.validateTradeUpdate(trade, legType, field, newValue);
            if (!validationResult.isValid) {
                UI.showToast('Validation Error', validationResult.error, true);
                return this.loadPairData();
            }
            leg[field] = validationResult.sanitizedValue;
            if (field === 'fromTicker') {
                leg.toTicker = (leg.fromTicker === currentPair.stockATicker) ? currentPair.stockBTicker : currentPair.stockATicker;
            }
            if (['fromPrice', 'swapQty', 'toPrice'].includes(field)) {
                leg.toQty = (parseFloat(leg.fromPrice) * parseFloat(leg.swapQty)) / parseFloat(leg.toPrice);
            }
            await DB.put(TRADES_STORE, trade);
            await this.loadPairData();
            UI.showToast('Success', 'Trade updated successfully.');
        },
        updateInitialQuantity: async function(inputElement) {
            const $input = $(inputElement);
            $input.prop('readonly', true);
            let newValue = $input.val();
            const stockId = $input.attr('id') === 'config-stock-a-qty' ? 'A' : 'B';
            const originalValue = stockId === 'A' ? currentPair.stockAInitialQty : currentPair.stockBInitialQty;
            if (newValue === '' || isNaN(parseFloat(newValue)) || parseFloat(newValue) < 0) {
                UI.showToast('Invalid Input', 'Initial quantity must be a non-negative number.', true);
                $input.val(originalValue);
                return;
            }
            if (!allowFractionalShares) {
                newValue = Math.floor(parseFloat(newValue)).toString();
            }
            if (newValue === originalValue) {
                return;
            }
            if (stockId === 'A') {
                currentPair.stockAInitialQty = newValue;
            } else {
                currentPair.stockBInitialQty = newValue;
            }
            try {
                await DB.put(PAIRS_STORE, currentPair);
                UI.showToast('Success', 'Initial quantity updated.');
                await this.loadPairData();
            } catch (error) {
                UI.showToast('Database Error', 'Could not save changes.', true);
                console.error("Failed to update pair:", error);
                $input.val(originalValue);
            }
        },
        exportToCSV: async function() {
            if (!currentPair) return;
            const trades = await DB.getTradesByPairId(currentPair.id);
            if (trades.length === 0) {
                UI.showToast('Export Failed', 'No trades to export for this pair.', true);
                return;
            }
            let csvContent = "data:text/csv;charset=utf-8,";
            const headers = ["Trade ID", "Leg", "Date", "From Ticker", "From Qty", "From Price", "To Ticker", "To Qty", "To Price", "Notes"];
            csvContent += headers.join(",") + "\r\n";

            const formatLegForCSV = (tradeId, legType, leg) => {
                if (!leg) return [];
                // Ensure notes are properly quoted to handle commas and newlines
                const notes = `"${(leg.notes || '').replace(/"/g, '""')}"`;
                return [
                    tradeId, legType, leg.date, leg.fromTicker, leg.swapQty,
                    leg.fromPrice, leg.toTicker, leg.toQty.toFixed(8), leg.toPrice, notes
                ];
            };

            trades.forEach(trade => {
                if (trade.open) {
                    const openLegRow = formatLegForCSV(trade.id, 'open', trade.open);
                    csvContent += openLegRow.join(",") + "\r\n";
                }
                if (trade.close) {
                    const closeLegRow = formatLegForCSV(trade.id, 'close', trade.close);
                    csvContent += closeLegRow.join(",") + "\r\n";
                }
            });

            const filename = Helpers.generateExportFilename(currentPair.pairName);
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            UI.showToast('Success', 'Trade log exported.');
        },
        importFromCSV: function(event) {
            if (!currentPair) {
                UI.showToast('Import Failed', 'Please select a pair before importing.', true);
                return;
            }
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target.result;
                const rows = text.split('\n').slice(1);
                const tradesToImport = [];
                for (const row of rows) {
                    if (row.trim() === '') continue;
                    const cols = row.split(',');
                    if (cols.length < 9) {
                        UI.showToast('Import Error', `Skipping invalid row: ${row}`, true);
                        continue;
                    }
                    const trade = {
                        pairId: currentPair.id,
                        date: cols[0],
                        fromTicker: cols[1],
                        swapQty: cols[2],
                        fromPrice: cols[3],
                        toTicker: cols[4],
                        toPrice: cols[6],
                        notes: (cols[7] || '').replace(/"/g, ''),
                        isComplete: (cols[8] || '').trim() === 'true'
                    };
                    tradesToImport.push(trade);
                }
                if (tradesToImport.length > 0) {
                    try {
                        await DB.bulkAdd(TRADES_STORE, tradesToImport);
                        await this.loadPairData();
                        UI.showToast('Success', `${tradesToImport.length} trades imported successfully.`);
                    } catch (error) {
                        UI.showToast('Import Failed', 'An error occurred during the database transaction.', true);
                    }
                }
                $('#import-csv-input').val('');
            };
            reader.readAsText(file);
        },
        toggleFractionalShares: function() {
            allowFractionalShares = $('#fractional-shares-switch').is(':checked');
            localStorage.setItem('allowFractionalShares', allowFractionalShares);
            UI.updateNumberInputs();
            if (currentPair) {
                this.loadPairData();
            }
        },
        bindPairEvents: function() {
            const newPairModal = $('#pair-config-modal');

            newPairModal.on('show.bs.modal', function() {
                // Reset the form and the manual edit flag each time the modal is shown
                $('#new-pair-form')[0].reset();
                isPairNameManuallyEdited = false;
                $('#pair-name').removeClass('is-invalid');
            });

            const updatePairName = () => {
                if (isPairNameManuallyEdited) return;
                const stockA = $('#stock-a-ticker').val().trim().toUpperCase();
                const stockB = $('#stock-b-ticker').val().trim().toUpperCase();
                let pairName = stockA;
                if (stockB) {
                    pairName += `/${stockB}`;
                }
                $('#pair-name').val(pairName);
            };

            newPairModal.on('input', '#stock-a-ticker, #stock-b-ticker', updatePairName);

            newPairModal.on('input', '#pair-name', () => { isPairNameManuallyEdited = true; });

            newPairModal.on('click', '#reset-pair-name-btn', () => {
                isPairNameManuallyEdited = false;
                updatePairName();
            });

            $('#save-pair-btn').on('click', this.saveNewPair.bind(this));
            $('#pair-selector').on('change', this.loadPairData.bind(this));
            $('#delete-pair-btn').on('click', function() {
                if (!currentPair) {
                    UI.showToast('Action Failed', 'No pair is currently selected to delete.', true);
                    return;
                }
                $('#confirm-action-modal-title').text('Confirm Pair Deletion');
                $('#confirm-action-modal-body').html(`<p>Are you sure you want to delete the <strong>${currentPair.pairName}</strong> pair and all of its associated trades?</p><p class="text-danger">This action is permanent and cannot be undone.</p>`);
                $('#confirm-action-modal').data('action', 'delete-pair');
                confirmActionModal.show();
            });
            $('#pair-configuration').on('dblclick', 'input[type="number"]', function() {
                $(this).prop('readonly', false).focus().select();
            });
            $('#pair-configuration').on('blur', 'input[type="number"]', (e) => {
                if (!$(e.currentTarget).prop('readonly')) {
                    this.updateInitialQuantity(e.currentTarget);
                }
            });
            $('#pair-configuration').on('keydown', 'input[type="number"]', (e) => {
                if (e.key === 'Enter') {
                    $(e.currentTarget).blur();
                }
            });
        },
        bindTradeLogEvents: function() {
            const tradeLogBody = $('#trade-log-body');

            // Prevent focus on non-interactive icons by stopping the default mousedown action.
            tradeLogBody.on('mousedown', '.non-interactive-icon', function(e) {
                e.preventDefault();
            });

            // --- Grouped Row Hover Effect ---
            // When the mouse enters any row of a trade, add a hover class to all rows of that trade.
            tradeLogBody.on('mouseenter', 'tr.leg-row, tr.notes-row', function() {
                const tradeId = $(this).data('trade-id') || $(this).data('notes-for-trade-id');
                if (tradeId) {
                    $(`tr[data-trade-id="${tradeId}"], tr[data-notes-for-trade-id="${tradeId}"]`).addClass('trade-hover');
                }
            }).on('mouseleave', 'tr.leg-row, tr.notes-row', function() {
                // When the mouse leaves, remove the hover class from all rows of that trade.
                const tradeId = $(this).data('trade-id') || $(this).data('notes-for-trade-id');
                if (tradeId) {
                    $(`tr[data-trade-id="${tradeId}"], tr[data-notes-for-trade-id="${tradeId}"]`).removeClass('trade-hover');
                }
            });

            $(document).on('click', '#date-header', () => {
                UI.dateSortOrder = UI.dateSortOrder === 'asc' ? 'desc' : 'asc';
                this.loadPairData();
            });

            tradeLogBody.on('click', '.toggle-notes-btn', function() {
                const $row = $(this).closest('tr');
                const tradeId = $row.data('trade-id');
                const $notesRow = $(`tr[data-notes-for-trade-id="${tradeId}"]`);

                // Toggle the visibility of the notes row first
                $notesRow.toggleClass('d-none');
            });

            tradeLogBody.on('dblclick', 'textarea.notes-editor', function() {
                const $textarea = $(this);
                $textarea.prop('readonly', false).focus();
                this.selectionStart = this.selectionEnd = this.value.length;
                const $cell = $textarea.closest('td');
                $cell.find('.edit-note-helper').remove();
                $cell.append('<div class="form-text mt-1 edit-note-helper">Press Enter to save, or Esc to cancel.</div>');
            });
            tradeLogBody.on('blur', 'textarea.notes-editor', (e) => {
                if (!$(e.currentTarget).prop('readonly')) {
                    App.handleTradeUpdate(e.currentTarget);
                }
            });
            tradeLogBody.on('keydown', 'textarea.notes-editor', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    $(e.currentTarget).blur();
                }
                if (e.key === 'Escape') {
                    App.loadPairData();
                }
            });
            tradeLogBody.on('dblclick', '.editable-cell', async function() {
                const $cell = $(this);
                if ($cell.find('input, select').length > 0) return;
                const $row = $cell.closest('tr');
                const tradeId = $row.data('trade-id');
                const legType = $row.data('leg-type');
                const field = $cell.data('field');
                const trade = await DB.get(TRADES_STORE, tradeId);
                if (!trade || !trade[legType]) return;

                const leg = trade[legType];
                const currentValue = leg[field];
                const inputHtml = UI.createCellEditor(field, currentValue);
                $cell.html(inputHtml);
                const $input = $cell.find('input, select');
                $input.focus().select();
                $input.on('blur', () => App.handleTradeUpdate($input[0]));
                $input.on('keydown', (e) => {
                    if (e.key === 'Enter') $input.blur();
                    if (e.key === 'Escape') App.loadPairData();
                });
            });
            tradeLogBody.on('click', '.delete-trade-btn', function() {
                const tradeId = $(this).closest('tr').data('trade-id');
                $('#confirm-action-modal-title').text('Confirm Round-Trip Deletion');
                $('#confirm-action-modal-body').html('<p>Are you sure you want to delete this entire round-trip trade? This action is permanent and cannot be undone.</p>');
                $('#confirm-action-modal').data('action', 'delete-trade').data('tradeId', tradeId);
                confirmActionModal.show();
            });
            tradeLogBody.on('change', '.swap-back-toggle', async function() {
                const checkbox = this;
                const tradeId = $(checkbox).data('trade-id');
                const isNowComplete = $(checkbox).is(':checked');
                try {
                    const trade = await DB.get(TRADES_STORE, tradeId);
                    if (trade) {
                        trade.isComplete = isNowComplete;
                        await DB.put(TRADES_STORE, trade);
                        await App.loadPairData();
                        const toastMessage = isNowComplete ? 'Trade marked as complete.' : 'Trade status reset to incomplete.';
                        UI.showToast('Success', toastMessage);
                    }
                } catch (error) {
                    console.error('Failed to update trade status:', error);
                    UI.showToast('Error', 'Could not update trade status.', true);
                    $(checkbox).prop('checked', !isNowComplete);
                }
            });

            tradeLogBody.on('click', '.close-trade-btn', function() {
                const tradeId = $(this).closest('tr').data('trade-id');
                App.openCloseTradeModal(tradeId);
            });
        },
        bindNewTradeRowEvents: function() {
            const newTradeRow = $('#new-trade-body');
            newTradeRow.on('click', '#save-trade-btn', this.saveNewTrade.bind(this));
            newTradeRow.on('input', '#new-from-price, #new-to-price, #new-swap-qty', UI.updateCalculatedFields.bind(UI));
            newTradeRow.on('change', '#new-direction', function() {
                UI.updateNewTradeHeaders($(this).val());
                UI.updateCalculatedFields();
            });
        },
        bindModalAndConfirmationEvents: function() {
            $('#confirm-action-btn').on('click', this.handleConfirmAction.bind(this));
            $('#confirm-close-trade-btn').on('click', this.saveClosedTrade.bind(this));
            $('#close-trade-modal').on('input', '#close-from-price, #close-to-price', UI.updateCloseTradeRatio.bind(UI));
        },
        bindSettingsAndDataManagementEvents: function() {
            $('#export-csv-btn').on('click', this.exportToCSV.bind(this));
            $('#import-csv-input').on('change', this.importFromCSV.bind(this));
            $('#fractional-shares-switch').on('change', this.toggleFractionalShares.bind(this));
            $('#data-management-collapse, #settings-collapse').on('shown.bs.collapse hidden.bs.collapse', () => {
                localStorage.setItem('isDataManagementExpanded', $('#data-management-collapse').hasClass('show'));
                localStorage.setItem('isSettingsExpanded', $('#settings-collapse').hasClass('show'));
            });
            $('#add-demo-data-btn').on('click', function() {
                if (!currentPair) return;
                $('#confirm-action-modal-title').text('Add Demo Data');
                $('#confirm-action-modal-body').html(`<p>Are you sure you want to add demo trades to the <strong>${currentPair.pairName}</strong> pair?</p><p class="text-muted">This will also reset the initial quantities for this pair to 100.</p>`);
                $('#confirm-action-modal').data('action', 'add-demo-data');
                confirmActionModal.show();
            });
            $('#clear-log-btn').on('click', function() {
                if (currentPair) {
                    $('#confirm-action-modal-title').text('Clear Trade Log');
                    $('#confirm-action-modal-body').html(`<p>Are you sure you want to clear all trades for the <strong>${currentPair.pairName}</strong> pair?</p><p class="text-danger">This action cannot be undone.</p>`);
                    $('#confirm-action-modal').data('action', 'clear-log');
                    confirmActionModal.show();
                }
            });
            $('#clear-db-btn').on('click', function() {
                $('#confirm-action-modal-title').text('Clear Entire Database');
                $('#confirm-action-modal-body').html(`<p>Are you sure you want to delete <strong>ALL</strong> pairs and trades from the database?</p><p class="text-danger">This action is permanent and cannot be undone.</p>`);
                $('#confirm-action-modal').data('action', 'clear-db');
                confirmActionModal.show();
            });
        },
        bindEvents: function() {
            this.bindPairEvents();
            this.bindTradeLogEvents();
            this.bindNewTradeRowEvents();
            this.bindModalAndConfirmationEvents();
            this.bindSettingsAndDataManagementEvents();
        }
    };

    // --- INITIALIZE APP ---
    App.init();
});