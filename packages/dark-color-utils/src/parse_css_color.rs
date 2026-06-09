//! RFC 031 §5.1：CSS 颜色 token 解析（`#hex` / `rgb()` / `hsl()` / 命名色）。

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
    if s.ends_with('%') {
        let n: f64 = s.trim_end_matches('%').trim().parse().ok()?;
        return Some(n / 100.0);
    }
    s.parse().ok()
}

fn parse_rgb_like(input: &str) -> Option<Rgb> {
    let lower = input.to_ascii_lowercase();
    let inner = lower
        .strip_prefix("rgba(")
        .or_else(|| lower.strip_prefix("rgb("))?
        .strip_suffix(')')?;
    let parts: Vec<&str> = inner.split(',').map(str::trim).collect();
    if parts.len() < 3 {
        return None;
    }
    let r = parse_number_or_percent(parts[0])?;
    let g = parse_number_or_percent(parts[1])?;
    let b = parse_number_or_percent(parts[2])?;
    Some(Rgb {
        r: clamp255(if r <= 1.0 { r * 255.0 } else { r }),
        g: clamp255(if g <= 1.0 { g * 255.0 } else { g }),
        b: clamp255(if b <= 1.0 { b * 255.0 } else { b }),
    })
}

fn parse_hsl_like(input: &str) -> Option<Rgb> {
    let lower = input.to_ascii_lowercase();
    let inner = lower
        .strip_prefix("hsla(")
        .or_else(|| lower.strip_prefix("hsl("))?
        .strip_suffix(')')?;
    let parts: Vec<&str> = inner.split(',').map(str::trim).collect();
    if parts.len() < 3 {
        return None;
    }
    let h: f64 = parts[0].trim_end_matches("deg").parse().ok()?;
    let s = parse_number_or_percent(parts[1])?;
    let l = parse_number_or_percent(parts[2])?;
    Some(hsl_to_rgb(h, s, l))
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
    if s.starts_with("var(") {
        return None;
    }
    if s.starts_with('#') {
        return parse_hex(s);
    }
    let lower = s.to_ascii_lowercase();
    if lower.starts_with("rgb") {
        return parse_rgb_like(&lower);
    }
    if lower.starts_with("hsl") {
        return parse_hsl_like(&lower);
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
    }

    #[test]
    fn hsl_and_named() {
        assert_eq!(parse_css_color_token("hsl(0, 100%, 50%)").unwrap(), Rgb { r: 255, g: 0, b: 0 });
        assert_eq!(parse_css_color_token("red").unwrap(), Rgb { r: 255, g: 0, b: 0 });
    }

    #[test]
    fn var_returns_none() {
        assert!(parse_css_color_token("var(--x)").is_none());
    }
}
