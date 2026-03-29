//! 暴露给浏览器（Chrome 扩展）的 WASM 接口；重计算委托给 `dark_color_utils`。
use wasm_bindgen::prelude::*;

/// 计算相对亮度，供内容脚本批量评估页面主题色（比往返 TS 数值循环更省 JS 开销）。
#[wasm_bindgen]
pub fn luminance_u8(r: u8, g: u8, b: u8) -> f64 {
    dark_color_utils::relative_luminance(r, g, b)
}

/// 将颜色向黑色混合，返回 [r,g,b] 便于 TS 一次性读取。
#[wasm_bindgen]
pub fn mix_toward_black(r: u8, g: u8, b: u8, amount: f64) -> Vec<u8> {
    let (nr, ng, nb) = dark_color_utils::mix_toward_black_rgb(r, g, b, amount);
    vec![nr, ng, nb]
}

/// 为深色背景给出建议前景色 [r,g,b]。
#[wasm_bindgen]
pub fn suggested_foreground_for_dark_bg(r: u8, g: u8, b: u8) -> Vec<u8> {
    let (fr, fg, fb) = dark_color_utils::foreground_for_dark_background(r, g, b);
    vec![fr, fg, fb]
}
