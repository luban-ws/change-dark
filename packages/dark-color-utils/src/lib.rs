//! 可复用的纯颜色运算，供 `dark_engine` 与其它 Rust crate 引用。
//! 设计为 `no_std` 友好且无副作用，便于在 WASM 内做批量调用。

pub mod analyze_background_image;
pub mod modify_colors;
pub mod parse_css_color;

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

/// 全像素 RGB 算术平均（扁平缓冲），用于退化情形。
fn mean_rgb_flat(rgb: &[u8]) -> Option<Vec<u8>> {
    if rgb.len() % 3 != 0 || rgb.is_empty() {
        return None;
    }
    let n = rgb.len() / 3;
    let mut sr = 0f64;
    let mut sg = 0f64;
    let mut sb = 0f64;
    for i in 0..n {
        let b = i * 3;
        sr += rgb[b] as f64;
        sg += rgb[b + 1] as f64;
        sb += rgb[b + 2] as f64;
    }
    let nf = n as f64;
    Some(vec![
        (sr / nf).round().clamp(0.0, 255.0) as u8,
        (sg / nf).round().clamp(0.0, 255.0) as u8,
        (sb / nf).round().clamp(0.0, 255.0) as u8,
    ])
}

/// 当双簇得到的「暗簇」仍偏亮时，用「最暗一段像素」的 RGB 均值再压一档（典型：浅顶栏样本多，暗簇被中灰拉亮）。
const DARK_CLUSTER_MAX_LUM_FOR_QUANTILE_REFINE: f64 = 0.22;
/// 取最暗 `frac` 比例（向上取整至少 1 个像素）做均值，用于上条回退。
const DARKEST_REFINE_FRAC: f64 = 0.28;
/// Otsu 阈值所需最少像素（直方图才有统计意义）。
const OTSU_MIN_PIXELS: usize = 16;
/// 若较暗簇像素数低于 `max(3, n * 该比例)`，认为 Lloyd 不可靠，改用暗分位估计。
const MIN_DARK_CLUSTER_FRAC: f64 = 1.0 / 12.0;
/// 暗簇过小时使用的分位宽度（略宽于 `DARKEST_REFINE_FRAC`，多吞一点主区样本）。
const SMALL_CLUSTER_QUANTILE_FRAC: f64 = 0.35;

/// 将 WCAG L（0..1）量化为 0..=255 直方图槽，与 Otsu 经典定义一致。
#[inline]
fn luminance_to_bin(l: f64) -> usize {
    (l * 255.0).round().clamp(0.0, 255.0) as usize
}

/// Otsu：在 256 档灰度直方图上最大化类间方差，返回分割阈值（0..=255）。
fn otsu_threshold_u8(hist: &[u32; 256]) -> Option<u8> {
    let total: u32 = hist.iter().sum();
    if total == 0 {
        return None;
    }
    let total_f = total as f64;
    let mut sum = 0.0f64;
    for i in 0..256 {
        sum += i as f64 * hist[i] as f64;
    }
    let mut sum_b = 0.0f64;
    let mut w_b = 0.0f64;
    let mut max_between = -1.0f64;
    let mut threshold = 0u8;
    for t in 0..256 {
        w_b += hist[t] as f64;
        if w_b == 0.0 {
            continue;
        }
        let w_f = total_f - w_b;
        if w_f == 0.0 {
            break;
        }
        sum_b += t as f64 * hist[t] as f64;
        let m_b = sum_b / w_b;
        let m_f = (sum - sum_b) / w_f;
        let between = w_b * w_f * (m_b - m_f).powi(2);
        if between > max_between {
            max_between = between;
            threshold = t as u8;
        }
    }
    Some(threshold)
}

/// 暗簇内按通道取中位数，减轻单点离群（如一道高亮描边）对均值的拉动。
fn median_rgb_for_indices(rgb: &[u8], idxs: &[usize]) -> Option<Vec<u8>> {
    if idxs.is_empty() {
        return None;
    }
    let mut rs: Vec<u8> = idxs.iter().map(|&i| rgb[i * 3]).collect();
    let mut gs: Vec<u8> = idxs.iter().map(|&i| rgb[i * 3 + 1]).collect();
    let mut bs: Vec<u8> = idxs.iter().map(|&i| rgb[i * 3 + 2]).collect();
    rs.sort_unstable();
    gs.sort_unstable();
    bs.sort_unstable();
    let n = idxs.len();
    let mid = n / 2;
    let r = if n % 2 == 0 {
        ((rs[mid - 1] as u32 + rs[mid] as u32 + 1) / 2) as u8
    } else {
        rs[mid]
    };
    let g = if n % 2 == 0 {
        ((gs[mid - 1] as u32 + gs[mid] as u32 + 1) / 2) as u8
    } else {
        gs[mid]
    };
    let b = if n % 2 == 0 {
        ((bs[mid - 1] as u32 + bs[mid] as u32 + 1) / 2) as u8
    } else {
        bs[mid]
    };
    Some(vec![r, g, b])
}

/// 一维亮度直方图 Otsu 分割后，取**平均亮度更低**一侧的 RGB 均值（双峰页上常与 Lloyd 互补）。
fn otsu_darker_centroid_rgb(rgb: &[u8], lum: &[f64]) -> Option<Vec<u8>> {
    let n = lum.len();
    if n < OTSU_MIN_PIXELS || rgb.len() != n * 3 {
        return None;
    }
    let mut hist = [0u32; 256];
    for i in 0..n {
        hist[luminance_to_bin(lum[i])] += 1;
    }
    let t = otsu_threshold_u8(&hist)?;
    let mut sum_l = [0.0f64; 2];
    let mut cnt = [0usize; 2];
    for i in 0..n {
        let c = if luminance_to_bin(lum[i]) <= t as usize {
            0
        } else {
            1
        };
        sum_l[c] += lum[i];
        cnt[c] += 1;
    }
    if cnt[0] == 0 || cnt[1] == 0 {
        return None;
    }
    let ml0 = sum_l[0] / cnt[0] as f64;
    let ml1 = sum_l[1] / cnt[1] as f64;
    let dark_side = if ml0 <= ml1 { 0 } else { 1 };
    let mut sr = 0.0f64;
    let mut sg = 0.0f64;
    let mut sb = 0.0f64;
    let mut k = 0usize;
    for i in 0..n {
        let c = if luminance_to_bin(lum[i]) <= t as usize {
            0
        } else {
            1
        };
        if c != dark_side {
            continue;
        }
        let b = i * 3;
        sr += rgb[b] as f64;
        sg += rgb[b + 1] as f64;
        sb += rgb[b + 2] as f64;
        k += 1;
    }
    if k == 0 {
        return None;
    }
    let kf = k as f64;
    Some(vec![
        (sr / kf).round().clamp(0.0, 255.0) as u8,
        (sg / kf).round().clamp(0.0, 255.0) as u8,
        (sb / kf).round().clamp(0.0, 255.0) as u8,
    ])
}

/// 按相对亮度排序后，取最暗 `quantile_frac` 比例像素的 RGB 算术平均（`quantile_frac` 会夹紧到合理范围）。
fn mean_rgb_darkest_quantile(rgb: &[u8], quantile_frac: f64) -> Option<Vec<u8>> {
    if rgb.len() % 3 != 0 || rgb.is_empty() {
        return None;
    }
    let n = rgb.len() / 3;
    let mut order: Vec<usize> = (0..n).collect();
    order.sort_by(|&a, &b| {
        let ba = a * 3;
        let bb = b * 3;
        let la = relative_luminance(rgb[ba], rgb[ba + 1], rgb[ba + 2]);
        let lb = relative_luminance(rgb[bb], rgb[bb + 1], rgb[bb + 2]);
        la.partial_cmp(&lb).unwrap()
    });
    let q = quantile_frac.clamp(0.05, 0.5);
    let take = ((n as f64) * q).ceil().max(1.0) as usize;
    let take = take.min(n);
    let mut sr = 0f64;
    let mut sg = 0f64;
    let mut sb = 0f64;
    for i in 0..take {
        let j = order[i];
        let b = j * 3;
        sr += rgb[b] as f64;
        sg += rgb[b + 1] as f64;
        sb += rgb[b + 2] as f64;
    }
    let tf = take as f64;
    Some(vec![
        (sr / tf).round().clamp(0.0, 255.0) as u8,
        (sg / tf).round().clamp(0.0, 255.0) as u8,
        (sb / tf).round().clamp(0.0, 255.0) as u8,
    ])
}

/// 在 **WCAG 相对亮度** 上做 k=2 Lloyd；较暗簇用 **分通道中位数 RGB**（抗离群）；暗簇过小则改用最暗分位。
/// 与 **Otsu 直方图分割** 候选取 **相对亮度更低** 者（双峰页上 Otsu 常更贴阈值）。
/// 最后再跑暗尾分位回退（见常量）。
fn k_means_two_clusters_luminance_then_darker_rgb(rgb: &[u8], max_iter: u32) -> Option<Vec<u8>> {
    if rgb.len() % 3 != 0 {
        return None;
    }
    let n = rgb.len() / 3;
    if n < 3 {
        return None;
    }
    let max_iter = max_iter.max(1);
    let mut lum = Vec::with_capacity(n);
    let mut l_min = f64::INFINITY;
    let mut l_max = f64::NEG_INFINITY;
    for i in 0..n {
        let b = i * 3;
        let li = relative_luminance(rgb[b], rgb[b + 1], rgb[b + 2]);
        lum.push(li);
        l_min = l_min.min(li);
        l_max = l_max.max(li);
    }
    if (l_max - l_min).abs() < 1e-9 {
        return mean_rgb_flat(rgb);
    }

    let mut c0 = l_min;
    let mut c1 = l_max;
    let mut assign = vec![0usize; n];

    for _ in 0..max_iter {
        for i in 0..n {
            let d0 = (lum[i] - c0).abs();
            let d1 = (lum[i] - c1).abs();
            assign[i] = if d0 <= d1 { 0 } else { 1 };
        }
        let mut sum_l = [0.0f64; 2];
        let mut cnt = [0usize; 2];
        for i in 0..n {
            let j = assign[i];
            sum_l[j] += lum[i];
            cnt[j] += 1;
        }
        if cnt[0] == 0 || cnt[1] == 0 {
            return mean_rgb_flat(rgb);
        }
        let n0 = sum_l[0] / cnt[0] as f64;
        let n1 = sum_l[1] / cnt[1] as f64;
        if (n0 - c0).abs() < 1e-6 && (n1 - c1).abs() < 1e-6 {
            c0 = n0;
            c1 = n1;
            break;
        }
        c0 = n0;
        c1 = n1;
    }

    for i in 0..n {
        let d0 = (lum[i] - c0).abs();
        let d1 = (lum[i] - c1).abs();
        assign[i] = if d0 <= d1 { 0 } else { 1 };
    }

    let mut sum_l = [0.0f64; 2];
    let mut cnt = [0usize; 2];
    for i in 0..n {
        let j = assign[i];
        sum_l[j] += lum[i];
        cnt[j] += 1;
    }
    if cnt[0] == 0 || cnt[1] == 0 {
        return mean_rgb_flat(rgb);
    }
    let ml0 = sum_l[0] / cnt[0] as f64;
    let ml1 = sum_l[1] / cnt[1] as f64;
    let idx = if ml0 <= ml1 { 0 } else { 1 };
    let dark_indices: Vec<usize> = (0..n).filter(|&i| assign[i] == idx).collect();
    let min_dark = ((n as f64) * MIN_DARK_CLUSTER_FRAC).ceil().max(3.0) as usize;
    let lloyd_cand = if dark_indices.len() < min_dark {
        mean_rgb_darkest_quantile(rgb, SMALL_CLUSTER_QUANTILE_FRAC)?
    } else {
        median_rgb_for_indices(rgb, &dark_indices)?
    };

    let otsu_cand = otsu_darker_centroid_rgb(rgb, &lum);
    let mut cand = match (Some(lloyd_cand), otsu_cand) {
        (Some(a), Some(b)) => {
            let la = relative_luminance(a[0], a[1], a[2]);
            let lb = relative_luminance(b[0], b[1], b[2]);
            if la <= lb {
                a
            } else {
                b
            }
        }
        (Some(a), None) => a,
        (None, Some(b)) => b,
        (None, None) => return None,
    };

    let lc = relative_luminance(cand[0], cand[1], cand[2]);
    if lc > DARK_CLUSTER_MAX_LUM_FOR_QUANTILE_REFINE {
        if let Some(q) = mean_rgb_darkest_quantile(rgb, DARKEST_REFINE_FRAC) {
            let lq = relative_luminance(q[0], q[1], q[2]);
            if lq + 1e-9 < lc {
                cand = q;
            }
        }
    }
    Some(cand)
}

/// Dynamic 主题：在亮度轴上分层后取**较暗层**代表 RGB（Lloyd 中位数 + Otsu 候选取更暗 + 条件暗分位）。
///
/// 典型站点同时含浅色顶栏与深色主区时，k=1 的单一质心会被浅色拉高；`n≥3` 时在 **亮度轴**上做 k=2，再对各簇取 **分通道中位数**（抗离群），并与 **Otsu** 直方图分割候选比较取更暗者。样本极少时退化为单点或全样本均值。
pub fn k_means_darker_centroid_rgb(rgb: &[u8], max_iter: u32) -> Option<Vec<u8>> {
    if rgb.len() % 3 != 0 {
        return None;
    }
    let n = rgb.len() / 3;
    let max_iter = max_iter.max(1);
    match n {
        0 => None,
        1 => Some(vec![rgb[0], rgb[1], rgb[2]]),
        2 => {
            let l0 = relative_luminance(rgb[0], rgb[1], rgb[2]);
            let l1 = relative_luminance(rgb[3], rgb[4], rgb[5]);
            if l0 <= l1 {
                Some(vec![rgb[0], rgb[1], rgb[2]])
            } else {
                Some(vec![rgb[3], rgb[4], rgb[5]])
            }
        }
        _ => k_means_two_clusters_luminance_then_darker_rgb(rgb, max_iter),
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

    #[test]
    fn k_means_darker_prefers_dark_blob() {
        let mut rgb = Vec::new();
        for _ in 0..10 {
            rgb.extend_from_slice(&[245u8, 245, 248]);
        }
        for _ in 0..20 {
            rgb.extend_from_slice(&[12u8, 12, 14]);
        }
        let d = k_means_darker_centroid_rgb(&rgb, 40).unwrap();
        let l = relative_luminance(d[0], d[1], d[2]);
        assert!(l < 0.2, "expected dark cluster, lum={}", l);
    }

    #[test]
    fn k_means_darker_two_pixels_picks_darker() {
        let rgb = vec![250u8, 250, 250, 5u8, 5, 8];
        let d = k_means_darker_centroid_rgb(&rgb, 10).unwrap();
        assert_eq!(d, vec![5u8, 5, 8]);
    }

    /// 高饱和红 vs 高饱和蓝：RGB 欧氏 k=2 按「色度」分簇；Dynamic 目标按**亮度**分簇，应仍得到较暗一侧（蓝）的均值而非较亮（红）。
    #[test]
    fn k_means_darker_uses_luminance_axis_not_rgb_chroma() {
        let mut rgb = Vec::new();
        for _ in 0..15 {
            rgb.extend_from_slice(&[240u8, 30, 30]);
        }
        for _ in 0..15 {
            rgb.extend_from_slice(&[25u8, 25, 230]);
        }
        let d = k_means_darker_centroid_rgb(&rgb, 40).unwrap();
        let l = relative_luminance(d[0], d[1], d[2]);
        let lr = relative_luminance(240, 30, 30);
        let lb = relative_luminance(25, 25, 230);
        let lo = lr.min(lb);
        let hi = lr.max(lb);
        assert!(
            l <= lo + 0.12,
            "expected darker blob centroid, got lum={} (range {}..{})",
            l,
            lo,
            hi
        );
    }

    /// 暗簇均值仍偏灰、但缓冲里混有真黑像素时，最暗分位应把基色拉深（顶栏+中灰主区+零星黑边）。
    #[test]
    fn k_means_darker_quantile_refines_when_cluster_mean_still_gray() {
        let mut rgb = Vec::new();
        for _ in 0..30 {
            rgb.extend_from_slice(&[180u8, 180, 180]);
        }
        for _ in 0..5 {
            rgb.extend_from_slice(&[5u8, 5, 8]);
        }
        let d = k_means_darker_centroid_rgb(&rgb, 40).unwrap();
        let l = relative_luminance(d[0], d[1], d[2]);
        assert!(l < 0.2, "expected quantile refine toward dark tail, lum={}", l);
    }

    /// 暗簇中混入单颗极亮样本时，中位数应压住均值上漂。
    #[test]
    fn k_means_darker_median_resists_single_bright_outlier() {
        let mut rgb = Vec::new();
        for _ in 0..22 {
            rgb.extend_from_slice(&[14u8, 14, 17]);
        }
        rgb.extend_from_slice(&[248u8, 248, 250]);
        let d = k_means_darker_centroid_rgb(&rgb, 40).unwrap();
        let l = relative_luminance(d[0], d[1], d[2]);
        assert!(l < 0.12, "expected median-like dark base, lum={}", l);
    }

    /// 亮度几乎相同时应退化为全样本均值（内部 `mean_rgb_flat`），避免双簇塌缩。
    #[test]
    fn k_means_darker_near_uniform_luminance_returns_mean_rgb() {
        let rgb = vec![100u8, 120, 140, 102u8, 118, 139, 101u8, 119, 138];
        let d = k_means_darker_centroid_rgb(&rgb, 40).unwrap();
        let lm = relative_luminance(d[0], d[1], d[2]);
        let mut sr = 0f64;
        let mut sg = 0f64;
        let mut sb = 0f64;
        for i in 0..3 {
            let b = i * 3;
            sr += rgb[b] as f64;
            sg += rgb[b + 1] as f64;
            sb += rgb[b + 2] as f64;
        }
        let exp = relative_luminance(
            (sr / 3.0).round() as u8,
            (sg / 3.0).round() as u8,
            (sb / 3.0).round() as u8,
        );
        assert!((lm - exp).abs() < 0.08, "lum={} exp≈{}", lm, exp);
    }
}
