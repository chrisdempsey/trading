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
presets_group = 'Presets'
overrides_group = 'Overrides'
ma_catagory = 'Settings: Enable / Period / Type / Source / Timeframe'
colors_labels_group = 'Colors + Labels'

// --- Presets & Overrides ---
preset = input.string('none', 'Preset', options = ['none', 'AO (Awesome Oscillator)', 'Krown Cross', 'Golden / Death Cross'], group = presets_group, inline = 'presets')
preset_ma_type = input.string('SMA', 'MA', options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], group = presets_group, inline = 'presets', tooltip = 'Selecting a preset will override the enabled MAs and their periods. The selected MA is applied to all MAs when a preset is active.')

enable_type_override = input.bool(false, 'Type', group = overrides_group, inline = 'type_override', tooltip = 'Overrides all Types selected in Settings below.')
override_ma_type = input.string('SMA', '', options = ['SMA', 'EMA', 'HMA', 'RMA', 'VWMA', 'WMA'], group = overrides_group, inline = 'type_override')

enable_source_override = input.bool(false, 'Source', group = overrides_group, inline = 'source_override')
override_ma_source = input.source(close, '', group = overrides_group, inline = 'source_override', tooltip = 'Overrides all Sources selected in Settings below.')

enable_timeframe_override = input.bool(false, 'Timeframe', group = overrides_group, inline = 'tf_override')
override_ma_timeframe = input.timeframe('', '', group = overrides_group, inline = 'tf_override', tooltip = 'Overrides all Timeframes selected in Settings below.')

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

// --- Colors & Labels ---
bullish_color = input.color(defval = color.new(#338248, 20), title = 'Bullish', group = colors_labels_group, inline = 'colors')
bearish_color = input.color(defval = color.new(#C90202, 20), title = 'Bearish', group = colors_labels_group, inline = 'colors')
label_text_color = input.color(defval = color.new(color.white, 20), title = 'Text', group = colors_labels_group, inline = 'colors')
show_crossovers = input.bool(title = 'Highlight Crossovers', defval = true, group = colors_labels_group, inline = 'show_cross')
show_labels = input.bool(title = 'Crossover Labels', defval = false, group = colors_labels_group, inline = 'show_cross', tooltip = 'MA Crossover Highlights and Labels are shown on the lowest value MAs')

// --- Calculations ---

// Determine final settings for each MA based on the preset. This ensures the compiler treats them as 'simple'.
is_krown_cross = preset == 'Krown Cross'
is_golden_cross = preset == 'Golden / Death Cross'
is_ao = preset == 'AO (Awesome Oscillator)'
is_preset_active = is_krown_cross or is_golden_cross or is_ao

ma1_enable_final = is_preset_active ? (is_krown_cross or is_golden_cross or is_ao) : ma1_enable
ma1_period_final = is_krown_cross ? 21 : is_golden_cross ? 50 : is_ao ? 5 : ma1_period
ma1_type_final = is_preset_active ? preset_ma_type : enable_type_override ? override_ma_type : ma1_type
ma1_src_final = enable_source_override ? override_ma_source : ma1_src
ma1_tf_final = enable_timeframe_override ? override_ma_timeframe : ma1_tf

ma2_enable_final = is_preset_active ? (is_krown_cross or is_golden_cross or is_ao) : ma2_enable
ma2_period_final = is_krown_cross ? 55 : is_golden_cross ? 200 : is_ao ? 34 : ma2_period
ma2_type_final = is_preset_active ? preset_ma_type : enable_type_override ? override_ma_type : ma2_type
ma2_src_final = enable_source_override ? override_ma_source : ma2_src
ma2_tf_final = enable_timeframe_override ? override_ma_timeframe : ma2_tf

ma3_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma3_enable
ma4_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma4_enable
ma5_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma5_enable
ma6_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma6_enable
ma7_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma7_enable
ma8_enable_final = is_krown_cross or is_golden_cross or is_ao ? false : ma8_enable

// Determine final settings for MAs 3-8, applying defaults if specified
ma3_type_final = enable_type_override ? override_ma_type : ma3_type
ma3_src_final = enable_source_override ? override_ma_source : ma3_src
ma3_tf_final = enable_timeframe_override ? override_ma_timeframe : ma3_tf
ma4_type_final = enable_type_override ? override_ma_type : ma4_type
ma4_src_final = enable_source_override ? override_ma_source : ma4_src
ma4_tf_final = enable_timeframe_override ? override_ma_timeframe : ma4_tf
ma5_type_final = enable_type_override ? override_ma_type : ma5_type
ma5_src_final = enable_source_override ? override_ma_source : ma5_src
ma5_tf_final = enable_timeframe_override ? override_ma_timeframe : ma5_tf
ma6_type_final = enable_type_override ? override_ma_type : ma6_type
ma6_src_final = enable_source_override ? override_ma_source : ma6_src
ma6_tf_final = enable_timeframe_override ? override_ma_timeframe : ma6_tf
ma7_type_final = enable_type_override ? override_ma_type : ma7_type
ma7_src_final = enable_source_override ? override_ma_source : ma7_src
ma7_tf_final = enable_timeframe_override ? override_ma_timeframe : ma7_tf
ma8_type_final = enable_type_override ? override_ma_type : ma8_type
ma8_src_final = enable_source_override ? override_ma_source : ma8_src
ma8_tf_final = enable_timeframe_override ? override_ma_timeframe : ma8_tf

// Calculate each MA individually using the final 'simple' settings
ma1 = request.security(syminfo.tickerid, ma1_tf_final, ma(ma1_type_final, ma1_src_final, ma1_period_final))
ma2 = request.security(syminfo.tickerid, ma2_tf_final, ma(ma2_type_final, ma2_src_final, ma2_period_final))
ma3 = request.security(syminfo.tickerid, ma3_tf_final, ma(ma3_type_final, ma3_src_final, ma3_period))
ma4 = request.security(syminfo.tickerid, ma4_tf_final, ma(ma4_type_final, ma4_src_final, ma4_period))
ma5 = request.security(syminfo.tickerid, ma5_tf_final, ma(ma5_type_final, ma5_src_final, ma5_period))
ma6 = request.security(syminfo.tickerid, ma6_tf_final, ma(ma6_type_final, ma6_src_final, ma6_period))
ma7 = request.security(syminfo.tickerid, ma7_tf_final, ma(ma7_type_final, ma7_src_final, ma7_period))
ma8 = request.security(syminfo.tickerid, ma8_tf_final, ma(ma8_type_final, ma8_src_final, ma8_period))

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
    ma_periods = array.from(ma1_period_final, ma2_period_final, ma3_period, ma4_period, ma5_period, ma6_period, ma7_period, ma8_period) // Note: Presets only affect periods 1 & 2
    ma_types = array.from(ma1_type_final, ma2_type_final, ma3_type_final, ma4_type_final, ma5_type_final, ma6_type_final, ma7_type_final, ma8_type_final)

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
