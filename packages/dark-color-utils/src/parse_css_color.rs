//! RFC 0031 §5.1：CSS 颜色 token 解析（`#hex` / `rgb()` / `hsl()` / 命名色）。

use crate::modify_colors::Rgb;

const NAMED_COLORS: &[(&str, u8, u8, u8)] = &[
    ("black", 0, 0, 0),
    ("silver", 192, 192, 192),
    ("gray", 128, 128, 128),
    ("grey", 128, 128, 128),
    ("white", 255, 255, 255),
    ("maroon", 128, 0, 0),
    ("red", 255, 0, 0),
    ("purple", 128, 0, 128),
    ("fuchsia", 255, 0, 255),
    ("green", 0, 128, 0),
    ("lime", 0, 255, 0),
    ("olive", 128, 128, 0),
    ("yellow", 255, 255, 0),
    ("navy", 0, 0, 128),
    ("blue", 0, 0, 255),
    ("teal", 0, 128, 128),
    ("aqua", 0, 255, 255),
    ("cyan", 0, 255, 255),
    ("orange", 255, 165, 0),
    ("pink", 255, 192, 203),
    ("transparent", 0, 0, 0), // alpha ignored; caller treats as skip
];

fn clamp255(n: f64) -> u8 {
    if n.is_nan() {
        return 0;
    }
    n.round().clamp(0.0, 255.0) as u8
}

fn parse_hex(input: &str) -> Option<Rgb> {
    let hex = input.strip_prefix('#')?;
    let (r, g, b) = match hex.len() {
        3 | 4 => {
            let expand = |c: char| -> Option<u8> {
                let s = c.to_digit(16)? as u8;
                Some(s * 17)
            };
            let mut chars = hex.chars();
            let r = expand(chars.next()?)?;
            let g = expand(chars.next()?)?;
            let b = expand(chars.next()?)?;
            (r, g, b)
        }
        6 | 8 => {
            let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
            let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
            let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
            (r, g, b)
        }
        _ => return None,
    };
    Some(Rgb { r, g, b })
}

fn parse_number_or_percent(part: &str) -> Option<f64> {
    let s = part.trim();
    if s.eq_ignore_ascii_case("none") {
        return Some(0.0);
    }
    let val = if let Some(pct) = s.strip_suffix('%') {
        let n: f64 = pct.trim().parse().ok()?;
        n / 100.0
    } else {
        s.parse().ok()?
    };
    if !val.is_finite() {
        return None;
    }
    Some(val)
}

fn parse_rgb_channel(part: &str) -> Option<u8> {
    let s = part.trim();
    if s.eq_ignore_ascii_case("none") {
        return Some(0);
    }
    if let Some(pct) = s.strip_suffix('%') {
        let n: f64 = pct.trim().parse().ok()?;
        if !n.is_finite() {
            return None;
        }
        return Some(clamp255((n / 100.0) * 255.0));
    }
    let n: f64 = s.parse().ok()?;
    if !n.is_finite() {
        return None;
    }
    Some(clamp255(n))
}

fn parse_alpha(part: &str) -> Option<f64> {
    let s = part.trim();
    if s.eq_ignore_ascii_case("none") {
        return Some(0.0);
    }
    let v = if let Some(pct) = s.strip_suffix('%') {
        let n: f64 = pct.trim().parse().ok()?;
        n / 100.0
    } else {
        s.parse::<f64>().ok()?
    };
    if !v.is_finite() {
        return None;
    }
    Some(v)
}

fn parse_hue_degrees(part: &str) -> Option<f64> {
    let s = part.trim().to_ascii_lowercase();
    if s == "none" {
        return Some(0.0);
    }
    let deg = if let Some(v) = s.strip_suffix("deg") {
        v.trim().parse::<f64>().ok()?
    } else if let Some(v) = s.strip_suffix("turn") {
        v.trim().parse::<f64>().ok()? * 360.0
    } else if let Some(v) = s.strip_suffix("rad") {
        v.trim().parse::<f64>().ok()?.to_degrees()
    } else if let Some(v) = s.strip_suffix("grad") {
        v.trim().parse::<f64>().ok()? * 0.9
    } else {
        s.parse::<f64>().ok()?
    };
    if !deg.is_finite() {
        return None;
    }
    Some(deg)
}

fn split_color_and_alpha(inner: &str) -> Option<(&str, Option<&str>)> {
    let mut parts = inner.split('/');
    let color_part = parts.next()?.trim();
    let alpha_part = parts.next().map(str::trim);
    if parts.next().is_some() {
        return None;
    }
    Some((color_part, alpha_part))
}

fn check_alpha_visible(alpha_part: Option<&str>) -> Option<()> {
    if let Some(a) = alpha_part {
        if parse_alpha(a)? <= 0.0 {
            return None;
        }
    }
    Some(())
}

fn parse_rgb_like(input: &str) -> Option<Rgb> {
    let lower = input.to_ascii_lowercase();
    let inner = lower
        .strip_prefix("rgba(")
        .or_else(|| lower.strip_prefix("rgb("))?
        .strip_suffix(')')?;
    if inner.contains(',') {
        let parts: Vec<&str> = inner.split(',').map(str::trim).collect();
        if parts.len() != 3 && parts.len() != 4 {
            return None;
        }
        if parts.len() == 4 {
            check_alpha_visible(Some(parts[3]))?;
        }
        let r = parse_rgb_channel(parts[0])?;
        let g = parse_rgb_channel(parts[1])?;
        let b = parse_rgb_channel(parts[2])?;
        return Some(Rgb { r, g, b });
    }
    let (color_part, alpha_part) = split_color_and_alpha(inner)?;
    check_alpha_visible(alpha_part)?;
    let tokens: Vec<&str> = color_part.split_whitespace().collect();
    if tokens.len() != 3 {
        return None;
    }
    let r = parse_rgb_channel(tokens[0])?;
    let g = parse_rgb_channel(tokens[1])?;
    let b = parse_rgb_channel(tokens[2])?;
    Some(Rgb { r, g, b })
}

fn parse_hsl_like(input: &str) -> Option<Rgb> {
    let lower = input.to_ascii_lowercase();
    let inner = lower
        .strip_prefix("hsla(")
        .or_else(|| lower.strip_prefix("hsl("))?
        .strip_suffix(')')?;
    if inner.contains(',') {
        let parts: Vec<&str> = inner.split(',').map(str::trim).collect();
        if parts.len() != 3 && parts.len() != 4 {
            return None;
        }
        if parts.len() == 4 {
            check_alpha_visible(Some(parts[3]))?;
        }
        let h = parse_hue_degrees(parts[0])?;
        let s = parse_number_or_percent(parts[1])?.clamp(0.0, 1.0);
        let l = parse_number_or_percent(parts[2])?.clamp(0.0, 1.0);
        return Some(hsl_to_rgb(h, s, l));
    }
    let (color_part, alpha_part) = split_color_and_alpha(inner)?;
    check_alpha_visible(alpha_part)?;
    let tokens: Vec<&str> = color_part.split_whitespace().collect();
    if tokens.len() != 3 {
        return None;
    }
    let h = parse_hue_degrees(tokens[0])?;
    let s = parse_number_or_percent(tokens[1])?.clamp(0.0, 1.0);
    let l = parse_number_or_percent(tokens[2])?.clamp(0.0, 1.0);
    Some(hsl_to_rgb(h, s, l))
}

fn linear_to_srgb_u8(x: f64) -> u8 {
    let c = x.clamp(0.0, 1.0);
    let v = if c <= 0.0031308 {
        12.92 * c
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    };
    clamp255(v * 255.0)
}

fn oklab_to_rgb(l: f64, a: f64, b: f64) -> Rgb {
    let l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    let m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    let s_ = l - 0.0894841775 * a - 1.2914855480 * b;
    let l3 = l_ * l_ * l_;
    let m3 = m_ * m_ * m_;
    let s3 = s_ * s_ * s_;
    let lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    let lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    let lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
    Rgb {
        r: linear_to_srgb_u8(lr),
        g: linear_to_srgb_u8(lg),
        b: linear_to_srgb_u8(lb),
    }
}

fn parse_oklab_axis(part: &str, pct_scale: f64) -> Option<f64> {
    let s = part.trim();
    if s.eq_ignore_ascii_case("none") {
        return Some(0.0);
    }
    let v = if let Some(pct) = s.strip_suffix('%') {
        let n: f64 = pct.trim().parse().ok()?;
        (n / 100.0) * pct_scale
    } else {
        s.parse::<f64>().ok()?
    };
    if !v.is_finite() {
        return None;
    }
    Some(v)
}

fn parse_oklch_like(input: &str) -> Option<Rgb> {
    let lower = input.to_ascii_lowercase();
    let inner = lower.strip_prefix("oklch(")?.strip_suffix(')')?;
    let (color_part, alpha_part) = split_color_and_alpha(inner)?;
    check_alpha_visible(alpha_part)?;
    let tokens: Vec<&str> = color_part.split_whitespace().collect();
    if tokens.len() != 3 {
        return None;
    }
    let l = parse_number_or_percent(tokens[0])?.clamp(0.0, 1.0);
    let c = parse_oklab_axis(tokens[1], 0.4)?;
    if c < 0.0 {
        return None;
    }
    let h = parse_hue_degrees(tokens[2])?;
    let h_rad = h.to_radians();
    let a = c * h_rad.cos();
    let b = c * h_rad.sin();
    Some(oklab_to_rgb(l, a, b))
}

fn parse_oklab_like(input: &str) -> Option<Rgb> {
    let lower = input.to_ascii_lowercase();
    let inner = lower.strip_prefix("oklab(")?.strip_suffix(')')?;
    let (color_part, alpha_part) = split_color_and_alpha(inner)?;
    check_alpha_visible(alpha_part)?;
    let tokens: Vec<&str> = color_part.split_whitespace().collect();
    if tokens.len() != 3 {
        return None;
    }
    let l = parse_number_or_percent(tokens[0])?.clamp(0.0, 1.0);
    let a = parse_oklab_axis(tokens[1], 0.4)?;
    let b = parse_oklab_axis(tokens[2], 0.4)?;
    Some(oklab_to_rgb(l, a, b))
}

fn hsl_to_rgb(h: f64, s: f64, l: f64) -> Rgb {
    let hn = ((h % 360.0) + 360.0) % 360.0 / 360.0;
    if s == 0.0 {
        let v = clamp255(l * 255.0);
        return Rgb { r: v, g: v, b: v };
    }
    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;
    let ch = |t: f64| -> f64 {
        let mut tt = t;
        if tt < 0.0 {
            tt += 1.0;
        }
        if tt > 1.0 {
            tt -= 1.0;
        }
        if tt < 1.0 / 6.0 {
            return p + (q - p) * 6.0 * tt;
        }
        if tt < 1.0 / 2.0 {
            return q;
        }
        if tt < 2.0 / 3.0 {
            return p + (q - p) * (2.0 / 3.0 - tt) * 6.0;
        }
        p
    };
    Rgb {
        r: clamp255(ch(hn + 1.0 / 3.0) * 255.0),
        g: clamp255(ch(hn) * 255.0),
        b: clamp255(ch(hn - 1.0 / 3.0) * 255.0),
    }
}

fn parse_named(input: &str) -> Option<Rgb> {
    let key = input.trim().to_ascii_lowercase();
    if key == "transparent" || key == "currentcolor" {
        return None;
    }
    NAMED_COLORS
        .iter()
        .find(|(name, _, _, _)| *name == key)
        .map(|(_, r, g, b)| Rgb {
            r: *r,
            g: *g,
            b: *b,
        })
}

/// 解析 CSS 颜色 token；`var()` / 无法识别 → `None`。
pub fn parse_css_color_token(input: &str) -> Option<Rgb> {
    let s = input.trim();
    if s.is_empty() {
        return None;
    }
    let lower = s.to_ascii_lowercase();
    if lower.starts_with("var(") {
        return None;
    }
    if s.starts_with('#') {
        return parse_hex(s);
    }
    if lower.starts_with("rgb") {
        return parse_rgb_like(&lower);
    }
    if lower.starts_with("hsl") {
        return parse_hsl_like(&lower);
    }
    if lower.starts_with("oklch(") {
        return parse_oklch_like(&lower);
    }
    if lower.starts_with("oklab(") {
        return parse_oklab_like(&lower);
    }
    parse_named(&lower)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_and_rgb() {
        assert_eq!(parse_css_color_token("#fff").unwrap(), Rgb { r: 255, g: 255, b: 255 });
        assert_eq!(parse_css_color_token("rgb(0, 128, 255)").unwrap(), Rgb { r: 0, g: 128, b: 255 });
        assert_eq!(parse_css_color_token("rgb(240 240 240 / 0.8)").unwrap(), Rgb { r: 240, g: 240, b: 240 });
        assert_eq!(parse_css_color_token("rgb(100% 50% 0% / 50%)").unwrap(), Rgb { r: 255, g: 128, b: 0 });
        assert!(parse_css_color_token("rgba(255, 255, 255, 0)").is_none());
    }

    #[test]
    fn hsl_and_named() {
        assert_eq!(parse_css_color_token("hsl(0, 100%, 50%)").unwrap(), Rgb { r: 255, g: 0, b: 0 });
        assert_eq!(parse_css_color_token("hsl(0 100% 50%)").unwrap(), Rgb { r: 255, g: 0, b: 0 });
        assert_eq!(parse_css_color_token("hsl(0 100% 50% / 0.5)").unwrap(), Rgb { r: 255, g: 0, b: 0 });
        assert_eq!(parse_css_color_token("red").unwrap(), Rgb { r: 255, g: 0, b: 0 });
    }

    #[test]
    fn oklch_and_oklab() {
        let light = parse_css_color_token("oklch(0.96 0 0)").unwrap();
        assert!(light.r > 235 && light.r == light.g && light.g == light.b);
        assert_eq!(parse_css_color_token("oklch(96% 0 0)").unwrap(), light);
        let accent = parse_css_color_token("oklch(0.6 0.2 250)").unwrap();
        assert!(accent.b > accent.r);
        assert!(parse_css_color_token("oklch(0.95 0 0 / 0)").is_none());
        let mid = parse_css_color_token("oklab(0.5 0 0)").unwrap();
        assert!(mid.r > 80 && mid.r < 120 && mid.r == mid.g && mid.g == mid.b);
    }

    #[test]
    fn var_returns_none() {
        assert!(parse_css_color_token("var(--x)").is_none());
    }
}
