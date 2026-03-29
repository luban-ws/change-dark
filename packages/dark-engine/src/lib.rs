//! 暴露给浏览器（Chrome 扩展）的 WASM 接口；重计算委托给 `dark_color_utils`。
use wasm_bindgen::prelude::*;

/// 单批最大 RGB **字节**数（`3 * 524_288` 色 ≈ 1.5MiB）；超出则拒绝，避免 WASM 堆压力。
pub const MAX_BATCH_RGB_BYTES: usize = 3 * 524_288;

/// 导出给 JS：`k_means_rgb_centroids` 的 `k` 上限。
pub const MAX_K_MEANS_K: u8 = 32;

/// 导出给 JS：`max_iter` 上限（引擎内再夹紧）。
pub const MAX_K_MEANS_ITER: u32 = 500;

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

#[wasm_bindgen]
pub fn max_batch_rgb_bytes() -> usize {
    MAX_BATCH_RGB_BYTES
}

fn check_batch_rgb(rgb: &[u8]) -> Result<(), JsValue> {
    if rgb.len() > MAX_BATCH_RGB_BYTES {
        return Err(JsValue::from_str("batch RGB exceeds max_batch_rgb_bytes()"));
    }
    if rgb.len() % 3 != 0 {
        return Err(JsValue::from_str("batch RGB length must be a multiple of 3"));
    }
    Ok(())
}

/// 扁平 RGB → 每像素相对亮度 `Vec<f64>`（与 RFC 006 采样缓冲布局一致）。
#[wasm_bindgen]
pub fn batch_relative_luminance(rgb: &[u8]) -> Result<Vec<f64>, JsValue> {
    check_batch_rgb(rgb)?;
    dark_color_utils::batch_relative_luminance(rgb)
        .ok_or_else(|| JsValue::from_str("batch_relative_luminance: invalid layout"))
}

/// 扁平 RGB 批量 `mix_toward_black`，输出同形状。
#[wasm_bindgen]
pub fn batch_mix_toward_black(rgb: &[u8], amount: f64) -> Result<Vec<u8>, JsValue> {
    check_batch_rgb(rgb)?;
    dark_color_utils::batch_mix_toward_black(rgb, amount)
        .ok_or_else(|| JsValue::from_str("batch_mix_toward_black: invalid layout"))
}

/// k-means 质心，返回扁平 `[r,g,b] * k_eff`；`k` 为 0 或过大时由引擎夹紧/拒绝。
#[wasm_bindgen(js_name = kMeansRgbCentroids)]
pub fn k_means_rgb_centroids(rgb: &[u8], k: u8, max_iter: u32) -> Result<Vec<u8>, JsValue> {
    check_batch_rgb(rgb)?;
    if k == 0 {
        return Err(JsValue::from_str("k must be >= 1"));
    }
    let k = (k as usize).min(MAX_K_MEANS_K as usize);
    let max_iter = max_iter.min(MAX_K_MEANS_ITER).max(1);
    dark_color_utils::k_means_rgb_flat(rgb, k, max_iter)
        .ok_or_else(|| JsValue::from_str("k_means_rgb_centroids failed"))
}
