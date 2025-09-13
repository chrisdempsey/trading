// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// author: 67-25
// credits: @chartprime
//@version=6

// initialise variables
var indicator_prefix = '[67-25]'
var indicator_name = 'TREND'
var indicator_version = '0.1'

indicator(indicator_prefix + indicator_name + ' (v' + indicator_version + ')', indicator_prefix + ' ' + indicator_name, true)

// --------------------------------------------------------------------------------------------------------------------}
// 𝙐𝙎𝙀𝙍 𝙄𝙉𝙋𝙐𝙏𝙎
// --------------------------------------------------------------------------------------------------------------------{

// Settings
int length = input.int(15, "Length", group = "Settings", tooltip = "Sets the lookback period for the moving average calculations.")
string i_fillType = input.string("Gradient", "Fill Type", options = ["Solid", "Gradient", "None"], group = "Settings", tooltip = "Selects the fill style for the area between the moving averages.")

// Colors
color up = input.color(#056656, "+", group = "Colors", inline = "i")
color dn = input.color(#B22833, "-", group = "Colors", inline = "i")

// Custom Transparency
int i_transparency_override = input.int(50, "Transparency", minval = 0, maxval = 100, group = "Colors", inline = "override", tooltip = "Set a custom transparency value (0 = opaque, 100 = transparent).")
bool i_enable_transparency_override = input.bool(false, "Enabled", group = "Colors", inline = "override")

// --------------------------------------------------------------------------------------------------------------------}
// 𝙄𝙉𝘿𝙄𝘾𝘼𝙏𝙊𝙍 𝘾𝘼𝙇𝘾𝙐𝙇𝘼𝙏𝙄𝙊𝙉𝙎
// --------------------------------------------------------------------------------------------------------------------{

series float emaValue   = ta.ema(close, length) // EMA of the closing price
series float correction = close + (close - emaValue) // Correction factor for zero-lag calculation
series float zlma       = ta.ema(correction, length) // Zero-Lag Moving Average (ZLMA)

bool  signalUp          = ta.crossover(zlma, emaValue) // Signal for bullish crossover
bool  signalDn          = ta.crossunder(zlma, emaValue) // Signal for bearish crossunder

// Determine the color of ZLMA based on its direction
color zlma_color        = zlma > zlma[3] ? up : zlma < zlma[3] ? dn : na
color ema_col           = emaValue < zlma ? up : dn // Determine the EMA color

// --------------------------------------------------------------------------------------------------------------------}
// 𝙑𝙄𝙎𝙐𝘼𝙇𝙄𝙕𝘼𝙏𝙄𝙊𝙉
// --------------------------------------------------------------------------------------------------------------------{

// Plot the Zero-Lag Moving Average
p1 = plot(zlma,     color = zlma_color, linewidth = 1) // Plot ZLMA
p2 = plot(emaValue, color = ema_col,    linewidth = 1) // Plot EMA

// Fill between ZLMA and EMA

// Determine the fill color based on the selected type
fillColor = i_fillType == "Gradient" ? (zlma > emaValue ? up : dn) : i_fillType == "Solid" ? zlma_color : na
// Determine transparency: use override if set, otherwise use preset based on fill type
transparency = i_enable_transparency_override ? i_transparency_override : i_fillType == "Gradient" ? 80 : i_fillType == "Solid" ? 0 : 100

fill(p1, p2, color = color.new(fillColor, transparency))

// Plot shapes for up and down signals
plotshape(signalUp ? zlma : na, "", shape.diamond, location.absolute, color = up, size = size.tiny)
plotshape(signalDn ? zlma : na, "", shape.diamond, location.absolute, color = dn, size = size.tiny)
// --------------------------------------------------------------------------------------------------------------------}
