//@version=6
indicator('67-25 - Auto Fibonacci levels', '67-25 - Auto Fib Levels', overlay = true, max_lines_count = 10, max_labels_count = 10)

// Author: @67-25
// Reasoning: was wasting time every few days adjusting the position of the fib levels drawn on the chart manually - developed this to draw them automatically


// =============================================================================
// REFINEMENTS - AUTO FIB LEVELS
// - [x] update diagnostic display to respect the bar offset - table was removed from code in earlier update
// - [ ] add friendly names to the color inputs for the Settings > Styles pane
// - [ ] update default fib line and label colors to the two purples from the Indicator Swatches. label is darker, line is brighter
// - [ ] add setting to toggle fib lines and another to toggle fib labels - currently they are combined (could make fib lines transparent but this is a hack) - see MACD S/R Levels script
// - add ghost extension fib levels beyond the core levels eg. 1.272, 1.618, 2.618, 3.618 (see TV fib tool for levels it offers/extends)
// - extend fib lines to meet label offset - looks odd with floating label when the offset is high eg. 45 bars
// - [x] set line and label default to red 75%
// - check Keep notes for other potential refinements
// - update color variable names to prefix with col_ instead of i_
// - consider separating the signal and macd line colours so they can be configured separately - or toggle macd off in style tab, that way signal line is visible and macd is shading
// - [x] update label text from `Level - *` to `L-*` to save space

// OTHER NOTES
// - Option for anchor date - is this just for backtest in ATR?
// - Option to extend fib levels
// - Check is ATR always had zero on the button and ATH at the top, is so are the rest a fib calculation in the middle?
// - The goal is not to match ATR, was just interesting that it did on first MSTR goal was to have quicktest
//     - Goal is to have quick fib levels to save manually drawing and updating position daily

// CHANGE LOG
// - 250710 - updated group variables with `g_` prefix
// - 250705 - updated to pinescript v6, reversed input fields for high/low to low/high

// =============================================================================



// =============================================================================
// INPUTS
// =============================================================================

// --- Configuration ---
g_autofib_config = 'Configuration'

// toggle fib lines
i_showFibLines = input.bool(true, 'Fib levels', group = g_autofib_config, inline = 'fib_lines_toggle', tooltip = 'Toggle display of the Fibonacci level lines.')
i_showFibLabels = input.bool(true, 'Fib labels', group = g_autofib_config, inline = 'fib_labels_toggle', tooltip = 'Toggle display of the Fibonacci level labels.')

i_useCustomHighLow = input.bool(false, 'Enable custom low/high', group = g_autofib_config, tooltip = 'Use swing low and high levels set below. Otherwise, the script will uses a low of 0 plus the all time high.')
i_customLow = input.float(0.0, 'Low', group = g_autofib_config, inline = 'customHighLow')
i_customHigh = input.float(0.0, 'High', group = g_autofib_config, inline = 'customHighLow', tooltip = 'Override the auto detected swing high/low values.')

// --- Label Content ---
g_autofib_labels = 'Label Content'

i_showPrice = input.bool(true, 'Price', group = g_autofib_labels, inline="label_content")
i_showFibRatio = input.bool(true, 'Fib Ratio', group = g_autofib_labels, tooltip = 'Include the price level and/or Fibonacci ratio in the label.', inline="label_content")

// position
i_lineOffset = input.int(21, 'Label offset (bars)', minval = 1, group = g_autofib_labels, tooltip = 'Offset Labels by the specified number of bars (useful if the display interferces with other indicators).')

// --- Colors ---
g_autofib_colors = 'Colors'

// colors
i_fibColor = input.color(color.new(#9C27B0, 30), 'Lines', group = g_autofib_colors, inline = 'styles') // light purple
i_labelColor = input.color(color.new(#673AB7, 30), 'Labels', group = g_autofib_colors, inline = 'styles') // dark purple
i_textColor = input.color(color.new(#DBDBDB, 30), 'Text', group = g_autofib_colors, inline = 'styles') // light grey


// =============================================================================
// LOGIC
// =============================================================================

// Persistently track the all-time high price throughout the chart's history.
var float allTimeHigh = na
allTimeHigh := na(allTimeHigh) ? high : math.max(allTimeHigh, high)

// Determine the final swing high and low to be used for calculations.
float swingHigh = i_useCustomHighLow ? i_customHigh : allTimeHigh
float swingLow = i_useCustomHighLow ? i_customLow : 0.0

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Calculate Fibonacci level based on swing high, swing low, and ratio
calculate_level(ratio) =>
    swingLow + (swingHigh - swingLow) * ratio

// This helper function constructs the label with configurable content
draw_label(level_val, friendlyName, fibRatioStr) =>
    if not na(level_val)
        // Start with the friendly name
        string labelText = friendlyName

        // Build the optional part in parentheses
        string optionalText = ''
        if i_showPrice and i_showFibRatio
            optionalText := '($' + str.tostring(level_val, format.mintick) + ' / ' + fibRatioStr + ')'
            optionalText
        else if i_showPrice
            optionalText := '($' + str.tostring(level_val, format.mintick) + ')'
            optionalText
        else if i_showFibRatio
            optionalText := '(' + fibRatioStr + ')'
            optionalText

        // Combine friendly name with optional text if present
        if optionalText != ''
            labelText := labelText + ' ' + optionalText
            labelText

        label.new(bar_index + i_lineOffset, level_val, text = labelText, xloc = xloc.bar_index, yloc = yloc.price, style = label.style_label_left, color = i_labelColor, textcolor = i_textColor, size = size.small)

// =============================================================================
// PLOTTING & DRAWING
// =============================================================================

// 1. Calculate all level values
float level_1_val = calculate_level(1.0)
float level_0786_val = calculate_level(0.786)
float level_0618_val = calculate_level(0.618)
float level_05_val = calculate_level(0.5)
float level_0382_val = calculate_level(0.382)
float level_0236_val = calculate_level(0.236)
float level_0_val = calculate_level(0.0)

// 2. Plot all levels
plot(i_showFibLines ? level_1_val : na, title = '1', color = i_fibColor, linewidth = 1)
plot(i_showFibLines ? level_0786_val : na, title = '0.786', color = i_fibColor, linewidth = 1)
plot(i_showFibLines ? level_0618_val : na, title = '0.618', color = i_fibColor, linewidth = 1)
plot(i_showFibLines ? level_05_val : na, title = '0.5', color = i_fibColor, linewidth = 1)
plot(i_showFibLines ? level_0382_val : na, title = '0.382', color = i_fibColor, linewidth = 1)
plot(i_showFibLines ? level_0236_val : na, title = '0.236', color = i_fibColor, linewidth = 1)
plot(i_showFibLines ? level_0_val : na, title = '0', color = i_fibColor, linewidth = 1)

// 3. Draw all text labels on the last bar only
if i_showFibLabels and barstate.islast
    draw_label(level_1_val, 'L-6', '1.0')
    draw_label(level_0786_val, 'L-5', '0.786')
    draw_label(level_0618_val, 'L-4', '0.618')
    draw_label(level_05_val, 'L-3', '0.5')
    draw_label(level_0382_val, 'L-2', '0.382')
    draw_label(level_0236_val, 'L-1', '0.236')
    draw_label(level_0_val, 'L-0', '0.0')
