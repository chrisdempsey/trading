// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// inspiration: @investanswers
// credit: @federalTacos5392
// credit: @gemini (flash 2.5 pro)
// authored by: @67-25

//@version=6
indicator('67-25 - CORE-MOMENTUM  (alpha release)', shorttitle = '67-25 - CORE-MOMENTUM (ALPHA)', overlay = false)


// OVERVIEW
// - The CORE-MOMENTUM indicator is based on the Awesome Oscillator by Bill Williams
// - It can now also incorporate the Hull Moving Average (HMA)
// - It then calculates the average z-score based on selected inputs
// - Use it  to affirm trends or to anticipate possible reversals
//
//
// - TASKS
// - [x] add option to switch between AO and HMA
// - [x] update default lookback_period from 500 to 60
// - [ ] update noise suppression to inline toggle switch and bar count int.field
//
// - BUGS
// - [x] OB/OS default colors are the wrong way round - OB should be red ie. sell. OS should be green ie. buy
//
// RELEASE-NOTES
// - the trading style input only moves the position of the overbought/oversold bars - it does not reflect in the dots plotted
// - noise suppression signal detection logic works like this:
//    - when a valid peak (red dot) is plotted, the script "remembers" its value and starts a "cooldown" timer equal to your "Noise Suppression" setting.
//    - during this cooldown period, any new peaks that are weaker (lower) than the last plotted peak will be ignored.
//    - however, if a new peak appears that is even stronger (higher) than the last one, it will be plotted, and the cooldown timer will reset from this new, stronger peak.
//    - once the cooldown period ends, the next valid peak will be plotted regardless of its strength, starting a new cycle.
//    - this same process works in reverse for the green dots (troughs), ignoring any that are weaker (higher) than the last plotted trough during the suppression window.
//
// PRESETS
// - MSTR: OB 0.7, OS -1.2 (2hr)


// --------------------------------------------------------------------------------------------------------------------}
//  USER INPUTS
// --------------------------------------------------------------------------------------------------------------------{

var G_CONFIG_TRESHOLDS = 'Trading Style + Thresholds'
lookback_period = input.int(60, title = 'Lookback', group = G_CONFIG_TRESHOLDS, inline = 'thresholds')
overbought_threshold = input.float(2.1, title = 'O/B', step = 0.1, group = G_CONFIG_TRESHOLDS, inline = 'thresholds')
oversold_threshold = input.float(-1.2, title = 'O/S', step = 0.1, group = G_CONFIG_TRESHOLDS, inline = 'thresholds', tooltip = 'Lookback period, Overbought and Oversold thresholds')

// Trading Style Inputs
trading_style = input.string('neutral', title = 'Trading Style', options = ['very aggressive', 'aggressive', 'neutral', 'conservative', 'very conservative'], group = G_CONFIG_TRESHOLDS)
noise_suppression = input.int(30, title = 'Noise Suppression', minval = 0, maxval = 50, step = 10, group = G_CONFIG_TRESHOLDS, tooltip = 'Suppresses weaker signals if a stronger one occurred within this many bars. Non-repainting. 0 is no noise suppression.')

// --- Oscillator Selection & Lengths ---
var G_CONFIG_OSCILLATORS = 'Oscillators & Lengths'

// Awesome Oscillator
include_ao = input.bool(true, title = 'Awesome Oscillator', group = G_CONFIG_OSCILLATORS, inline = 'ao')
AOL1 = input.int(5, title = 'Fast', group = G_CONFIG_OSCILLATORS, inline = 'ao')
AOL2 = input.int(34, title = 'Slow', group = G_CONFIG_OSCILLATORS, inline = 'ao')

include_hma = input.bool(false, title = 'Hull Moving Average', group = G_CONFIG_OSCILLATORS, inline = 'hma')
HMAL = input.int(9, title = 'Length', group = G_CONFIG_OSCILLATORS, inline = 'hma')

// RSI Z-Score
include_rsiz = input.bool(false, title = 'RSI Z-Score', group = G_CONFIG_OSCILLATORS, inline = 'rsiz')
RSIZL = input.int(14, title = 'Length', group = G_CONFIG_OSCILLATORS, inline = 'rsiz')

// Williams %R
include_willr = input.bool(false, title = 'Williams %R', group = G_CONFIG_OSCILLATORS, inline = 'willr')
WILLRL = input.int(9, title = 'Length', group = G_CONFIG_OSCILLATORS, inline = 'willr')


// visual effects
var G_CONFIG_VISUALS = 'Visual effects'
plot_gradient = input.bool(true, title = 'Plot Gradient', group = G_CONFIG_VISUALS, tooltip = 'Adds gradient fill where plot is above the threshold')


// Calculate multiplier based on Trading Style
multiplier = switch trading_style
    'very aggressive' => 0.3
    'aggressive' => 0.7
    'neutral' => 1.0
    'conservative' => 1.3
    'very conservative' => 1.7
    => 1.0 // default


// Calculate Awesome Oscilator
ao = ta.sma(hl2, AOL1) - ta.sma(hl2, AOL2)
ao_zscore = (ao - ta.sma(ao, lookback_period)) / ta.stdev(ao, lookback_period)
// Calculate Hull Moving Average
hma = ta.hma(close, HMAL)
hma_zscore = (hma - ta.sma(hma, lookback_period)) / ta.stdev(hma, lookback_period)
// Calculate RSI Z-Score
rsi = ta.rsi(close, RSIZL)
rsi_zscore = (rsi - ta.sma(rsi, lookback_period)) / ta.stdev(rsi, lookback_period)
// Calculate Williams %R
willr = ta.wpr(WILLRL)
willr_zscore = (willr - ta.sma(willr, lookback_period)) / ta.stdev(willr, lookback_period)

// Calculate the average z-score based on selected inputs
z_scores = array.new_float(0)
if include_ao
	array.push(z_scores, ao_zscore)
if include_hma
    array.push(z_scores, hma_zscore)
if include_rsiz
    array.push(z_scores, rsi_zscore)
if include_willr
    array.push(z_scores, willr_zscore)

// variable to hold the average zscore
average_zscore = array.size(z_scores) > 0 ? array.avg(z_scores) : 0.0

// input swith user friendly labels
var G_CONFIG_COLORS = 'COLORS'
i_col__overbought = input.color(#801922, title = 'Overbought', group = G_CONFIG_COLORS, inline = 'colors_0') // Red for selling pressure
i_col__oversold = input.color(#056656, title = 'Oversold', group = G_CONFIG_COLORS, inline = 'colors_0')   // Green for buying pressure
i_col__neutral = input.color(#1848CC, title = 'Neutral', group = G_CONFIG_COLORS, inline = 'colors_0')

// Define constant colors to be used as defaults for the fills below.
// col_overbought_fill_default = color.rgb(05,66,56, 50)
// col_oversold_fill_default = color.rgb(80,19,22, 50)

col_overbought_fill_default = color.rgb(80,19,22, 50)
col_oversold_fill_default = color.rgb(05,66,56, 50)

// These inputs use the constant colors above as their defaults.
upper_fill_color = input.color(col_overbought_fill_default, title = 'Upper Band Fill', group = G_CONFIG_COLORS, inline = 'colors_1')
// upper_fill_color = input.color(color.new(#2962FF, 50), title = 'Upper Band Fill', group = G_CONFIG_COLORS, inline = 'colors_1')
lower_fill_color = input.color(col_oversold_fill_default, title = 'Lower Band Fill', group = G_CONFIG_COLORS, inline = 'colors_1')


// Define the color for the main plot line based on thresholds
colorCondition = average_zscore > overbought_threshold ? i_col__overbought : average_zscore < oversold_threshold ? i_col__oversold : i_col__neutral
sma_average_zscore = ta.sma(average_zscore, 3)


// Plot the composite momentum oscillator with conditional overbought/sold colors
plot_cmo = plot(average_zscore, title = 'Composite Momentum Oscillator', color = colorCondition)

// plot the smoothed line sma_average_zscore (signal)
plot(sma_average_zscore, color = color.black, title = 'smoothed line')

// plot midline
midLinePlot = plot(0, color = na, editable = false, display = display.none)

// apply gradient fill to the cmo plot, visibility is controlled by the 'CMO Plot Gradient' input
fill(plot_cmo, midLinePlot, 3, overbought_threshold, top_color = plot_gradient ? color.new(i_col__overbought, 0) : na, bottom_color = plot_gradient ? color.new(i_col__overbought, 100) : na, title = 'Overbought Gradient Fill')
fill(plot_cmo, midLinePlot, oversold_threshold, -3, top_color = plot_gradient ? color.new(i_col__oversold, 100) : na, bottom_color = plot_gradient ? color.new(i_col__oversold, 0) : na, title = 'Oversold Gradient Fill')


// ---- PEAK & TROUGH DETECTION LOGIC WITH NOISE SUPPRESSION ----

// 1. Define the base condition for a peak or trough on the previous bar.
isOverboughtPeak_base = average_zscore[1] > average_zscore and average_zscore[1] > average_zscore[2] and average_zscore[1] > overbought_threshold
isOversoldTrough_base = average_zscore[1] < average_zscore and average_zscore[1] < average_zscore[2] and average_zscore[1] < oversold_threshold

// 2. State variables to remember the last plotted signal's value and bar index.
var float lastPeakVal = na
var int lastPeakBar = na
var float lastTroughVal = na
var int lastTroughBar = na

// 3. Determine if the current peak should be plotted.
bool plotThisPeak = false
if isOverboughtPeak_base
    // A peak is plotted if:
    // a) It's the first peak we've seen.
    // b) The noise suppression period has passed since the last peak.
    // c) The new peak is stronger (higher) than the last one we plotted.
    if na(lastPeakVal) or bar_index > lastPeakBar + noise_suppression or average_zscore[1] > lastPeakVal
        plotThisPeak := true
        lastPeakVal := average_zscore[1]
        lastPeakBar := bar_index[1]
        lastPeakBar

// 4. Determine if the current trough should be plotted.
bool plotThisTrough = false
if isOversoldTrough_base
    // A trough is plotted if:
    // a) It's the first trough we've seen.
    // b) The noise suppression period has passed since the last trough.
    // c) The new trough is stronger (lower) than the last one we plotted.
    if na(lastTroughVal) or bar_index > lastTroughBar + noise_suppression or average_zscore[1] < lastTroughVal
        plotThisTrough := true
        lastTroughVal := average_zscore[1]
        lastTroughBar := bar_index[1]
        lastTroughBar

// --- Plotting the Shapes ---
plotshape(plotThisPeak ? average_zscore[1] : na, title = 'Overbought Peak', location = location.absolute, color = i_col__overbought, style = shape.circle, size = size.tiny)

plotshape(plotThisTrough ? average_zscore[1] : na, title = 'Oversold Trough', location = location.absolute, color = i_col__oversold, style = shape.circle, size = size.tiny)

// ---- END OF NEW LOGIC ----


// Plot horizontal Lines using the multiplier
// mid
mid_line = hline(0, 'Center Line', color = color.new(color.gray, 50), linestyle = hline.style_dashed)

// upper
upper_1_line = hline(1 * multiplier, 'Upper 1', color = color.gray, linestyle = hline.style_dashed)
upper_2_line = hline(2 * multiplier, 'Upper 2', color = color.gray, linestyle = hline.style_dashed)
upper_3_line = hline(3 * multiplier, 'Upper 3', color = color.gray, linestyle = hline.style_dashed, display = display.none) // hidden by default

// lower
lower_1_line = hline(-1 * multiplier, 'Lower -1', color = color.gray, linestyle = hline.style_dashed)
lower_2_line = hline(-2 * multiplier, 'Lower -2', color = color.gray, linestyle = hline.style_dashed)
lower_3_line = hline(-3 * multiplier, 'Lower -3', color = color.gray, linestyle = hline.style_dashed, display = display.none) // hidden by default

// Fill the space between the two hline variables
fill(upper_1_line, upper_2_line, color = upper_fill_color, title = 'Upper Band Fill')
fill(lower_1_line, lower_2_line, color = lower_fill_color, title = 'Lower Band Fill')
