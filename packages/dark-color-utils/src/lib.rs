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

/// 与 [RFC 005]/[RFC 006] 一致：**扁平 RGB**，每连续 3 字节为 `(r,g,b)`。
/// `rgb.len()` 须为 3 的倍数；否则返回 `None`。
#[inline]
pub fn batch_relative_luminance(rgb: &[u8]) -> Option<Vec<f64>> {
    if rgb.len() % 3 != 0 {
        return None;
    }
    let n = rgb.len() / 3;
    let mut out = Vec::with_capacity(n);
    for i in 0..n {
        let b = i * 3;
        out.push(relative_luminance(rgb[b], rgb[b + 1], rgb[b + 2]));
    }
    Some(out)
}

/// 对每个 `(r,g,b)` 调用 `mix_toward_black_rgb`，输出同布局扁平 `Vec<u8>`。
#[inline]
pub fn batch_mix_toward_black(rgb: &[u8], amount: f64) -> Option<Vec<u8>> {
    if rgb.len() % 3 != 0 {
        return None;
    }
    let n = rgb.len() / 3;
    let mut out = Vec::with_capacity(rgb.len());
    for i in 0..n {
        let b = i * 3;
        let (r, g, bl) = mix_toward_black_rgb(rgb[b], rgb[b + 1], rgb[b + 2], amount);
        out.push(r);
        out.push(g);
        out.push(bl);
    }
    Some(out)
}

/// 在 sRGB 字节空间对点做 Lloyd k-means（欧氏距离）。
///
/// - 输入：扁平 RGB，长度为 `3 * n`。
/// - `k`：期望簇数；若 `n < k`，实际簇数为 `n`。
/// - 初始化：前 `k_eff` 个点的 RGB 为初始质心（**确定性**）。
/// - 空簇：该轮保持上一质心不变。
/// - 返回：扁平质心 `[r,g,b] * k_eff`，分量四舍五入为 `u8`。
pub fn k_means_rgb_flat(rgb: &[u8], k: usize, max_iter: u32) -> Option<Vec<u8>> {
    if k == 0 || rgb.len() % 3 != 0 {
        return None;
    }
    let n = rgb.len() / 3;
    if n == 0 {
        return Some(Vec::new());
    }
    let k_eff = k.min(n);
    let max_iter = max_iter.max(1);

    let mut centroids: Vec<(f64, f64, f64)> = Vec::with_capacity(k_eff);
    for i in 0..k_eff {
        let b = i * 3;
        centroids.push((
            rgb[b] as f64,
            rgb[b + 1] as f64,
            rgb[b + 2] as f64,
        ));
    }

    let mut assignments = vec![0usize; n];
    let mut prev = vec![usize::MAX; n];

    for _ in 0..max_iter {
        for i in 0..n {
            let base = i * 3;
            let pr = rgb[base] as f64;
            let pg = rgb[base + 1] as f64;
            let pb = rgb[base + 2] as f64;
            let mut best_j = 0usize;
            let mut best_d = f64::INFINITY;
            for j in 0..k_eff {
                let (cr, cg, cb) = centroids[j];
                let d = (pr - cr).powi(2) + (pg - cg).powi(2) + (pb - cb).powi(2);
                if d < best_d {
                    best_d = d;
                    best_j = j;
                }
            }
            assignments[i] = best_j;
        }

        if assignments == prev {
            break;
        }
        prev.copy_from_slice(&assignments);

        let mut sums = vec![(0f64, 0f64, 0f64); k_eff];
        let mut counts = vec![0usize; k_eff];
        for i in 0..n {
            let j = assignments[i];
            let base = i * 3;
            sums[j].0 += rgb[base] as f64;
            sums[j].1 += rgb[base + 1] as f64;
            sums[j].2 += rgb[base + 2] as f64;
            counts[j] += 1;
        }
        for j in 0..k_eff {
            if counts[j] == 0 {
                continue;
            }
            let c = counts[j] as f64;
            centroids[j] = (sums[j].0 / c, sums[j].1 / c, sums[j].2 / c);
        }
    }

    let mut out = Vec::with_capacity(3 * k_eff);
    for (r, g, b) in centroids {
        out.push(r.round().clamp(0.0, 255.0) as u8);
        out.push(g.round().clamp(0.0, 255.0) as u8);
        out.push(b.round().clamp(0.0, 255.0) as u8);
    }
    Some(out)
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

    #[test]
    fn batch_relative_luminance_layout() {
        let rgb = vec![0u8, 0, 0, 128, 128, 128, 255, 255, 255];
        let l = batch_relative_luminance(&rgb).unwrap();
        assert_eq!(l.len(), 3);
        assert!(l[0] < l[1] && l[1] < l[2]);
    }

    #[test]
    fn batch_mix_matches_scalar() {
        let rgb = vec![100u8, 120, 140, 200, 20, 30];
        let batch = batch_mix_toward_black(&rgb, 0.5).unwrap();
        for i in 0..2 {
            let b = i * 3;
            let s = mix_toward_black_rgb(rgb[b], rgb[b + 1], rgb[b + 2], 0.5);
            assert_eq!((batch[b], batch[b + 1], batch[b + 2]), s);
        }
    }

    #[test]
    fn k_means_two_blobs() {
        let mut rgb = Vec::new();
        for _ in 0..12 {
            rgb.extend_from_slice(&[240u8, 30, 30]);
        }
        for _ in 0..12 {
            rgb.extend_from_slice(&[25u8, 25, 230]);
        }
        let c = k_means_rgb_flat(&rgb, 2, 50).unwrap();
        assert_eq!(c.len(), 6);
        let r_l = relative_luminance(c[0], c[1], c[2]);
        let b_l = relative_luminance(c[3], c[4], c[5]);
        let (hi, lo) = if r_l >= b_l { (0, 3) } else { (3, 0) };
        // 高亮度簇应偏红，低亮度簇应偏蓝（通道和对比）
        assert!(c[hi + 0] as i32 > c[lo + 0] as i32);
        assert!((c[lo + 2] as i32) > (c[hi + 2] as i32));
    }
}
