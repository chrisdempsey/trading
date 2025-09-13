// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// author: 67-25
// credits: @mr.dip
//@version=6

// initialise variables
var indicator_prefix = '[67-25]'
var indicator_name = 'MOVING AVERAGES'
var indicator_version = '0.1'

indicator(indicator_prefix + ' ' + indicator_name + ' (v' + indicator_version + ')', indicator_prefix + ' ' + indicator_name, true)

// Functions
ma(simple string type, float source, simple int period) =>
    ma = switch type
        'SMA' => ta.sma(source, period)
        'EMA' => ta.ema(source, period)
        'HMA' => ta.hma(source, period)
        'RMA' => ta.rma(source, period)
        'VWMA' => ta.vwma(source, period)
        'WMA' => ta.wma(source, period)
    ma

// User-Defined Type to hold all settings for a single Moving Average
type ma_settings
    bool enable
    int period
    string type
    float src
    string tf

// inputs
global_settings_group = 'Global Settings'
presets_group = 'Presets'
ma_catagory = 'Settings: Enable / Period / Type / Source / Timeframe'

bullish_color = input.color(defval = color.new(#338248, 20), title = 'Bullish', group = global_settings_group, inline = 'colors')
bearish_color = input.color(defval = color.new(#C90202, 20), title = 'Bearish', group = global_settings_group, inline = 'colors')
label_text_color = input.color(defval = color.new(color.white, 20), title = 'Text', group = global_settings_group, inline = 'colors')
show_crossovers = input.bool(title = 'Highlight Crossovers', defval = true, group = global_settings_group, inline = 'show_cross')
show_labels = input.bool(title = 'Crossover Labels', defval = false, group = global_settings_group, inline = 'show_cross', tooltip = 'MA Crossover Highlights and Labels are shown on the lowest value MAs')

preset = input.string('none', 'Preset', options = ['none', 'AO (Awesome Oscillator)', 'Krown Cross', 'Golden / Death Cross'], group = presets_group, tooltip = 'Selecting a preset will override all settings configured below.')
preset_ma_type = input.string('SMA', 'MA Type', options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], group = presets_group, tooltip = 'This MA Type will be applied to all MAs when a preset is selected.')

ma1_enable = input.bool(title = '1', defval = true, group = ma_catagory, inline = '1')
ma1_period = input.int(title = '', defval = 25, group = ma_catagory, inline = '1')
ma1_type = input.string(title = '', defval = 'SMA', group = ma_catagory, options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], inline = '1')
ma1_src = input.source(title = '', defval = close, group = ma_catagory, inline = '1')
ma1_tf = input.timeframe(title = '', defval = '', group = ma_catagory, inline = '1')

ma2_enable = input.bool(title = '2', defval = true, group = ma_catagory, inline = '2')
ma2_period = input.int(title = '', defval = 50, group = ma_catagory, inline = '2')
ma2_type = input.string(title = '', defval = 'SMA', group = ma_catagory, options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], inline = '2')
ma2_src = input.source(title = '', defval = close, group = ma_catagory, inline = '2')
ma2_tf = input.timeframe(title = '', defval = '', group = ma_catagory, inline = '2')

ma3_enable = input.bool(title = '3', defval = true, group = ma_catagory, inline = '3')
ma3_period = input.int(title = '', defval = 100, group = ma_catagory, inline = '3')
ma3_type = input.string(title = '', defval = 'SMA', group = ma_catagory, options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], inline = '3')
ma3_src = input.source(title = '', defval = close, group = ma_catagory, inline = '3')
ma3_tf = input.timeframe(title = '', defval = '', group = ma_catagory, inline = '3')

ma4_enable = input.bool(title = '4', defval = true, group = ma_catagory, inline = '4')
ma4_period = input.int(title = '', defval = 200, group = ma_catagory, inline = '4')
ma4_type = input.string(title = '', defval = 'SMA', group = ma_catagory, options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], inline = '4')
ma4_src = input.source(title = '', defval = close, group = ma_catagory, inline = '4')
ma4_tf = input.timeframe(title = '', defval = '', group = ma_catagory, inline = '4')

ma5_enable = input.bool(title = '5', defval = false, group = ma_catagory, inline = '5')
ma5_period = input.int(title = '', defval = 200, group = ma_catagory, inline = '5')
ma5_type = input.string(title = '', defval = 'SMA', group = ma_catagory, options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], inline = '5')
ma5_src = input.source(title = '', defval = close, group = ma_catagory, inline = '5')
ma5_tf = input.timeframe(title = '', defval = '', group = ma_catagory, inline = '5')

ma6_enable = input.bool(title = '6', defval = false, group = ma_catagory, inline = '6')
ma6_period = input.int(title = '', defval = 200, group = ma_catagory, inline = '6')
ma6_type = input.string(title = '', defval = 'SMA', group = ma_catagory, options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], inline = '6')
ma6_src = input.source(title = '', defval = close, group = ma_catagory, inline = '6')
ma6_tf = input.timeframe(title = '', defval = '', group = ma_catagory, inline = '6')

ma7_enable = input.bool(title = '7', defval = false, group = ma_catagory, inline = '7')
ma7_period = input.int(title = '', defval = 1, group = ma_catagory, inline = '7')
ma7_type = input.string(title = '', defval = 'SMA', group = ma_catagory, options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], inline = '7')
ma7_src = input.source(title = '', defval = close, group = ma_catagory, inline = '7')
ma7_tf = input.timeframe(title = '', defval = '', group = ma_catagory, inline = '7')

ma8_enable = input.bool(title = '8', defval = false, group = ma_catagory, inline = '8')
ma8_period = input.int(title = '', defval = 1, group = ma_catagory, inline = '8')
ma8_type = input.string(title = '', defval = 'SMA', group = ma_catagory, options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], inline = '8')
ma8_src = input.source(title = '', defval = close, group = ma_catagory, inline = '8')
ma8_tf = input.timeframe(title = '', defval = '', group = ma_catagory, inline = '8')

// --- Calculations ---

// Determine final settings for each MA based on the preset. This ensures the compiler treats them as 'simple'.
is_krown_cross = preset == 'Krown Cross'
is_golden_cross = preset == 'Golden / Death Cross'
is_ao = preset == 'AO (Awesome Oscillator)'
is_preset_active = is_krown_cross or is_golden_cross or is_ao

ma1_enable_final = is_preset_active ? (is_krown_cross or is_golden_cross or is_ao) : ma1_enable
ma1_period_final = is_krown_cross ? 21 : is_golden_cross ? 50 : is_ao ? 5 : ma1_period
ma1_type_final = is_preset_active ? preset_ma_type : ma1_type

ma2_enable_final = is_preset_active ? (is_krown_cross or is_golden_cross or is_ao) : ma2_enable
ma2_period_final = is_krown_cross ? 55 : is_golden_cross ? 200 : is_ao ? 34 : ma2_period
ma2_type_final = is_preset_active ? preset_ma_type : ma2_type

ma3_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma3_enable
ma4_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma4_enable
ma5_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma5_enable
ma6_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma6_enable
ma7_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma7_enable
ma8_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma8_enable

// Calculate each MA individually using the final 'simple' settings
ma1 = request.security(syminfo.tickerid, ma1_tf, ma(ma1_type_final, ma1_src, ma1_period_final))
ma2 = request.security(syminfo.tickerid, ma2_tf, ma(ma2_type_final, ma2_src, ma2_period_final))
ma3 = request.security(syminfo.tickerid, ma3_tf, ma(ma3_type, ma3_src, ma3_period))
ma4 = request.security(syminfo.tickerid, ma4_tf, ma(ma4_type, ma4_src, ma4_period))
ma5 = request.security(syminfo.tickerid, ma5_tf, ma(ma5_type, ma5_src, ma5_period))
ma6 = request.security(syminfo.tickerid, ma6_tf, ma(ma6_type, ma6_src, ma6_period))
ma7 = request.security(syminfo.tickerid, ma7_tf, ma(ma7_type, ma7_src, ma7_period))
ma8 = request.security(syminfo.tickerid, ma8_tf, ma(ma8_type, ma8_src, ma8_period))

// Create an array of the calculated MA series for easy access
ma_series = array.from(ma1, ma2, ma3, ma4, ma5, ma6, ma7, ma8)

// For label positioning, calculate ATR
atr = ta.atr(14)

// plot outputs
plot(ma1_enable_final ? ma1 : na, title = 'MA1', color = color.new(#FFFFFF, 20))
plot(ma2_enable_final ? ma2 : na, title = 'MA2', color = color.new(#FCCBCD, 0))
plot(ma3_enable_final ? ma3 : na, title = 'MA3', color = color.new(#F77C80, 0))
plot(ma4_enable_final ? ma4 : na, title = 'MA4', color = color.new(#B22833, 0))
plot(ma5_enable_final ? ma5 : na, title = 'MA5', color = color.new(#FFFFFF, 20))
plot(ma6_enable_final ? ma6 : na, title = 'MA6', color = color.new(#FFFFFF, 20))
plot(ma7_enable_final ? ma7 : na, title = 'MA7', color = color.new(#FFFFFF, 20))
plot(ma8_enable_final ? ma8 : na, title = 'MA8', color = color.new(#FFFFFF, 20))

// Crossover Logic
bool bullish_cross = false
bool bearish_cross = false 
series float ma_short = na // Declare in global scope
series float ma_long = na  // Declare in global scope
string bullish_cross_text = na // Declare tooltip text variable
string bearish_cross_text = na // Declare tooltip text variable

if show_crossovers
    // Create arrays of the final settings for the crossover logic to use
    ma_enables = array.from(ma1_enable_final, ma2_enable_final, ma3_enable_final, ma4_enable_final, ma5_enable_final, ma6_enable_final, ma7_enable_final, ma8_enable_final)
    ma_periods = array.from(ma1_period_final, ma2_period_final, ma3_period, ma4_period, ma5_period, ma6_period, ma7_period, ma8_period)
    ma_types = array.from(ma1_type_final, ma2_type_final, ma3_type, ma4_type, ma5_type, ma6_type, ma7_type, ma8_type)

    // Find the two shortest active MAs
    int active_ma_count = 0

    // Find the two shortest active MAs on every bar to allow for dynamic changes in settings
    int shortest_period = 99999
    int second_shortest_period = 99999
    int shortest_idx = -1
    int second_shortest_idx = -1

    for i = 0 to array.size(ma_enables) - 1
        if array.get(ma_enables, i)
            active_ma_count += 1
            p = array.get(ma_periods, i)
            if p < shortest_period
                second_shortest_period := shortest_period
                second_shortest_idx := shortest_idx
                shortest_period := p
                shortest_idx := i
            else if p < second_shortest_period
                second_shortest_period := p
                second_shortest_idx := i
    
    if shortest_idx != -1 and second_shortest_idx != -1
        ma_short := array.get(ma_series, shortest_idx)
        ma_long := array.get(ma_series, second_shortest_idx)
        
        // Build the tooltip string
        string short_type = array.get(ma_types, shortest_idx)
        string long_type = array.get(ma_types, second_shortest_idx)
        string short_period_str = str.tostring(shortest_period)
        string long_period_str = str.tostring(second_shortest_period)
        bullish_cross_text := short_period_str + ' ' + short_type + ' ▲ ' + long_period_str + ' ' + long_type
        bearish_cross_text := short_period_str + ' ' + short_type + ' ▼ ' + long_period_str + ' ' + long_type
        
    // On every bar, if we have at least two MAs, check for crossovers
    if active_ma_count >= 2 and not na(ma_short) and not na(ma_long)
        bullish_cross := ta.crossover(ma_short, ma_long)
        bearish_cross := ta.crossunder(ma_short, ma_long)

// Plot crossover shapes and labels
// tiny, small, normal, large, huge, auto
plotshape(show_crossovers and bullish_cross ? ma_short : na, style=shape.diamond, location=location.absolute, color=bullish_color, size=size.small, title='Bullish Crossover')
plotshape(show_crossovers and bearish_cross ? ma_short : na, style=shape.diamond, location=location.absolute, color=bearish_color, size=size.small, title='Bearish Crossover')

// Add labels for crossovers to display tooltip text
if show_crossovers and show_labels and bullish_cross
    label.new(bar_index, y = ma_short - atr, yloc = yloc.price, text = bullish_cross_text, color=bullish_color, style=label.style_label_up, textcolor=label_text_color)
if show_crossovers and show_labels and bearish_cross
    label.new(bar_index, y = ma_short + atr, yloc = yloc.price, text = bearish_cross_text, color=bearish_color, style=label.style_label_down, textcolor=label_text_color)

// --- Alerts ---
if bullish_cross
    alert('crossover detected: ' + bullish_cross_text, freq = alert.freq_once_per_bar)
if bearish_cross
    alert('crossunder detected: ' + bearish_cross_text, freq = alert.freq_once_per_bar)
