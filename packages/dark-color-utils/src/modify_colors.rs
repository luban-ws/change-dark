//! RFC 031 §2：逐色变换 `modifyColor`（对齐 Dark Reader `modify-colors.ts`）。
//! sRGB ↔ HSL 在字节空间直算，不走 gamma 线性化。

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Hsl {
    /// 0..360
    pub h: f64,
    /// 0..1
    pub s: f64,
    /// 0..1
    pub l: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ColorProfile {
    pub max_bg_lightness: f64,
    pub min_fg_lightness: f64,
    pub pole_bg: Hsl,
    pub pole_fg: Hsl,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum ColorUse {
    Bg = 0,
    Fg = 1,
    Border = 2,
}

impl ColorUse {
    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            0 => Some(Self::Bg),
            1 => Some(Self::Fg),
            2 => Some(Self::Border),
            _ => None,
        }
    }
}

/// RFC 031 §2.1：`dark` 默认 profile（pole ≈ #181a1b / #e8e6e3）。
pub fn default_dark_profile() -> ColorProfile {
    ColorProfile {
        max_bg_lightness: 0.4,
        min_fg_lightness: 0.55,
        pole_bg: rgb_to_hsl(Rgb {
            r: 0x18,
            g: 0x1a,
            b: 0x1b,
        }),
        pole_fg: rgb_to_hsl(Rgb {
            r: 0xe8,
            g: 0xe6,
            b: 0xe3,
        }),
    }
}

/// WASM / TS profile 标签（§5.1.1）。
pub const PROFILE_TAG_DARK: u8 = 0;
pub const PROFILE_TAG_SOLARIZED_DARK: u8 = 1;

/// Solarized Dark pole：base03 / base1（与 `page-palette.ts` 同源）。
pub fn solarized_dark_profile() -> ColorProfile {
    ColorProfile {
        max_bg_lightness: 0.4,
        min_fg_lightness: 0.55,
        pole_bg: rgb_to_hsl(Rgb {
            r: 0,
            g: 43,
            b: 54,
        }),
        pole_fg: rgb_to_hsl(Rgb {
            r: 147,
            g: 161,
            b: 161,
        }),
    }
}

pub fn profile_for_tag(tag: u8) -> ColorProfile {
    match tag {
        PROFILE_TAG_SOLARIZED_DARK => solarized_dark_profile(),
        _ => default_dark_profile(),
    }
}

#[inline]
pub fn scale(x: f64, in_lo: f64, in_hi: f64, out_lo: f64, out_hi: f64) -> f64 {
    if (in_hi - in_lo).abs() < f64::EPSILON {
        return out_lo;
    }
    out_lo + (x - in_lo) * (out_hi - out_lo) / (in_hi - in_lo)
}

#[inline]
fn clamp(x: f64, lo: f64, hi: f64) -> f64 {
    x.clamp(lo, hi)
}

pub fn rgb_to_hsl(rgb: Rgb) -> Hsl {
    let rn = rgb.r as f64 / 255.0;
    let gn = rgb.g as f64 / 255.0;
    let bn = rgb.b as f64 / 255.0;
    let max = rn.max(gn).max(bn);
    let min = rn.min(gn).min(bn);
    let d = max - min;
    let l = (max + min) / 2.0;

    let mut h = 0.0;
    let mut s = 0.0;
    if d != 0.0 {
        s = if l > 0.5 {
            d / (2.0 - max - min)
        } else {
            d / (max + min)
        };
        h = if (max - rn).abs() < f64::EPSILON {
            ((gn - bn) / d + if gn < bn { 6.0 } else { 0.0 }) * 60.0
        } else if (max - gn).abs() < f64::EPSILON {
            ((bn - rn) / d + 2.0) * 60.0
        } else {
            ((rn - gn) / d + 4.0) * 60.0
        };
    }
    Hsl { h, s, l }
}

pub fn hsl_to_rgb(hsl: Hsl) -> Rgb {
    let hn = ((hsl.h % 360.0) + 360.0) % 360.0 / 360.0;
    if hsl.s == 0.0 {
        let v = (hsl.l * 255.0).round() as u8;
        return Rgb { r: v, g: v, b: v };
    }
    let q = if hsl.l < 0.5 {
        hsl.l * (1.0 + hsl.s)
    } else {
        hsl.l + hsl.s - hsl.l * hsl.s
    };
    let p = 2.0 * hsl.l - q;
    let ch = |t: f64| -> f64 {
        let mut tt = t;
        if tt < 0.0 {
            tt += 1.0;
        }
        if tt > 1.0 {
            tt -= 1.0;
        }
        if tt < 1.0 / 6.0 {
            p + (q - p) * 6.0 * tt
        } else if tt < 0.5 {
            q
        } else if tt < 2.0 / 3.0 {
            p + (q - p) * (2.0 / 3.0 - tt) * 6.0
        } else {
            p
        }
    };
    Rgb {
        r: (ch(hn + 1.0 / 3.0) * 255.0).round() as u8,
        g: (ch(hn) * 255.0).round() as u8,
        b: (ch(hn - 1.0 / 3.0) * 255.0).round() as u8,
    }
}

#[inline]
fn is_blue(h: f64) -> bool {
    h > 200.0 && h < 280.0
}

fn adjust_yellow_hue(h: f64) -> (f64, f64) {
    if h > 60.0 && h < 180.0 {
        let nh = if h < 120.0 {
            scale(h, 60.0, 120.0, 60.0, 105.0)
        } else {
            scale(h, 120.0, 180.0, 135.0, 180.0)
        };
        let l_mul = if h > 40.0 && h < 80.0 { 0.75 } else { 1.0 };
        return (nh, l_mul);
    }
    (h, 1.0)
}

fn modify_blue_fg_hue(h: f64) -> f64 {
    if h > 205.0 && h < 245.0 {
        scale(h, 205.0, 245.0, 205.0, 220.0)
    } else {
        h
    }
}

fn is_neutral_bg(hsl: Hsl) -> bool {
    hsl.l < 0.2 || hsl.s < 0.24 || (hsl.l > 0.8 && is_blue(hsl.h))
}

fn is_neutral_fg(hsl: Hsl) -> bool {
    hsl.l < 0.2 || hsl.s < 0.24
}

pub fn modify_bg_hsl(hsl: Hsl, profile: &ColorProfile) -> Hsl {
    if is_neutral_bg(hsl) {
        let l = if hsl.l < 0.5 {
            scale(hsl.l, 0.0, 0.5, 0.0, profile.max_bg_lightness)
        } else {
            scale(
                hsl.l,
                0.5,
                1.0,
                profile.max_bg_lightness,
                profile.pole_bg.l,
            )
        };
        return Hsl {
            h: profile.pole_bg.h,
            s: profile.pole_bg.s,
            l,
        };
    }
    let (h, l_mul) = adjust_yellow_hue(hsl.h);
    let l_base = if hsl.l < 0.5 {
        scale(hsl.l, 0.0, 0.5, 0.0, profile.max_bg_lightness)
    } else {
        scale(
            hsl.l,
            0.5,
            1.0,
            profile.max_bg_lightness,
            profile.pole_bg.l,
        )
    };
    Hsl {
        h,
        s: hsl.s,
        l: clamp(l_base * l_mul, 0.0, 1.0),
    }
}

pub fn modify_fg_hsl(hsl: Hsl, profile: &ColorProfile) -> Hsl {
    if is_neutral_fg(hsl) {
        let l = if hsl.l > 0.5 {
            scale(
                hsl.l,
                0.5,
                1.0,
                profile.min_fg_lightness,
                profile.pole_fg.l,
            )
        } else {
            scale(
                hsl.l,
                0.0,
                0.5,
                profile.pole_fg.l,
                profile.min_fg_lightness,
            )
        };
        return Hsl {
            h: profile.pole_fg.h,
            s: profile.pole_fg.s,
            l,
        };
    }
    let h = modify_blue_fg_hue(hsl.h);
    let l = if hsl.l > 0.5 {
        scale(
            hsl.l,
            0.5,
            1.0,
            profile.min_fg_lightness,
            profile.pole_fg.l,
        )
    } else {
        scale(
            hsl.l,
            0.0,
            0.5,
            profile.pole_fg.l,
            profile.min_fg_lightness,
        )
    };
    Hsl {
        h,
        s: hsl.s,
        l,
    }
}

pub fn modify_border_hsl(hsl: Hsl, profile: &ColorProfile) -> Hsl {
    let l = scale(hsl.l, 0.0, 1.0, 0.5, 0.2);
    if is_neutral_bg(hsl) {
        Hsl {
            h: profile.pole_bg.h,
            s: profile.pole_bg.s,
            l,
        }
    } else {
        Hsl {
            h: hsl.h,
            s: hsl.s,
            l,
        }
    }
}

pub fn modify_color(rgb: Rgb, use_tag: ColorUse, profile: &ColorProfile) -> Rgb {
    let hsl = rgb_to_hsl(rgb);
    let out = match use_tag {
        ColorUse::Fg => modify_fg_hsl(hsl, profile),
        ColorUse::Border => modify_border_hsl(hsl, profile),
        ColorUse::Bg => modify_bg_hsl(hsl, profile),
    };
    hsl_to_rgb(out)
}

/// 批量改色：扁平 RGB `3*n` + 平行 `uses`（0=bg,1=fg,2=border）→ 扁平 RGB。
/// 同色 + 同用途只算一次（Rust hash 缓存，RFC 031 §5.1 去重）。
pub fn batch_modify_color(rgb: &[u8], uses: &[u8], profile: &ColorProfile) -> Option<Vec<u8>> {
    if rgb.len() % 3 != 0 || rgb.is_empty() {
        return None;
    }
    let n = rgb.len() / 3;
    if uses.len() != n {
        return None;
    }
    use std::collections::HashMap;
    let mut cache: HashMap<u32, [u8; 3]> = HashMap::new();
    let mut out = Vec::with_capacity(rgb.len());
    for i in 0..n {
        let use_tag = ColorUse::from_u8(uses[i])?;
        let b = i * 3;
        let r = rgb[b];
        let g = rgb[b + 1];
        let bl = rgb[b + 2];
        let key = ((r as u32) << 24) | ((g as u32) << 16) | ((bl as u32) << 8) | (uses[i] as u32);
        let c = cache.get(&key).copied().unwrap_or_else(|| {
            let rgb_out = modify_color(
                Rgb { r, g, b: bl },
                use_tag,
                profile,
            );
            let triple = [rgb_out.r, rgb_out.g, rgb_out.b];
            cache.insert(key, triple);
            triple
        });
        out.extend_from_slice(&c);
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scale_linear() {
        assert!((scale(0.5, 0.0, 1.0, 0.0, 100.0) - 50.0).abs() < 1e-9);
    }

    #[test]
    fn white_bg_darkens() {
        let out = modify_color(
            Rgb {
                r: 255,
                g: 255,
                b: 255,
            },
            ColorUse::Bg,
            &default_dark_profile(),
        );
        let l = crate::relative_luminance(out.r, out.g, out.b);
        assert!(l < 0.1);
    }

    #[test]
    fn black_fg_lightens() {
        let out = modify_color(
            Rgb { r: 0, g: 0, b: 0 },
            ColorUse::Fg,
            &default_dark_profile(),
        );
        assert!(rgb_to_hsl(out).l >= default_dark_profile().min_fg_lightness - 0.02);
    }

    #[test]
    fn black_fg_matches_pole() {
        let out = modify_color(
            Rgb { r: 0, g: 0, b: 0 },
            ColorUse::Fg,
            &default_dark_profile(),
        );
        assert_eq!(out, Rgb {
            r: 0xe8,
            g: 0xe6,
            b: 0xe3,
        });
    }

    #[test]
    fn batch_matches_scalar() {
        let rgb = vec![0u8, 0, 0, 255, 255, 255];
        let uses = vec![1, 0];
        let batch = batch_modify_color(&rgb, &uses, &default_dark_profile()).unwrap();
        let s0 = modify_color(Rgb { r: 0, g: 0, b: 0 }, ColorUse::Fg, &default_dark_profile());
        let s1 = modify_color(
            Rgb {
                r: 255,
                g: 255,
                b: 255,
            },
            ColorUse::Bg,
            &default_dark_profile(),
        );
        assert_eq!((batch[0], batch[1], batch[2]), (s0.r, s0.g, s0.b));
        assert_eq!((batch[3], batch[4], batch[5]), (s1.r, s1.g, s1.b));
    }

    fn hex(rgb: Rgb) -> String {
        format!("#{:02x}{:02x}{:02x}", rgb.r, rgb.g, rgb.b)
    }

    #[test]
    fn batch_dedup_matches_scalar_with_repeats() {
        let rgb = vec![0u8, 0, 0, 0, 0, 0, 255, 255, 255];
        let uses = vec![1, 1, 0];
        let batch = batch_modify_color(&rgb, &uses, &default_dark_profile()).unwrap();
        let s0 = modify_color(Rgb { r: 0, g: 0, b: 0 }, ColorUse::Fg, &default_dark_profile());
        let s1 = modify_color(
            Rgb {
                r: 255,
                g: 255,
                b: 255,
            },
            ColorUse::Bg,
            &default_dark_profile(),
        );
        assert_eq!((batch[0], batch[1], batch[2]), (s0.r, s0.g, s0.b));
        assert_eq!((batch[3], batch[4], batch[5]), (s0.r, s0.g, s0.b));
        assert_eq!((batch[6], batch[7], batch[8]), (s1.r, s1.g, s1.b));
    }

    /// RFC 031 §2.7 golden 向量（Rust 真源，对齐 DR `modify-colors.ts` 移植）。
    #[test]
    fn golden_vectors_rfc_027() {
        let p = default_dark_profile();
        let cases: &[(&str, Rgb, ColorUse)] = &[
            ("#ffffff", Rgb { r: 255, g: 255, b: 255 }, ColorUse::Bg),
            ("#000000", Rgb { r: 0, g: 0, b: 0 }, ColorUse::Bg),
            ("#808080", Rgb { r: 128, g: 128, b: 128 }, ColorUse::Bg),
            ("#f0f0f0", Rgb { r: 240, g: 240, b: 240 }, ColorUse::Bg),
            ("#000000", Rgb { r: 0, g: 0, b: 0 }, ColorUse::Fg),
            ("#ffffff", Rgb { r: 255, g: 255, b: 255 }, ColorUse::Fg),
            ("#333333", Rgb { r: 51, g: 51, b: 51 }, ColorUse::Fg),
            (
                "#1a73e8",
                Rgb {
                    r: 26,
                    g: 115,
                    b: 232,
                },
                ColorUse::Fg,
            ),
            (
                "#cccccc",
                Rgb {
                    r: 204,
                    g: 204,
                    b: 204,
                },
                ColorUse::Border,
            ),
            (
                "#ffeb3b",
                Rgb {
                    r: 255,
                    g: 235,
                    b: 59,
                },
                ColorUse::Bg,
            ),
        ];
        let expected: &[&str] = &[
            "#181a1b", "#000000", "#60686c", "#202325", "#e8e6e3", "#e8e6e3", "#c8c3bc",
            "#3092ea", "#3e4446", "#a99700",
        ];
        for ((input, rgb, use_tag), exp) in cases.iter().zip(expected.iter()) {
            let out = modify_color(*rgb, *use_tag, &p);
            assert_eq!(hex(out), *exp, "input {input}");
        }
    }

    /// Solarized pole 与 dark pole 对白底改色结果不同。
    #[test]
    fn solarized_profile_differs_from_dark_on_white_bg() {
        let dark = modify_color(
            Rgb {
                r: 255,
                g: 255,
                b: 255,
            },
            ColorUse::Bg,
            &default_dark_profile(),
        );
        let solar = modify_color(
            Rgb {
                r: 255,
                g: 255,
                b: 255,
            },
            ColorUse::Bg,
            &solarized_dark_profile(),
        );
        assert_ne!(hex(dark), hex(solar));
    }

    #[test]
    fn profile_for_tag_roundtrip() {
        let p0 = profile_for_tag(PROFILE_TAG_DARK);
        let p1 = profile_for_tag(PROFILE_TAG_SOLARIZED_DARK);
        assert_eq!(p0.pole_bg.l, default_dark_profile().pole_bg.l);
        assert_eq!(p1.pole_bg.l, solarized_dark_profile().pole_bg.l);
    }
}
