//! 可复用的纯颜色运算，供 `dark_engine` 与其它 Rust crate 引用。
//! 设计为 `no_std` 友好且无副作用，便于在 WASM 内做批量调用。

/// sRGB 通道线性化（约 gamma 解码），入参为 0..=1。
#[inline]
pub fn channel_to_linear_u8(c: u8) -> f64 {
    let x = (c as f64) / 255.0;
    if x <= 0.04045 {
        x / 12.92
    } else {
        ((x + 0.055) / 1.055).powf(2.4)
    }
}

/// WCAG 2.x 相对亮度（0..1），用于判断背景深浅。
#[inline]
pub fn relative_luminance(r: u8, g: u8, b: u8) -> f64 {
    0.2126 * channel_to_linear_u8(r)
        + 0.7152 * channel_to_linear_u8(g)
        + 0.0722 * channel_to_linear_u8(b)
}

/// 将 RGB 向黑色混合，`amount` ∈ [0,1]，0 不变，1 为纯黑。
#[inline]
pub fn mix_toward_black_rgb(r: u8, g: u8, b: u8, amount: f64) -> (u8, u8, u8) {
    let a = amount.clamp(0.0, 1.0);
    let lerp = |c: u8| -> u8 { (c as f64 * (1.0 - a)).round() as u8 };
    (lerp(r), lerp(g), lerp(b))
}

/// 根据亮度估算一个深色背景上的前景色（高对比浅灰）。
#[inline]
pub fn foreground_for_dark_background(bg_r: u8, bg_g: u8, bg_b: u8) -> (u8, u8, u8) {
    let lum = relative_luminance(bg_r, bg_g, bg_b);
    // 背景越亮，需要越深的前景色；这里用简单分段保持可读性。
    if lum > 0.55 {
        (18, 18, 22)
    } else {
        (230, 230, 235)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn luminance_white_is_oneish() {
        let l = relative_luminance(255, 255, 255);
        assert!((l - 1.0).abs() < 1e-3);
    }

    #[test]
    fn mix_full_to_black() {
        let (r, g, b) = mix_toward_black_rgb(200, 100, 50, 1.0);
        assert_eq!((r, g, b), (0, 0, 0));
    }

    #[test]
    fn mix_none_unchanged() {
        let t = (40u8, 80u8, 120u8);
        assert_eq!(mix_toward_black_rgb(t.0, t.1, t.2, 0.0), t);
    }
}
