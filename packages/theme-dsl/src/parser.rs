use crate::ast::{
    ColorUseKind, CssVarSubstituteV1, DslError, GutterProbeV1, SiteProfileMatchV1,
    SiteProfilePatchV1, SiteProfileV1, SiteRecolorProfileV1, SiteSurfaceRepairProfileV1,
};
use std::collections::{BTreeMap, HashSet};
use winnow::ascii::dec_uint;
use winnow::combinator::{alt, cut_err, preceded};
use winnow::error::{ErrMode, Needed, ParseError, ParserError};
use winnow::prelude::*;
use winnow::stream::Stream;
use winnow::token::{any, literal, one_of, take_until, take_while};

#[derive(Debug, Clone)]
struct RichError {
    message: String,
    remaining_len: Option<usize>,
}

impl RichError {
    fn at(message: impl Into<String>, remaining: &str) -> ErrMode<Self> {
        ErrMode::Cut(Self {
            message: message.into(),
            remaining_len: Some(remaining.len()),
        })
    }

    fn expected(msg: impl Into<String>, remaining: &str) -> ErrMode<Self> {
        ErrMode::Backtrack(Self {
            message: msg.into(),
            remaining_len: Some(remaining.len()),
        })
    }
}

impl<'a> ParserError<&'a str> for RichError {
    type Inner = Self;

    fn from_input(input: &&'a str) -> Self {
        let preview: String = input.chars().take(16).collect();
        let message = if preview.is_empty() {
            "unexpected end of input".to_string()
        } else {
            format!("unexpected token near `{preview}`")
        };
        Self {
            message,
            remaining_len: Some(input.len()),
        }
    }

    fn incomplete(input: &&'a str, _needed: Needed) -> Self {
        Self::from_input(input)
    }

    fn into_inner(self) -> Result<Self::Inner, Self> {
        Ok(self)
    }
}

type PResult<O> = ModalResult<O, RichError>;

fn byte_offset_to_line_col(source: &str, offset: usize) -> (usize, usize) {
    let clamped = offset.min(source.len());
    let mut safe = clamped;
    while safe > 0 && !source.is_char_boundary(safe) {
        safe -= 1;
    }
    let mut line = 1usize;
    let mut column = 1usize;
    for ch in source[..safe].chars() {
        if ch == '\n' {
            line += 1;
            column = 1;
        } else {
            column += 1;
        }
    }
    (line, column)
}

fn to_dsl_error(source: &str, err: ParseError<&str, RichError>) -> DslError {
    let parse_offset = err.offset();
    let rich = err.into_inner();
    let offset = rich
        .remaining_len
        .map(|rem| source.len().saturating_sub(rem))
        .unwrap_or(parse_offset)
        .min(source.len());
    let (line, column) = byte_offset_to_line_col(source, offset);
    DslError {
        message: rich.message,
        line,
        column,
        offset,
    }
}

/// Skip horizontal spaces (` ` and `\t`).
fn skip_hws(input: &mut &str) -> PResult<()> {
    take_while(0.., (' ', '\t')).void().parse_next(input)
}

/// Skip `// ...` or `# ...` line comment body up to (not consuming) newline or EOF.
fn line_comment(input: &mut &str) -> PResult<()> {
    let prefix = alt((literal("//"), literal("#"))).parse_next(input)?;
    let _ = prefix;
    take_while(0.., |c: char| c != '\n' && c != '\r')
        .void()
        .parse_next(input)
}

/// Skip any mix of whitespace (including newlines) and `//` / `#` comments.
fn trivia(input: &mut &str) -> PResult<()> {
    loop {
        let before = *input;
        let _ = take_while(0.., |c: char| matches!(c, ' ' | '\t' | '\n' | '\r')).parse_next(input)?;
        if input.starts_with("//") || input.starts_with('#') {
            line_comment.parse_next(input)?;
        }
        if *input == before {
            break;
        }
    }
    Ok(())
}

/// Consume separator between sibling statements inside `{ ... }`.
/// Returns `Ok(true)` if we are immediately at `}` (end of block).
/// Otherwise requires at least one `\n`, `\r`, or `;` before the next entry.
fn block_entry_sep_or_end(input: &mut &str) -> PResult<bool> {
    let mut saw_sep = false;
    loop {
        let before = *input;
        let _ = take_while(0.., (' ', '\t')).parse_next(input)?;
        if input.starts_with("//") || input.starts_with('#') {
            line_comment.parse_next(input)?;
        }
        let mut advanced_sep = false;
        while input.starts_with('\n') || input.starts_with('\r') || input.starts_with(';') {
            any.parse_next(input)?;
            saw_sep = true;
            advanced_sep = true;
        }
        if *input == before && !advanced_sep {
            break;
        }
    }

    if input.starts_with('}') {
        return Ok(true);
    }
    if input.is_empty() {
        return Err(RichError::at("unclosed `{` block", input));
    }
    if !saw_sep {
        return Err(RichError::at(
            "expected newline or `;` between block entries",
            input,
        ));
    }
    Ok(false)
}

fn parse_ident(input: &mut &str) -> PResult<String> {
    let checkpoint = *input;
    let Some(first) = checkpoint.chars().next() else {
        return Err(RichError::expected("expected identifier", input));
    };
    if !(first.is_ascii_alphabetic() || first == '_') {
        return Err(RichError::expected("expected identifier", input));
    }
    let ident: &str =
        take_while(1.., |c: char| c.is_ascii_alphanumeric() || c == '_' || c == '-')
            .parse_next(input)?;
    Ok(ident.to_string())
}

fn parse_u32_val(input: &mut &str) -> PResult<u32> {
    let start = *input;
    if !start.chars().next().is_some_and(|c| c.is_ascii_digit()) {
        return Err(RichError::at("expected non-negative integer", start));
    }
    let val: u32 = dec_uint
        .parse_next(input)
        .map_err(|_: ErrMode<RichError>| RichError::at("integer literal out of u32 range", start))?;
    if input
        .chars()
        .next()
        .is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
    {
        return Err(RichError::at(
            "unexpected suffix on integer literal; expected pure u32",
            start,
        ));
    }
    Ok(val)
}

fn parse_bool_val(input: &mut &str) -> PResult<bool> {
    let start = *input;
    let ident = parse_ident
        .parse_next(input)
        .map_err(|_| RichError::at("expected boolean `true` or `false`", start))?;
    match ident.as_str() {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err(RichError::at(
            format!("expected boolean `true` or `false`, found `{ident}`"),
            start,
        )),
    }
}

fn parse_color_use(input: &mut &str) -> PResult<ColorUseKind> {
    let start = *input;
    let ident = parse_ident
        .parse_next(input)
        .map_err(|_| RichError::at("expected `bg`, `fg`, or `border`", start))?;
    match ident.as_str() {
        "bg" => Ok(ColorUseKind::Bg),
        "fg" => Ok(ColorUseKind::Fg),
        "border" => Ok(ColorUseKind::Border),
        _ => Err(RichError::at(
            format!("expected `bg`, `fg`, or `border`, found `{ident}`"),
            start,
        )),
    }
}

fn parse_multiline_string(input: &mut &str) -> PResult<String> {
    let start = *input;
    literal("\"\"\"").parse_next(input)?;
    if input.starts_with("\r\n") {
        let _ = input.next_slice(2);
    } else if input.starts_with('\n') {
        let _ = input.next_slice(1);
    }
    let body: &str = take_until(0.., "\"\"\"")
        .parse_next(input)
        .map_err(|_: ErrMode<RichError>| {
            RichError::at("unterminated multiline string `\"\"\"`", start)
        })?;
    literal("\"\"\"").parse_next(input)?;
    Ok(body.to_string())
}

fn parse_quoted_string(input: &mut &str) -> PResult<String> {
    let start = *input;
    literal("\"").parse_next(input)?;
    let mut out = String::new();
    loop {
        if input.is_empty() {
            return Err(RichError::at("unterminated string literal", start));
        }
        let ch = any.parse_next(input)?;
        match ch {
            '"' => return Ok(out),
            '\n' | '\r' => {
                return Err(RichError::at(
                    "unterminated string literal (unescaped newline; use `\"\"\"` for multiline strings)",
                    start,
                ));
            }
            '\\' => {
                let esc_pos = *input;
                if esc_pos.is_empty() {
                    return Err(RichError::at("unterminated escape sequence", start));
                }
                let esc = any.parse_next(input)?;
                match esc {
                    '"' => out.push('"'),
                    '\\' => out.push('\\'),
                    'n' => out.push('\n'),
                    'r' => out.push('\r'),
                    't' => out.push('\t'),
                    other => {
                        return Err(RichError::at(
                            format!("unsupported escape sequence `\\{other}`"),
                            esc_pos,
                        ));
                    }
                }
            }
            other => out.push(other),
        }
    }
}

fn parse_string_value(allow_multiline: bool, input: &mut &str) -> PResult<String> {
    if input.starts_with("\"\"\"") {
        if allow_multiline {
            parse_multiline_string(input)
        } else {
            Err(RichError::at(
                "multiline strings `\"\"\"` are only supported for `customCss`",
                *input,
            ))
        }
    } else if input.starts_with('"') {
        parse_quoted_string(input)
    } else {
        Err(RichError::at("expected string literal", *input))
    }
}

fn parse_string_list(input: &mut &str) -> PResult<Vec<String>> {
    let open_pos = *input;
    if !input.starts_with('[') {
        return Err(RichError::at("expected `[` for string list", open_pos));
    }
    one_of('[').parse_next(input)?;
    let mut items = Vec::new();
    loop {
        trivia(input)?;
        if input.starts_with(']') {
            any.parse_next(input)?;
            return Ok(items);
        }
        if input.is_empty() {
            return Err(RichError::at("unclosed `[` in string list", open_pos));
        }
        let s = parse_string_value(false, input)?;
        items.push(s);
        trivia(input)?;
        if input.starts_with(',') {
            any.parse_next(input)?;
        } else if input.starts_with(']') {
            any.parse_next(input)?;
            return Ok(items);
        } else {
            return Err(RichError::at(
                "expected `,` or `]` after string list item",
                *input,
            ));
        }
    }
}

/// Expect `:` absent, consume opening `{` of a block, run `body` per key/item, and close `}`.
fn parse_braced_entries<F>(
    block_name: &str,
    input: &mut &str,
    mut on_entry: F,
) -> PResult<()>
where
    F: FnMut(&mut &str) -> PResult<()>,
{
    let open_pos = *input;
    if !input.starts_with('{') {
        return Err(RichError::at(
            format!("expected `{{` to open `{block_name}` block"),
            open_pos,
        ));
    }
    one_of('{').parse_next(input)?;
    trivia(input)?;
    if input.starts_with('}') {
        any.parse_next(input)?;
        return Ok(());
    }
    loop {
        if input.is_empty() {
            return Err(RichError::at(
                format!("unclosed `{{` in `{block_name}` block"),
                open_pos,
            ));
        }
        on_entry(input)?;
        let done = block_entry_sep_or_end(input)?;
        if done {
            any.parse_next(input)?;
            return Ok(());
        }
        trivia(input)?;
        if input.starts_with('}') {
            any.parse_next(input)?;
            return Ok(());
        }
    }
}

fn require_kv_hws(key: &str, input: &mut &str) -> PResult<()> {
    let before = *input;
    skip_hws(input)?;
    if input.len() == before.len() && !input.starts_with('{') && !input.starts_with('[') {
        return Err(RichError::at(
            format!("expected whitespace and value after `{key}`"),
            *input,
        ));
    }
    Ok(())
}

fn parse_match_block(input: &mut &str) -> PResult<SiteProfileMatchV1> {
    let mut m = SiteProfileMatchV1::default();
    parse_braced_entries("match", input, |i| {
        let key_pos = *i;
        let key = cut_err(parse_ident).parse_next(i)?;
        require_kv_hws(&key, i)?;
        match key.as_str() {
            "hostEquals" => {
                if m.host_equals.is_some() {
                    return Err(RichError::at("duplicate field `hostEquals` in `match`", key_pos));
                }
                m.host_equals = Some(parse_string_list(i)?);
            }
            "hostSuffix" => {
                if m.host_suffix.is_some() {
                    return Err(RichError::at("duplicate field `hostSuffix` in `match`", key_pos));
                }
                m.host_suffix = Some(parse_string_list(i)?);
            }
            "pathPrefix" => {
                if m.path_prefix.is_some() {
                    return Err(RichError::at("duplicate field `pathPrefix` in `match`", key_pos));
                }
                m.path_prefix = Some(parse_string_list(i)?);
            }
            _ => {
                return Err(RichError::at(
                    format!("unknown property `{key}` in `match`"),
                    key_pos,
                ));
            }
        }
        Ok(())
    })?;
    Ok(m)
}

fn parse_gutter_probe_block(input: &mut &str) -> PResult<GutterProbeV1> {
    let block_pos = *input;
    let mut main_selector: Option<String> = None;
    let mut inset_px: Option<u32> = None;
    parse_braced_entries("gutterProbe", input, |i| {
        let key_pos = *i;
        let key = cut_err(parse_ident).parse_next(i)?;
        require_kv_hws(&key, i)?;
        match key.as_str() {
            "mainSelector" => {
                if main_selector.is_some() {
                    return Err(RichError::at(
                        "duplicate field `mainSelector` in `gutterProbe`",
                        key_pos,
                    ));
                }
                let val_pos = *i;
                let s = parse_string_value(false, i)?;
                if s.trim().is_empty() {
                    return Err(RichError::at("`mainSelector` must not be empty", val_pos));
                }
                main_selector = Some(s);
            }
            "insetPx" => {
                if inset_px.is_some() {
                    return Err(RichError::at(
                        "duplicate field `insetPx` in `gutterProbe`",
                        key_pos,
                    ));
                }
                inset_px = Some(parse_u32_val(i)?);
            }
            _ => {
                return Err(RichError::at(
                    format!("unknown property `{key}` in `gutterProbe`"),
                    key_pos,
                ));
            }
        }
        Ok(())
    })?;

    let main_selector = main_selector.ok_or_else(|| {
        RichError::at("`gutterProbe` requires `mainSelector`", block_pos)
    })?;
    let inset_px = inset_px.ok_or_else(|| {
        RichError::at("`gutterProbe` requires `insetPx`", block_pos)
    })?;
    Ok(GutterProbeV1 {
        main_selector,
        inset_px,
    })
}

fn parse_surface_repair_block(input: &mut &str) -> PResult<SiteSurfaceRepairProfileV1> {
    let mut sr = SiteSurfaceRepairProfileV1::default();
    parse_braced_entries("surfaceRepair", input, |i| {
        let key_pos = *i;
        let key = cut_err(parse_ident).parse_next(i)?;
        require_kv_hws(&key, i)?;
        match key.as_str() {
            "landmarkSelectors" => {
                if sr.landmark_selectors.is_some() {
                    return Err(RichError::at(
                        "duplicate field `landmarkSelectors` in `surfaceRepair`",
                        key_pos,
                    ));
                }
                sr.landmark_selectors = Some(parse_string_list(i)?);
            }
            "componentClassHints" => {
                if sr.component_class_hints.is_some() {
                    return Err(RichError::at(
                        "duplicate field `componentClassHints` in `surfaceRepair`",
                        key_pos,
                    ));
                }
                sr.component_class_hints = Some(parse_string_list(i)?);
            }
            "neverPaint" => {
                if sr.never_paint.is_some() {
                    return Err(RichError::at(
                        "duplicate field `neverPaint` in `surfaceRepair`",
                        key_pos,
                    ));
                }
                sr.never_paint = Some(parse_string_list(i)?);
            }
            "minPanelAreaPx" => {
                if sr.min_panel_area_px.is_some() {
                    return Err(RichError::at(
                        "duplicate field `minPanelAreaPx` in `surfaceRepair`",
                        key_pos,
                    ));
                }
                sr.min_panel_area_px = Some(parse_u32_val(i)?);
            }
            "minPanelWidthPx" => {
                if sr.min_panel_width_px.is_some() {
                    return Err(RichError::at(
                        "duplicate field `minPanelWidthPx` in `surfaceRepair`",
                        key_pos,
                    ));
                }
                sr.min_panel_width_px = Some(parse_u32_val(i)?);
            }
            "minPanelHeightPx" => {
                if sr.min_panel_height_px.is_some() {
                    return Err(RichError::at(
                        "duplicate field `minPanelHeightPx` in `surfaceRepair`",
                        key_pos,
                    ));
                }
                sr.min_panel_height_px = Some(parse_u32_val(i)?);
            }
            "gutterProbe" => {
                if sr.gutter_probe.is_some() {
                    return Err(RichError::at(
                        "duplicate field `gutterProbe` in `surfaceRepair`",
                        key_pos,
                    ));
                }
                sr.gutter_probe = Some(parse_gutter_probe_block(i)?);
            }
            _ => {
                return Err(RichError::at(
                    format!("unknown property `{key}` in `surfaceRepair`"),
                    key_pos,
                ));
            }
        }
        Ok(())
    })?;
    Ok(sr)
}

fn parse_css_var_entry(var_name: &str, input: &mut &str) -> PResult<CssVarSubstituteV1> {
    let block_pos = *input;
    let mut use_kind: Option<ColorUseKind> = None;
    let mut fallback: Option<String> = None;
    parse_braced_entries("cssVarSubstitute entry", input, |i| {
        let key_pos = *i;
        let key = cut_err(parse_ident).parse_next(i)?;
        require_kv_hws(&key, i)?;
        match key.as_str() {
            "use" => {
                if use_kind.is_some() {
                    return Err(RichError::at(
                        format!("duplicate field `use` for CSS variable `{var_name}`"),
                        key_pos,
                    ));
                }
                use_kind = Some(parse_color_use(i)?);
            }
            "fallback" => {
                if fallback.is_some() {
                    return Err(RichError::at(
                        format!("duplicate field `fallback` for CSS variable `{var_name}`"),
                        key_pos,
                    ));
                }
                fallback = Some(parse_string_value(false, i)?);
            }
            _ => {
                return Err(RichError::at(
                    format!("unknown property `{key}` in `cssVarSubstitute` entry"),
                    key_pos,
                ));
            }
        }
        Ok(())
    })?;

    let r#use = use_kind.ok_or_else(|| {
        RichError::at(
            format!("CSS variable `{var_name}` substitute entry requires `use`"),
            block_pos,
        )
    })?;
    Ok(CssVarSubstituteV1 { r#use, fallback })
}

fn parse_css_var_substitute_block(
    input: &mut &str,
) -> PResult<BTreeMap<String, CssVarSubstituteV1>> {
    let mut map = BTreeMap::new();
    parse_braced_entries("cssVarSubstitute", input, |i| {
        let var_pos = *i;
        let var_name = parse_string_value(false, i)?;
        if var_name.trim().is_empty() {
            return Err(RichError::at(
                "CSS variable name in `cssVarSubstitute` must not be empty",
                var_pos,
            ));
        }
        skip_hws(i)?;
        if map.contains_key(&var_name) {
            return Err(RichError::at(
                format!("duplicate CSS variable `{var_name}` in `cssVarSubstitute`"),
                var_pos,
            ));
        }
        let rule = parse_css_var_entry(&var_name, i)?;
        map.insert(var_name, rule);
        Ok(())
    })?;
    Ok(map)
}

fn parse_recolor_block(input: &mut &str) -> PResult<SiteRecolorProfileV1> {
    let mut rc = SiteRecolorProfileV1::default();
    parse_braced_entries("recolor", input, |i| {
        let key_pos = *i;
        let key = cut_err(parse_ident).parse_next(i)?;
        require_kv_hws(&key, i)?;
        match key.as_str() {
            "forceShorthandProperties" => {
                if rc.force_shorthand_properties.is_some() {
                    return Err(RichError::at(
                        "duplicate field `forceShorthandProperties` in `recolor`",
                        key_pos,
                    ));
                }
                rc.force_shorthand_properties = Some(parse_string_list(i)?);
            }
            "cssVarSubstitute" => {
                if rc.css_var_substitute.is_some() {
                    return Err(RichError::at(
                        "duplicate field `cssVarSubstitute` in `recolor`",
                        key_pos,
                    ));
                }
                rc.css_var_substitute = Some(parse_css_var_substitute_block(i)?);
            }
            _ => {
                return Err(RichError::at(
                    format!("unknown property `{key}` in `recolor`"),
                    key_pos,
                ));
            }
        }
        Ok(())
    })?;
    Ok(rc)
}

fn parse_profile_block(input: &mut &str) -> PResult<SiteProfileV1> {
    let header_pos = *input;
    let kw = parse_ident
        .parse_next(input)
        .map_err(|_| RichError::at("expected `profile \"<id>\" { ... }`", header_pos))?;
    if kw != "profile" {
        return Err(RichError::at(
            format!("expected top-level `profile` block, found `{kw}`"),
            header_pos,
        ));
    }
    skip_hws(input)?;
    let id_pos = *input;
    let id = parse_string_value(false, input)?;
    if id.trim().is_empty() {
        return Err(RichError::at("profile id must not be empty", id_pos));
    }
    skip_hws(input)?;

    let mut priority: Option<u32> = None;
    let mut r#match: Option<SiteProfileMatchV1> = None;
    let mut surface_repair: Option<SiteSurfaceRepairProfileV1> = None;
    let mut recolor: Option<SiteRecolorProfileV1> = None;
    let mut custom_css: Option<String> = None;

    parse_braced_entries("profile", input, |i| {
        let key_pos = *i;
        let key = cut_err(parse_ident).parse_next(i)?;
        require_kv_hws(&key, i)?;
        match key.as_str() {
            "priority" => {
                if priority.is_some() {
                    return Err(RichError::at("duplicate field `priority` in `profile`", key_pos));
                }
                priority = Some(parse_u32_val(i)?);
            }
            "match" => {
                if r#match.is_some() {
                    return Err(RichError::at("duplicate field `match` in `profile`", key_pos));
                }
                r#match = Some(parse_match_block(i)?);
            }
            "surfaceRepair" => {
                if surface_repair.is_some() {
                    return Err(RichError::at(
                        "duplicate field `surfaceRepair` in `profile`",
                        key_pos,
                    ));
                }
                surface_repair = Some(parse_surface_repair_block(i)?);
            }
            "recolor" => {
                if recolor.is_some() {
                    return Err(RichError::at("duplicate field `recolor` in `profile`", key_pos));
                }
                recolor = Some(parse_recolor_block(i)?);
            }
            "customCss" => {
                if custom_css.is_some() {
                    return Err(RichError::at("duplicate field `customCss` in `profile`", key_pos));
                }
                custom_css = Some(parse_string_value(true, i)?);
            }
            _ => {
                return Err(RichError::at(
                    format!("unknown property `{key}` in `profile`"),
                    key_pos,
                ));
            }
        }
        Ok(())
    })?;

    let r#match = r#match.ok_or_else(|| {
        RichError::at(
            format!("profile `{id}` requires a `match` block"),
            header_pos,
        )
    })?;
    if r#match.is_empty() {
        return Err(RichError::at(
            format!("profile `{id}` `match` block must specify at least one host/path rule"),
            header_pos,
        ));
    }

    Ok(SiteProfileV1 {
        v: 1,
        id,
        priority,
        r#match,
        surface_repair,
        recolor,
        custom_css,
    })
}

fn parse_patch_block(input: &mut &str) -> PResult<SiteProfilePatchV1> {
    let header_pos = *input;
    let kw = parse_ident
        .parse_next(input)
        .map_err(|_| RichError::at("expected `patch { ... }`", header_pos))?;
    if kw != "patch" {
        return Err(RichError::at(
            format!("expected top-level `patch` block, found `{kw}`"),
            header_pos,
        ));
    }
    skip_hws(input)?;

    let mut patch = SiteProfilePatchV1::default();
    parse_braced_entries("patch", input, |i| {
        let key_pos = *i;
        let key = cut_err(parse_ident).parse_next(i)?;
        require_kv_hws(&key, i)?;
        match key.as_str() {
            "disabled" => {
                if patch.disabled.is_some() {
                    return Err(RichError::at("duplicate field `disabled` in `patch`", key_pos));
                }
                patch.disabled = Some(parse_bool_val(i)?);
            }
            "surfaceRepair" => {
                if patch.surface_repair.is_some() {
                    return Err(RichError::at(
                        "duplicate field `surfaceRepair` in `patch`",
                        key_pos,
                    ));
                }
                patch.surface_repair = Some(parse_surface_repair_block(i)?);
            }
            "recolor" => {
                if patch.recolor.is_some() {
                    return Err(RichError::at("duplicate field `recolor` in `patch`", key_pos));
                }
                patch.recolor = Some(parse_recolor_block(i)?);
            }
            "customCss" => {
                if patch.custom_css.is_some() {
                    return Err(RichError::at("duplicate field `customCss` in `patch`", key_pos));
                }
                patch.custom_css = Some(parse_string_value(true, i)?);
            }
            _ => {
                return Err(RichError::at(
                    format!("unknown property `{key}` in `patch`"),
                    key_pos,
                ));
            }
        }
        Ok(())
    })?;

    Ok(patch)
}

fn parse_profiles_doc(input: &mut &str) -> PResult<Vec<SiteProfileV1>> {
    trivia(input)?;
    if input.is_empty() {
        return Err(RichError::at("expected at least one `profile` block", *input));
    }
    let mut profiles = Vec::new();
    let mut seen_ids = HashSet::new();
    while !input.is_empty() {
        let profile_pos = *input;
        let profile = parse_profile_block(input)?;
        if !seen_ids.insert(profile.id.clone()) {
            return Err(RichError::at(
                format!("duplicate profile id `{}`", profile.id),
                profile_pos,
            ));
        }
        profiles.push(profile);
        trivia(input)?;
    }
    Ok(profiles)
}

fn parse_patch_doc(input: &mut &str) -> PResult<SiteProfilePatchV1> {
    let patch = preceded(trivia, parse_patch_block).parse_next(input)?;
    trivia(input)?;
    if !input.is_empty() {
        return Err(RichError::at(
            "unexpected trailing content after `patch` block",
            *input,
        ));
    }
    Ok(patch)
}

/// Parse one or more `profile "<id>" { ... }` blocks from `.theme` source.
pub fn parse_theme_profiles(source: &str) -> Result<Vec<SiteProfileV1>, DslError> {
    parse_profiles_doc
        .parse(source)
        .map_err(|err| to_dsl_error(source, err))
}

/// Parse exactly one `profile "<id>" { ... }` block from `.theme` source.
pub fn parse_theme_profile(source: &str) -> Result<SiteProfileV1, DslError> {
    (|input: &mut &str| -> PResult<SiteProfileV1> {
        let p = preceded(trivia, parse_profile_block).parse_next(input)?;
        trivia(input)?;
        if !input.is_empty() {
            return Err(RichError::at(
                "expected single `profile` block (unexpected trailing content)",
                *input,
            ));
        }
        Ok(p)
    })
    .parse(source)
    .map_err(|err| to_dsl_error(source, err))
}

/// Parse a top-level `patch { ... }` site override from `.theme` source.
pub fn parse_theme_patch(source: &str) -> Result<SiteProfilePatchV1, DslError> {
    parse_patch_doc
        .parse(source)
        .map_err(|err| to_dsl_error(source, err))
}
