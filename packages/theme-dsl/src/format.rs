use crate::ast::{
    SiteProfilePatchV1, SiteProfileV1, SiteRecolorProfileV1, SiteSurfaceRepairProfileV1,
};
use std::fmt::Write;

fn push_indent(out: &mut String, level: usize) {
    for _ in 0..level {
        out.push_str("  ");
    }
}

fn push_quoted_string(out: &mut String, s: &str) {
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            other => out.push(other),
        }
    }
    out.push('"');
}

fn push_custom_css_value(out: &mut String, css: &str) {
    if css.contains('\n') && !css.contains("\"\"\"") {
        out.push_str("\"\"\"\n");
        out.push_str(css);
        out.push_str("\"\"\"");
    } else {
        push_quoted_string(out, css);
    }
}

fn push_string_list_field(out: &mut String, indent: usize, key: &str, items: &[String]) {
    push_indent(out, indent);
    out.push_str(key);
    if items.is_empty() {
        out.push_str(" []\n");
        return;
    }
    out.push_str(" [\n");
    for item in items {
        push_indent(out, indent + 1);
        push_quoted_string(out, item);
        out.push_str(",\n");
    }
    push_indent(out, indent);
    out.push_str("]\n");
}

fn push_surface_repair(out: &mut String, indent: usize, sr: &SiteSurfaceRepairProfileV1) {
    push_indent(out, indent);
    out.push_str("surfaceRepair {\n");
    if let Some(ref selectors) = sr.landmark_selectors {
        push_string_list_field(out, indent + 1, "landmarkSelectors", selectors);
    }
    if let Some(ref hints) = sr.component_class_hints {
        push_string_list_field(out, indent + 1, "componentClassHints", hints);
    }
    if let Some(ref never_paint) = sr.never_paint {
        push_string_list_field(out, indent + 1, "neverPaint", never_paint);
    }
    if let Some(area) = sr.min_panel_area_px {
        push_indent(out, indent + 1);
        let _ = writeln!(out, "minPanelAreaPx {area}");
    }
    if let Some(width) = sr.min_panel_width_px {
        push_indent(out, indent + 1);
        let _ = writeln!(out, "minPanelWidthPx {width}");
    }
    if let Some(height) = sr.min_panel_height_px {
        push_indent(out, indent + 1);
        let _ = writeln!(out, "minPanelHeightPx {height}");
    }
    if let Some(ref gp) = sr.gutter_probe {
        push_indent(out, indent + 1);
        out.push_str("gutterProbe {\n");
        push_indent(out, indent + 2);
        out.push_str("mainSelector ");
        push_quoted_string(out, &gp.main_selector);
        out.push('\n');
        push_indent(out, indent + 2);
        let _ = writeln!(out, "insetPx {}", gp.inset_px);
        push_indent(out, indent + 1);
        out.push_str("}\n");
    }
    push_indent(out, indent);
    out.push_str("}\n");
}

fn push_recolor(out: &mut String, indent: usize, rc: &SiteRecolorProfileV1) {
    push_indent(out, indent);
    out.push_str("recolor {\n");
    if let Some(ref props) = rc.force_shorthand_properties {
        push_string_list_field(out, indent + 1, "forceShorthandProperties", props);
    }
    if let Some(ref vars) = rc.css_var_substitute {
        push_indent(out, indent + 1);
        out.push_str("cssVarSubstitute {\n");
        for (name, rule) in vars {
            push_indent(out, indent + 2);
            push_quoted_string(out, name);
            out.push_str(" {\n");
            push_indent(out, indent + 3);
            let _ = writeln!(out, "use {}", rule.r#use.as_str());
            if let Some(ref fb) = rule.fallback {
                push_indent(out, indent + 3);
                out.push_str("fallback ");
                push_quoted_string(out, fb);
                out.push('\n');
            }
            push_indent(out, indent + 2);
            out.push_str("}\n");
        }
        push_indent(out, indent + 1);
        out.push_str("}\n");
    }
    push_indent(out, indent);
    out.push_str("}\n");
}

/// Format a `SiteProfileV1` into canonical `.theme` DSL text that round-trips cleanly.
pub fn format_theme_profile(profile: &SiteProfileV1) -> String {
    let mut out = String::new();
    out.push_str("profile ");
    push_quoted_string(&mut out, &profile.id);
    out.push_str(" {\n");

    if let Some(priority) = profile.priority {
        push_indent(&mut out, 1);
        let _ = writeln!(out, "priority {priority}");
    }

    push_indent(&mut out, 1);
    out.push_str("match {\n");
    if let Some(ref eq) = profile.r#match.host_equals {
        push_string_list_field(&mut out, 2, "hostEquals", eq);
    }
    if let Some(ref suf) = profile.r#match.host_suffix {
        push_string_list_field(&mut out, 2, "hostSuffix", suf);
    }
    if let Some(ref path) = profile.r#match.path_prefix {
        push_string_list_field(&mut out, 2, "pathPrefix", path);
    }
    push_indent(&mut out, 1);
    out.push_str("}\n");

    if let Some(ref sr) = profile.surface_repair {
        push_surface_repair(&mut out, 1, sr);
    }
    if let Some(ref rc) = profile.recolor {
        push_recolor(&mut out, 1, rc);
    }
    if let Some(ref css) = profile.custom_css {
        push_indent(&mut out, 1);
        out.push_str("customCss ");
        push_custom_css_value(&mut out, css);
        out.push('\n');
    }

    out.push_str("}\n");
    out
}

/// Format a `SiteProfilePatchV1` into canonical `.theme` patch DSL text that round-trips cleanly.
pub fn format_theme_patch(patch: &SiteProfilePatchV1) -> String {
    let mut out = String::new();
    out.push_str("patch {\n");

    if let Some(disabled) = patch.disabled {
        push_indent(&mut out, 1);
        let _ = writeln!(out, "disabled {disabled}");
    }
    if let Some(ref sr) = patch.surface_repair {
        push_surface_repair(&mut out, 1, sr);
    }
    if let Some(ref rc) = patch.recolor {
        push_recolor(&mut out, 1, rc);
    }
    if let Some(ref css) = patch.custom_css {
        push_indent(&mut out, 1);
        out.push_str("customCss ");
        push_custom_css_value(&mut out, css);
        out.push('\n');
    }

    out.push_str("}\n");
    out
}
