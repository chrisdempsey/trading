// This Pine Script™ code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// @version=6
// Author: @67-25
//
// This script plots horizontal lines for price targets.
// Analyst price targets are pre-defined from public sources.
// User defined targets can be added based on your own targets.
// send a essage via Discord if you want the script to be updated with a specific price target or you notice an error.
// feature bug - if price targets arew significantly higher than the current price some TradingViuew features may not work properly
//    - double click the price scale to fit the data to the current screen availability
//    - auto fit chart data 
//    workaround
//    - use the label offset setting to move the labels off to the right
//    - the chart behaves normally until you scroll to future dates
//        - at this point the chart will auto scale and the candles may compress to the bottom of the screen but the Price Target labels become visible and are positioned correctly
//    - there is currently no known fix for this intentional behavior, any fix is a hack that is worse than the current behavior



// 1. SCRIPT SETUP
// ----------------
indicator("67-25 - Price Targets (Analysts and User Defined)", "67-25 - Price Targets", overlay=true, scale = scale.right)


// 2. USER INPUTS
// --------------------------------
// --- Configuration ---
var G_CONFIG = "Configuration"
i_showTargets = input.bool(true, "Display Price Targets", group = G_CONFIG, tooltip = "Master toggle for all price target lines and labels.")
i_useArrayTargets = input.bool(true, "Show Analyst Targets", group = G_CONFIG, tooltip = "Shows targets from various analysts that are included with the indicator.")
i_useUserTargets = input.bool(false, "Show User Targets", group = G_CONFIG, tooltip = "Include the targets entered manually below.")
i_showLines = input.bool(true, "Show Price Lines", group = G_CONFIG, tooltip = "Toggle the visibility of the horizontal price lines.")

// --- Label Content ---
var G_LABELS = "Label Content"
i_showPrice   = input.bool(true, "Price", group = G_LABELS, inline = "row1")
i_showText    = input.bool(true, "Text", group = G_LABELS, inline = "row1")
i_showAnalyst = input.bool(true, "Analyst", group = G_LABELS, inline = "row1")
i_textSize   = input.string(size.small, "Text Size", group = G_LABELS, options = [size.tiny, size.small, size.normal, size.large, size.huge])

// --- Positioning ---
var G_POS = "Positioning"
i_labelOffset = input.int(21, "Label offset (bars)", minval = 1, group = G_POS, tooltip = "Offset the labels by the specified number of bars to the right. Useful if they interfere with other indicators.")

// --- Default Styles ---
var G_STYLE_DEFAULT = "Default Styles (for hardcoded targets)"
i_default_lineColor  = input.color(color.new(#1848CC, 25), "Lines", group = G_STYLE_DEFAULT, inline = "style1")
i_default_labelColor = input.color(color.new(#0C3299, 25), "Label BG", group = G_STYLE_DEFAULT, inline = "style1")
i_default_textColor  = input.color(color.new(#EBEBEB, 0), "Text", group = G_STYLE_DEFAULT, inline = "style1")

// --- User Styles ---
var G_STYLE_USER = "User Styles (for user defined targets)"
i_user_lineColor  = input.color(color.new(#1848CC, 25), "Lines", group = G_STYLE_USER, inline = "style2")
i_user_labelColor = input.color(color.new(#0C3299, 25), "Label BG", group = G_STYLE_USER, inline = "style2")
i_user_textColor  = input.color(color.new(#EBEBEB, 0), "Text", group = G_STYLE_USER, inline = "style2")

// --- User Defined Targets ---
var G_USER = "User Defined Targets (up to 6)"
// -- Target 1 --
i_userPrice1   = input.float(0.0, "Price", group = G_USER, inline = "user_target_1", minval = 0)
i_userText1    = input.string("", "Note", group = G_USER, inline = "user_target_1")
i_userAnalyst1 = input.string("", "Analyst", group = G_USER, inline = "user_target_1")
// -- Target 2 --
i_userPrice2   = input.float(0.0, "Price", group = G_USER, inline = "user_target_2", minval = 0)
i_userText2    = input.string("", "Note", group = G_USER, inline = "user_target_2")
i_userAnalyst2 = input.string("", "Analyst", group = G_USER, inline = "user_target_2")
// -- Target 3 --
i_userPrice3   = input.float(0.0, "Price", group = G_USER, inline = "user_target_3", minval = 0)
i_userText3    = input.string("", "Note", group = G_USER, inline = "user_target_3")
i_userAnalyst3 = input.string("", "Analyst", group = G_USER, inline = "user_target_3")
// -- Target 4 --
i_userPrice4   = input.float(0.0, "Price", group = G_USER, inline = "user_target_4", minval = 0)
i_userText4    = input.string("", "Note", group = G_USER, inline = "user_target_4")
i_userAnalyst4 = input.string("", "Analyst", group = G_USER, inline = "user_target_4")
// -- Target 5 --
i_userPrice5   = input.float(0.0, "Price", group = G_USER, inline = "user_target_5", minval = 0)
i_userText5    = input.string("", "Note", group = G_USER, inline = "user_target_5")
i_userAnalyst5 = input.string("", "Analyst", group = G_USER, inline = "user_target_5")
// -- Target 6 --
i_userPrice6   = input.float(0.0, "Price", group = G_USER, inline = "user_target_6", minval = 0)
i_userText6    = input.string("", "Note", group = G_USER, inline = "user_target_6")
i_userAnalyst6 = input.string("", "Analyst", group = G_USER, inline = "user_target_6")


// 3. DATA STRUCTURE & POPULATION
// ------------------------------
type PriceTarget
    string ticker
    float  price
    string label
    string analyst_name
    string source

var priceTargets = array.new<PriceTarget>()




// 3.1 analyst price targets
// ------------------------------
if barstate.isfirst
    if i_useArrayTargets
        // Stocks
        // -------

        // CLSK
        array.push(priceTargets, PriceTarget.new("CLSK", 21.88, "2025 Price Target (High $30, Avg $21.88, Low $10.50)", "Cantor Fitzgerald)", "default"))
        array.push(priceTargets, PriceTarget.new("CLSK", 23.00, "2025 Price Target", "6 Analyst Consensus)", "default"))
        // HIVE
        array.push(priceTargets, PriceTarget.new("HIVE", 6.30, "2025 Price Target (High $9, Avg $6.30, Low $5.00)", "Analyst Consensus)", "default"))   
        // MSTR
        array.push(priceTargets, PriceTarget.new("MSTR", 600.00, "2025 Price Target", "Bernstein", "default"))
        // TSLA
        array.push(priceTargets, PriceTarget.new("TSLA", 575.00, "Year End 2025 Target", "IA-JAMES", "default"))
        array.push(priceTargets, PriceTarget.new("TSLA", 425.00, "2025 Peak", "Cantor Fitzgerald", "default"))
        array.push(priceTargets, PriceTarget.new("TSLA", 2000.00, "2029 Target (Bear)", "Cathie Wood (ARK Invest)", "default"))
        array.push(priceTargets, PriceTarget.new("TSLA", 2600.00, "2029 Target (Expected)", "Cathie Wood (ARK Invest)", "default"))
        array.push(priceTargets, PriceTarget.new("TSLA", 3100.00, "2029 Target (Bull)", "Cathie Wood (ARK Invest)", "default"))
        // MARA
        array.push(priceTargets, PriceTarget.new("MARA", 20.71, "2025 Price Target (High $27, Avg $20.71, Low $12)", "9 Analyst Consensus)", "default"))

        // Crypto
        // -------

        // BTC
        array.push(priceTargets, PriceTarget.new("BTCUSD", 130000.00, "Year End 2025 Target", "IA-JAMES", "default"))
        array.push(priceTargets, PriceTarget.new("BTCUSD", 1500000.00, "2030 Target", "Cathie Wood (ARK Invest)", "default"))
        
        // SOL
        array.push(priceTargets, PriceTarget.new("SOLUSD", 300.00, "2025 Bull Peak", "IA-JAMES", "default"))
        array.push(priceTargets, PriceTarget.new("SOLUSD", 3211.28, "2030 Target", "VanEck", "default"))
        array.push(priceTargets, PriceTarget.new("SOLUSD", 920, "Price Target (timeframe unknown)", "Unknown analyst", "default"))

        // Treasuries
        // -----------

        // DFDV
        array.push(priceTargets, PriceTarget.new("DFDV", 45.00, "Top SOL treasury pick, forecasting 74.9% upside", "Cantor Fitzgerald)", "default"))


        
// 3.2 user price targets
// ------------------------------
    if i_useUserTargets
        if i_userPrice1 > 0
            array.push(priceTargets, PriceTarget.new(syminfo.tickerid, i_userPrice1, i_userText1, i_userAnalyst1, "user"))
        if i_userPrice2 > 0
            array.push(priceTargets, PriceTarget.new(syminfo.tickerid, i_userPrice2, i_userText2, i_userAnalyst2, "user"))
        if i_userPrice3 > 0
            array.push(priceTargets, PriceTarget.new(syminfo.tickerid, i_userPrice3, i_userText3, i_userAnalyst3, "user"))
        if i_userPrice4 > 0
            array.push(priceTargets, PriceTarget.new(syminfo.tickerid, i_userPrice4, i_userText4, i_userAnalyst4, "user"))
        if i_userPrice5 > 0
            array.push(priceTargets, PriceTarget.new(syminfo.tickerid, i_userPrice5, i_userText5, i_userAnalyst5, "user"))
        if i_userPrice6 > 0
            array.push(priceTargets, PriceTarget.new(syminfo.tickerid, i_userPrice6, i_userText6, i_userAnalyst6, "user"))

// 4. HELPER FUNCTION
// ------------------
f_drawTargetLabel(target) =>
    labelColor = target.source == "user" ? i_user_labelColor : i_default_labelColor
    textColor  = target.source == "user" ? i_user_textColor  : i_default_textColor
    
    parts = array.new_string() 
    if i_showPrice
        array.push(parts, "$" + str.tostring(target.price, format.mintick))
    if i_showText and str.length(target.label) > 0
        array.push(parts, target.label)
    if i_showAnalyst and str.length(target.analyst_name) > 0
        array.push(parts, "(" + target.analyst_name + ")")

    labelText = array.join(parts, " - ")
    if str.length(labelText) == 0
        labelText := "Target"

    label.new(x=bar_index + i_labelOffset, y=target.price, text=labelText, xloc=xloc.bar_index, yloc=yloc.price, style=label.style_label_left, color=labelColor, textcolor=textColor, size=i_textSize)


// 5. PLOTTING & DRAWING
// ---------------------
var line[] lastBarLines = array.new_line()
var label[] lastBarLabels = array.new_label()

if i_showTargets
    for ln in lastBarLines
        line.delete(ln)
    for lbl in lastBarLabels
        label.delete(lbl)
    array.clear(lastBarLines)
    array.clear(lastBarLabels)

    if barstate.islast
        for target in priceTargets
            if target.ticker == syminfo.tickerid or target.ticker == syminfo.ticker
                
                // --- Draw the Line (if enabled) ---
                if i_showLines
                    lineColor = target.source == "user" ? i_user_lineColor : i_default_lineColor
                    int start_bar_index = barstate.isfirst ? 0 : nz(bar_index[2000], 0)
                    newLine = line.new(
                         x1 = start_bar_index, 
                         y1 = target.price, 
                         x2 = bar_index + i_labelOffset, 
                         y2 = target.price, 
                         extend = extend.none,
                         color = lineColor, 
                         width = 1
                         )
                    array.push(lastBarLines, newLine)

                // --- Draw the Label ---
                array.push(lastBarLabels, f_drawTargetLabel(target))