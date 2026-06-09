//! RFC 031 P1-5：位图背景图 RGBA 像素亮度分析（对齐 Dark Reader `image.ts` 阈值）。

use crate::relative_luminance;

/// 下采样分析像素上限（DR 同档 32×32）。
pub const MAX_ANALYSIS_PIXELS: usize = 32 * 32;

pub const TRANSPARENT_ALPHA_THRESHOLD: f64 = 0.05;
pub const DARK_LIGHTNESS_THRESHOLD: f64 = 0.4;
pub const LIGHT_LIGHTNESS_THRESHOLD: f64 = 0.7;
pub const DARK_IMAGE_RATIO_THRESHOLD: f64 = 0.7;
pub const LIGHT_IMAGE_RATIO_THRESHOLD: f64 = 0.7;
pub const TRANSPARENT_IMAGE_RATIO_THRESHOLD: f64 = 0.1;

/// 亮背景图默认压暗系数（0..1，对应 CSS `brightness(70%)`）。
pub const DEFAULT_LIGHT_BG_BRIGHTNESS: f64 = 0.7;

/// 分析结果：是否暗图 / 亮图 / 高透明。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BackgroundImageAnalysis {
    pub is_dark: bool,
    pub is_light: bool,
    pub is_transparent: bool,
    pub opaque_pixel_count: u32,
    pub total_pixel_count: u32,
}

impl BackgroundImageAnalysis {
    pub const EMPTY: Self = Self {
        is_dark: false,
        is_light: false,
        is_transparent: false,
        opaque_pixel_count: 0,
        total_pixel_count: 0,
    };
}

/// 计算绘制到分析画布的目标尺寸（保持比例，像素数 ≤ `MAX_ANALYSIS_PIXELS`）。
pub fn analysis_canvas_size(source_width: u32, source_height: u32) -> (u32, u32) {
    if source_width == 0 || source_height == 0 {
        return (0, 0);
    }
    let sw = source_width as f64;
    let sh = source_height as f64;
    let source_pixels = sw * sh;
    let k = (1.0_f64).min((MAX_ANALYSIS_PIXELS as f64 / source_pixels).sqrt());
    let w = (sw * k).ceil().max(1.0) as u32;
    let h = (sh * k).ceil().max(1.0) as u32;
    (w, h)
}

/**
 * 分析 RGBA 像素缓冲（行优先，`data.len()` = width * height * 4）。
 * 无效布局 → `BackgroundImageAnalysis::EMPTY`。
 */
pub fn analyze_background_image_rgba(
    data: &[u8],
    width: u32,
    height: u32,
) -> BackgroundImageAnalysis {
    let total = width.saturating_mul(height) as usize;
    if total == 0 || data.len() < total * 4 {
        return BackgroundImageAnalysis::EMPTY;
    }

    let mut transparent_pixels: u32 = 0;
    let mut dark_pixels: u32 = 0;
    let mut light_pixels: u32 = 0;
    let mut opaque_pixel_count: u32 = 0;

    for i in 0..total {
        let o = i * 4;
        let r = data[o];
        let g = data[o + 1];
        let b = data[o + 2];
        let a = data[o + 3];
        let alpha = (a as f64) / 255.0;
        if alpha < TRANSPARENT_ALPHA_THRESHOLD {
            transparent_pixels += 1;
            continue;
        }
        opaque_pixel_count += 1;
        let l = relative_luminance(r, g, b);
        if l < DARK_LIGHTNESS_THRESHOLD {
            dark_pixels += 1;
        }
        if l > LIGHT_LIGHTNESS_THRESHOLD {
            light_pixels += 1;
        }
    }

    let total_pixel_count = total as u32;
    if opaque_pixel_count == 0 {
        return BackgroundImageAnalysis {
            is_dark: false,
            is_light: false,
            is_transparent: (transparent_pixels as f64 / total_pixel_count as f64)
                >= TRANSPARENT_IMAGE_RATIO_THRESHOLD,
            opaque_pixel_count: 0,
            total_pixel_count,
        };
    }

    let opaque = opaque_pixel_count as f64;
    BackgroundImageAnalysis {
        is_dark: (dark_pixels as f64 / opaque) >= DARK_IMAGE_RATIO_THRESHOLD,
        is_light: (light_pixels as f64 / opaque) >= LIGHT_IMAGE_RATIO_THRESHOLD,
        is_transparent: (transparent_pixels as f64 / total_pixel_count as f64)
            >= TRANSPARENT_IMAGE_RATIO_THRESHOLD,
        opaque_pixel_count,
        total_pixel_count,
    }
}

/// 亮图 → `brightness(70%)` 等；暗/透明/非亮 → `None`。
pub fn brightness_filter_for_analysis(
    analysis: &BackgroundImageAnalysis,
    brightness: f64,
) -> Option<String> {
    if analysis.is_transparent || analysis.is_dark || !analysis.is_light {
        return None;
    }
    let pct = (brightness.clamp(0.1, 1.0) * 100.0).round() as u32;
    Some(format!("brightness({pct}%)"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rgba_pixel(r: u8, g: u8, b: u8, a: u8) -> [u8; 4] {
        [r, g, b, a]
    }

    #[test]
    fn white_image_is_light() {
        let w = 4u32;
        let h = 4u32;
        let mut data = Vec::new();
        for _ in 0..(w * h) {
            data.extend_from_slice(&rgba_pixel(255, 255, 255, 255));
        }
        let a = analyze_background_image_rgba(&data, w, h);
        assert!(a.is_light);
        assert!(!a.is_dark);
        assert_eq!(
            brightness_filter_for_analysis(&a, DEFAULT_LIGHT_BG_BRIGHTNESS),
            Some("brightness(70%)".to_string())
        );
    }

    #[test]
    fn black_image_is_dark() {
        let w = 4u32;
        let h = 4u32;
        let mut data = Vec::new();
        for _ in 0..(w * h) {
            data.extend_from_slice(&rgba_pixel(0, 0, 0, 255));
        }
        let a = analyze_background_image_rgba(&data, w, h);
        assert!(a.is_dark);
        assert!(brightness_filter_for_analysis(&a, DEFAULT_LIGHT_BG_BRIGHTNESS).is_none());
    }

    #[test]
    fn transparent_image() {
        let data = vec![0u8; 16];
        let a = analyze_background_image_rgba(&data, 2, 2);
        assert!(a.is_transparent);
        assert!(brightness_filter_for_analysis(&a, DEFAULT_LIGHT_BG_BRIGHTNESS).is_none());
    }

    #[test]
    fn analysis_canvas_size_scales_large_images() {
        let (w, h) = analysis_canvas_size(1000, 500);
        assert!(w > 0 && h > 0);
        assert!((w * h) as usize <= MAX_ANALYSIS_PIXELS * 2);
    }
}
