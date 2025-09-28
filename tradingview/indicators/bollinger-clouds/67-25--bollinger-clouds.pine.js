//@version=6

// =============================================================================
// |         Bollinger Clouds                                                  |
// =============================================================================
// | Author @67--25                                                            |
// | Credits @MILO                                                             |
// | Inspiration @JAMES                                                        |
// |                                                                           |
// | filename: bollinger-clouds.pine.js                                        |
// =============================================================================
// |                                                                           |
// | NOTES                                                                     |
// | - price often has 2-3 swings into lower band before correcting back       |
// |   to centre                                                               |
// |                                                                           |
// =============================================================================

indicator('Bollinger Clouds', 'Bollinger Clouds', overlay = true)

// =============================================================================
// SECTION: USER INPUTS
// =============================================================================

// --- Group Definitions ---
var G_CONFIG = 'General Configuration'
var G_SHARED = 'Shared Settings'
var G_CUSTOM = 'Custom Values'
var G_OUTER = 'Colors: Outer Band'
var G_INNER = 'Colors: Inner Band'

// --- Presets Settings ---
i_preset = input.string('Default', 'Preset', options = ['Default', 'Dual', 'Bollocks', 'Bullish', 'Neutral', 'Bearish'], group = G_CONFIG, tooltip = 'Select a preset to automatically configure the band adjustments.')



// --- Shared Settings ---
i_length = input.int(100, 'Length', minval = 1, group = G_SHARED, inline = 'G_SHARED__ROW_0')
i_src = input.source(close, 'Source', group = G_SHARED, inline = 'G_SHARED__ROW_0')

i_ma_type = input.string('SMA', 'Basis MA Type', options = ['SMA', 'EMA', 'WMA', 'VWMA'], group = G_SHARED, tooltip = 'The type of moving average to use for the basis line of the bands.')
i_offset = input.int(0, 'Offset', group = G_SHARED, tooltip = 'Shifts the bands horizontally by the specified number of candles. A positive value shifts them right, a negative value shifts them left.')


// --- Custom Values Toggle ---
i_enable_custom = input.bool(false, 'Enable', group = G_CUSTOM, tooltip = 'Enable Custom Values for the inner and outer bands. Only used for non-centered presets (Dual, Bollocks, Custom).')

// --- Outer Band Settings ---
i_stddev_upper_outer = input.float(2.0, 'Outer StdDev: Upper', minval = 0.001, step = 0.1, inline = 'outer_setup', group = G_CUSTOM)
i_stddev_lower_outer = input.float(2.0, 'Lower', minval = 0.001, step = 0.1, inline = 'outer_setup', group = G_CUSTOM)

// --- Inner Band Settings ---
i_stddev_upper_inner = input.float(1.0, 'Inner StdDev: Upper', minval = 0.001, step = 0.1, inline = 'inner_setup', group = G_CUSTOM)
i_stddev_lower_inner = input.float(1.0, 'Lower', minval = 0.001, step = 0.1, inline = 'inner_setup', group = G_CUSTOM)

// --- Visuals ---



// --- Outer Band Style ---
i_show_outer = input.bool(true, 'Outer Band ', group = G_OUTER, tooltip = 'Toggle display of the Outer Bands')
c_outer_basis = input.color(color.new(#4A4A4A, 0), 'Basis', inline = 'outer_style', group = G_OUTER)
c_outer_upper = input.color(color.new(#4A4A4A, 0), 'Upper', inline = 'outer_style', group = G_OUTER)
c_outer_lower = input.color(color.new(#4A4A4A, 0), 'Lower', inline = 'outer_style', group = G_OUTER)
c_outer_bg = input.color(color.new(#FFFFFF, 97), 'Background', inline = 'outer_style', group = G_OUTER)

// --- Inner Band Style ---
i_show_inner = input.bool(true, 'Inner Band', group = G_INNER, tooltip = 'Toggle display of the Inner Bands')
c_inner_basis = input.color(color.new(#2E2E2E, 0), 'Basis', inline = 'inner_style', group = G_INNER)
c_inner_upper = input.color(color.new(#2E2E2E, 0), 'Upper', inline = 'inner_style', group = G_INNER)
c_inner_lower = input.color(color.new(#2E2E2E, 0), 'Lower', inline = 'inner_style', group = G_INNER)
c_inner_bg = input.color(color.new(#000000, 75), 'Background', inline = 'inner_style', group = G_INNER)

// =============================================================================
// SECTION: HELPER FUNCTIONS
// =============================================================================

// f_ma: Calculates a moving average based on a specified type.
f_ma(_src, _len, _type) =>
    switch _type
        'SMA' => ta.sma(_src, _len)
        'EMA' => ta.ema(_src, _len)
        'WMA' => ta.wma(_src, _len)
        'VWMA' => ta.vwma(_src, _len)
        => ta.sma(_src, _len) // Default to SMA

// f_center_band: Calculates a new band that is centered within a parent band.
f_center_band(_outer_upper, _outer_lower, _width_percent) =>
    midpoint = (_outer_upper + _outer_lower) / 2
    width = _outer_upper - _outer_lower
    inner_width = width * _width_percent
    inner_radius = inner_width / 2
    new_upper = midpoint + inner_radius
    new_lower = midpoint - inner_radius
    [new_upper, new_lower]

// =============================================================================
// SECTION: CALCULATIONS
// =============================================================================

// --- Core Calculations ---
basis_ma = f_ma(i_src, i_length, i_ma_type)
dev = ta.stdev(i_src, i_length)

// --- Determine Band Deviations ---
var float stddev_upper_outer = i_stddev_upper_outer
var float stddev_lower_outer = i_stddev_lower_outer
var float stddev_upper_inner = i_stddev_upper_inner
var float stddev_lower_inner = i_stddev_lower_inner

// If custom values are not enabled, use the selected preset values.
if not i_enable_custom
    [_stddev_upper_outer, _stddev_lower_outer, _stddev_upper_inner, _stddev_lower_inner] = switch i_preset
        'Default'        => [1.0, 1.0, 0.33, 0.0]
        'Dual'           => [2.5, 3.0, 1.0, 1.0]
        'Bollocks'       => [2.9, 3.1, 1.0, 1.0]
        'Bullish'        => [2.5, 1.0, 0.33, 0.0]
        'Neutral'        => [2.0, 2.0, 0.33, 0.0]
        'Bearish'        => [1.0, 3.0, 0.33, 0.0]

    stddev_upper_outer := _stddev_upper_outer
    stddev_lower_outer := _stddev_lower_outer
    stddev_upper_inner := _stddev_upper_inner
    stddev_lower_inner := _stddev_lower_inner

// --- Outer Band Calculation ---
var float outer_upper = na
var float outer_lower = na
var float outer_midpoint = na

if i_show_outer or i_show_inner
    outer_upper := basis_ma + (dev * stddev_upper_outer)
    outer_lower := basis_ma - (dev * stddev_lower_outer)

// --- Inner Band Calculation ---
var float inner_upper = na
var float inner_lower = na
var float inner_midpoint = na

if i_show_inner
    // Automatically choose logic based on the selected preset.
    // 'Dual', 'Bollocks', and Custom mode use the original, non-centered logic.
    if i_enable_custom or i_preset == 'Dual' or i_preset == 'Bollocks'
        inner_upper := basis_ma + (dev * stddev_upper_inner)
        inner_lower := basis_ma - (dev * stddev_lower_inner)
    else
        // All other presets use the centering function.
        [new_inner_upper, new_inner_lower] = f_center_band(outer_upper, outer_lower, stddev_upper_inner)
        inner_upper := new_inner_upper
        inner_lower := new_inner_lower

// --- Midpoint Calculations (for plotting basis lines) ---
if i_preset == 'Dual' or i_preset == 'Bollocks'
    // For these non-centered presets, force both midpoints to be the central MA for alignment
    outer_midpoint := basis_ma
    inner_midpoint := basis_ma
else
    // For all other presets, use the true geometric midpoint for each band
    outer_midpoint := (outer_upper + outer_lower) / 2
    inner_midpoint := (inner_upper + inner_lower) / 2

// =============================================================================
// SECTION: PLOTS
// =============================================================================

// --- Plot Outer Band ---
p_outer_basis = plot(i_show_outer ? outer_midpoint : na, 'Outer Basis', color = c_outer_basis, offset = i_offset)
p_outer_upper = plot(i_show_outer ? outer_upper : na, 'Outer Upper', color = c_outer_upper, offset = i_offset)
p_outer_lower = plot(i_show_outer ? outer_lower : na, 'Outer Lower', color = c_outer_lower, offset = i_offset)
fill(p_outer_upper, p_outer_lower, title = 'Outer BG', color = i_show_outer ? c_outer_bg : na)

// --- Plot Inner Band ---
p_inner_basis = plot(i_show_inner ? inner_midpoint : na, 'Inner Basis', color = c_inner_basis, offset = i_offset)
p_inner_upper = plot(i_show_inner ? inner_upper : na, 'Inner Upper', color = c_inner_upper, offset = i_offset)
p_inner_lower = plot(i_show_inner ? inner_lower : na, 'Inner Lower', color = c_inner_lower, offset = i_offset)
fill(p_inner_upper, p_inner_lower, title = 'Inner BG', color = i_show_inner ? c_inner_bg : na)

// =============================================================================
// SECTION: ALERT CONDITIONS
// =============================================================================

// --- Outer Band Alerts ---
price_closes_inside_outer = ta.crossunder(i_src, outer_upper[i_offset]) or ta.crossover(i_src, outer_lower[i_offset])
alertcondition(i_show_outer and price_closes_inside_outer, title = 'Outer: Price Closes Inside Band', message = '{{ticker}}: Price closed inside the Outer Band at {{close}}')

price_closes_outside_outer = ta.crossover(i_src, outer_upper[i_offset]) or ta.crossunder(i_src, outer_lower[i_offset])
alertcondition(i_show_outer and price_closes_outside_outer, title = 'Outer: Price Closes Outside Band', message = '{{ticker}}: Price closed outside the Outer Band at {{close}}')

alertcondition(i_show_outer and ta.cross(i_src, outer_upper[i_offset]), title = 'Outer: Price Crosses Upper Band', message = '{{ticker}}: Price crossed the Outer Upper Band at {{close}}')
alertcondition(i_show_outer and ta.cross(i_src, outer_lower[i_offset]), title = 'Outer: Price Crosses Lower Band', message = '{{ticker}}: Price crossed the Outer Lower Band at {{close}}')
alertcondition(i_show_outer and ta.cross(i_src, outer_midpoint[i_offset]), title = 'Outer: Price Crosses Basis Line', message = '{{ticker}}: Price crossed the Outer Basis Line at {{close}}')

// --- Inner Band Alerts ---
alertcondition(i_show_inner and ta.cross(i_src, inner_upper[i_offset]), title = 'Inner: Price Crosses Upper Band', message = '{{ticker}}: Price crossed the Inner Upper Band at {{close}}')
alertcondition(i_show_inner and ta.cross(i_src, inner_lower[i_offset]), title = 'Inner: Price Crosses Lower Band', message = '{{ticker}}: Price crossed the Inner Lower Band at {{close}}')
alertcondition(i_show_inner and ta.cross(i_src, inner_midpoint[i_offset]), title = 'Inner: Price Crosses Basis Line', message = '{{ticker}}: Price crossed the Inner Basis Line at {{close}}')