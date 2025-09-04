// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © Mr.Dip | Twitter/x: xMrDip
//@version=5

// Init
var indicator_prefix = '[DIP]'
var indicator_name = 'Many Moving Averages'
var indicator_version = '1.1'

indicator(title = indicator_prefix + indicator_name, shorttitle = indicator_prefix + ' ' + indicator_name + ' (v' + indicator_version + ')', overlay = true)


// Functions
ma(simple string type, float source, simple int period) =>
    ma = switch type
        "SMA" =>
            ta.sma(source, period)
        "EMA" =>
            ta.ema(source, period)
        "HMA" =>
            ta.hma(source, period)
        "RMA" =>
            ta.rma(source, period)
        "VWMA" =>
            ta.vwma(source, period)
        "WMA" =>
            ta.wma(source, period)

// Inputs
ma_catagory = 'Enable / Period / Type / Source / Timeframe'

ma1_enable = input.bool(title = '1', defval = true, group = ma_catagory, inline = '1')
ma1_period = input.int(title = "", defval = 10, group = ma_catagory, inline = '1')
ma1_type = input.string(title = "", defval = "SMA", group = ma_catagory , options = ["SMA", "EMA", "HMA", "RMA", "VWMA", "WMA"], inline = '1')
ma1_src = input.source(title='', defval = close, group = ma_catagory, inline='1')
ma1_tf = input.timeframe(title='', defval = '', group = ma_catagory, inline='1')
 
ma2_enable = input.bool(title = '2', defval = true, group = ma_catagory, inline = '2')
ma2_period = input.int(title = "", defval = 20, group = ma_catagory, inline = '2')
ma2_type = input.string(title = "", defval = "SMA", group = ma_catagory , options = ["SMA", "EMA", "HMA", "RMA", "VWMA", "WMA"], inline = '2')
ma2_src = input.source(title='', defval = close, group = ma_catagory, inline='2')
ma2_tf = input.timeframe(title='', defval = '', group = ma_catagory, inline='2')
 
ma3_enable = input.bool(title = '3', defval = true, group = ma_catagory, inline = '3')
ma3_period = input.int(title = "", defval = 50, group = ma_catagory, inline = '3')
ma3_type = input.string(title = "", defval = "SMA", group = ma_catagory , options = ["SMA", "EMA", "HMA", "RMA", "VWMA", "WMA"], inline = '3')
ma3_src = input.source(title='', defval = close, group = ma_catagory, inline='3')
ma3_tf = input.timeframe(title='', defval = '', group = ma_catagory, inline='3')
 
ma4_enable = input.bool(title = '4', defval = true, group = ma_catagory, inline = '4')
ma4_period = input.int(title = "", defval = 100, group = ma_catagory, inline = '4')
ma4_type = input.string(title = "", defval = "SMA", group = ma_catagory , options = ["SMA", "EMA", "HMA", "RMA", "VWMA", "WMA"], inline = '4')
ma4_src = input.source(title='', defval = close, group = ma_catagory, inline='4')
ma4_tf = input.timeframe(title='', defval = '', group = ma_catagory, inline='4')
 
ma5_enable = input.bool(title = '5', defval = true, group = ma_catagory, inline = '5')
ma5_period = input.int(title = "", defval = 200, group = ma_catagory, inline = '5')
ma5_type = input.string(title = "", defval = "SMA", group = ma_catagory , options = ["SMA", "EMA", "HMA", "RMA", "VWMA", "WMA"], inline = '5')
ma5_src = input.source(title='', defval = close, group = ma_catagory, inline='5')
ma5_tf = input.timeframe(title='', defval = '', group = ma_catagory, inline='5')
 
ma6_enable = input.bool(title = '6', defval = false, group = ma_catagory, inline = '6')
ma6_period = input.int(title = "", defval = 1, group = ma_catagory, inline = '6')
ma6_type = input.string(title = "", defval = "SMA", group = ma_catagory , options = ["SMA", "EMA", "HMA", "RMA", "VWMA", "WMA"], inline = '6')
ma6_src = input.source(title='', defval = close, group = ma_catagory, inline='6')
ma6_tf = input.timeframe(title='', defval = '', group = ma_catagory, inline='6')
 
ma7_enable = input.bool(title = '7', defval = false, group = ma_catagory, inline = '7')
ma7_period = input.int(title = "", defval = 1, group = ma_catagory, inline = '7')
ma7_type = input.string(title = "", defval = "SMA", group = ma_catagory , options = ["SMA", "EMA", "HMA", "RMA", "VWMA", "WMA"], inline = '7')
ma7_src = input.source(title='', defval = close, group = ma_catagory, inline='7')
ma7_tf = input.timeframe(title='', defval = '', group = ma_catagory, inline='7')
 
ma8_enable = input.bool(title = '8', defval = false, group = ma_catagory, inline = '8')
ma8_period = input.int(title = "", defval = 1, group = ma_catagory, inline = '8')
ma8_type = input.string(title = "", defval = "SMA", group = ma_catagory , options = ["SMA", "EMA", "HMA", "RMA", "VWMA", "WMA"], inline = '8')
ma8_src = input.source(title='', defval = close, group = ma_catagory, inline='8')
ma8_tf = input.timeframe(title='', defval = '', group = ma_catagory, inline='8')

// Calc
ma1 = request.security(syminfo.tickerid, ma1_tf, ma(ma1_type, ma1_src, ma1_period))
ma2 = request.security(syminfo.tickerid, ma2_tf, ma(ma2_type, ma2_src, ma2_period))
ma3 = request.security(syminfo.tickerid, ma3_tf, ma(ma3_type, ma3_src, ma3_period))
ma4 = request.security(syminfo.tickerid, ma4_tf, ma(ma4_type, ma4_src, ma4_period))
ma5 = request.security(syminfo.tickerid, ma5_tf, ma(ma5_type, ma5_src, ma5_period))
ma6 = request.security(syminfo.tickerid, ma6_tf, ma(ma6_type, ma6_src, ma6_period))
ma7 = request.security(syminfo.tickerid, ma7_tf, ma(ma7_type, ma7_src, ma7_period))
ma8 = request.security(syminfo.tickerid, ma8_tf, ma(ma8_type, ma8_src, ma8_period))

// Output
plot(ma1_enable ? ma1 : na, title = 'MA1', color = color.new(#2ECC71, 0))
plot(ma2_enable ? ma2 : na, title = 'MA2', color = color.new(#3498DB, 0))
plot(ma3_enable ? ma3 : na, title = 'MA3', color = color.new(#F39C12, 0))
plot(ma4_enable ? ma4 : na, title = 'MA4', color = color.new(#9B59B6, 0))
plot(ma5_enable ? ma5 : na, title = 'MA5', color = color.new(#E74C3C, 0))
plot(ma6_enable ? ma6 : na, title = 'MA6', color = color.new(#E74C3C, 0))
plot(ma7_enable ? ma7 : na, title = 'MA7', color = color.new(#E74C3C, 0))
plot(ma8_enable ? ma8 : na, title = 'MA8', color = color.new(#E74C3C, 0))
