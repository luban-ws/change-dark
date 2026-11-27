pub mod ast;
pub mod format;
pub mod parser;

pub use ast::{
    ColorUseKind, CssVarSubstituteV1, DslError, GutterProbeV1, SiteProfileMatchV1,
    SiteProfilePatchV1, SiteProfileV1, SiteRecolorProfileV1, SiteSurfaceRepairProfileV1,
};
pub use format::{format_theme_patch, format_theme_profile};
pub use parser::{parse_theme_patch, parse_theme_profile, parse_theme_profiles};

#[cfg(test)]
mod tests {
    use super::*;

    const GMP_THEME: &str = r#"// Google Marketing Platform bundled profile
# Maintained as .theme source of truth
profile "google-marketing-platform" {
  priority 10
  match {
    hostSuffix [
      "marketingplatform.google.com",
    ]
  }
  surfaceRepair {
    neverPaint [
      ".h-c-page",
      ".h-c-grid",
      ".secondary-hero__background",
      ".secondary-hero__frame",
      ".gmp-banner",
    ]
    gutterProbe {
      mainSelector "main.gmp-page"
      insetPx 24
    }
  }
  recolor {
    forceShorthandProperties [
      "border-left",
      "border-right",
    ]
  }
}
"#;

    #[test]
    fn gmp_profile_matches_legacy_json_1_to_1() {
        let profiles = parse_theme_profiles(GMP_THEME).expect("GMP theme should parse");
        assert_eq!(profiles.len(), 1);
        let parsed = serde_json::to_value(&profiles[0]).expect("serialize parsed");

        let expected: serde_json::Value = serde_json::json!({
            "v": 1,
            "id": "google-marketing-platform",
            "priority": 10,
            "match": {
                "hostSuffix": ["marketingplatform.google.com"]
            },
            "surfaceRepair": {
                "neverPaint": [
                    ".h-c-page",
                    ".h-c-grid",
                    ".secondary-hero__background",
                    ".secondary-hero__frame",
                    ".gmp-banner"
                ],
                "gutterProbe": {
                    "mainSelector": "main.gmp-page",
                    "insetPx": 24
                }
            },
            "recolor": {
                "forceShorthandProperties": ["border-left", "border-right"]
            }
        });

        assert_eq!(parsed, expected);
    }

    #[test]
    fn parses_multi_profile_with_semicolons_css_vars_and_multiline_css() {
        let src = r##"
profile "site-a" {
  match { hostEquals ["a.example.com"]; pathPrefix ["/docs"] }
  customCss ".a { color: #fff; }"
}

profile "site-b" {
  priority 25
  match { hostSuffix ["b.example.com"] }
  surfaceRepair {
    landmarkSelectors ["main", "aside"]; minPanelAreaPx 40000; minPanelWidthPx 200; minPanelHeightPx 120
    componentClassHints ["card", "panel",]
  }
  recolor {
    cssVarSubstitute {
      "--surface-0" { use bg; fallback "#ffffff" }
      "--ink-0" { use fg }
      "--line-0" { use border; fallback "rgba(0,0,0,0.1)" }
    }
  }
  customCss """
body {
  background: var(--surface-0);
}
"""
}
"##;
        let profiles = parse_theme_profiles(src).expect("multi-profile should parse");
        assert_eq!(profiles.len(), 2);
        assert_eq!(profiles[0].id, "site-a");
        assert_eq!(profiles[0].custom_css.as_deref(), Some(".a { color: #fff; }"));

        let b = &profiles[1];
        assert_eq!(b.priority, Some(25));
        let sr = b.surface_repair.as_ref().expect("surfaceRepair");
        assert_eq!(sr.min_panel_area_px, Some(40_000));
        assert_eq!(sr.min_panel_width_px, Some(200));
        assert_eq!(sr.min_panel_height_px, Some(120));
        assert_eq!(
            sr.component_class_hints.as_ref().unwrap(),
            &vec!["card".to_string(), "panel".to_string()]
        );

        let vars = b
            .recolor
            .as_ref()
            .unwrap()
            .css_var_substitute
            .as_ref()
            .unwrap();
        assert_eq!(vars["--surface-0"].r#use, ColorUseKind::Bg);
        assert_eq!(vars["--surface-0"].fallback.as_deref(), Some("#ffffff"));
        assert_eq!(vars["--ink-0"].r#use, ColorUseKind::Fg);
        assert_eq!(vars["--ink-0"].fallback, None);
        assert_eq!(vars["--line-0"].r#use, ColorUseKind::Border);
        assert_eq!(
            b.custom_css.as_deref(),
            Some("body {\n  background: var(--surface-0);\n}\n")
        );
    }

    #[test]
    fn round_trips_profile_and_patch_losslessly() {
        let profile = parse_theme_profile(GMP_THEME).expect("parse GMP");
        let formatted_profile = format_theme_profile(&profile);
        let reparsed_profile = parse_theme_profile(&formatted_profile).expect("reparse GMP");
        assert_eq!(profile, reparsed_profile);

        let patch_src = r##"
patch {
  disabled false
  surfaceRepair {
    neverPaint [".hero", ".banner"]
    minPanelAreaPx 5000
    gutterProbe { mainSelector "main#app"; insetPx 16 }
  }
  recolor {
    forceShorthandProperties ["border-top"]
    cssVarSubstitute {
      "--bg" { use bg; fallback "#121316" }
    }
  }
  customCss """
.hero { opacity: 0.95; }
"""
}
"##;
        let patch = parse_theme_patch(patch_src).expect("parse patch");
        let formatted_patch = format_theme_patch(&patch);
        let reparsed_patch = parse_theme_patch(&formatted_patch).expect("reparse patch");
        assert_eq!(patch, reparsed_patch);

        // Also test multiline CSS without a trailing newline and escaped chars
        let edge_patch = SiteProfilePatchV1 {
            disabled: Some(true),
            surface_repair: None,
            recolor: None,
            custom_css: Some(".a {\n  content: \"hi\\there\";\n}".to_string()),
        };
        let fmt_edge = format_theme_patch(&edge_patch);
        assert_eq!(parse_theme_patch(&fmt_edge).unwrap(), edge_patch);
    }

    #[test]
    fn reports_accurate_line_and_column_diagnostics() {
        // Line 3, col 3 unknown property
        let err = parse_theme_profile(
            "profile \"x\" {\n  match { hostEquals [\"x.com\"] }\n  bogusProp 1\n}\n",
        )
        .unwrap_err();
        assert_eq!(err.line, 3);
        assert_eq!(err.column, 3);
        assert!(err.message.contains("unknown property `bogusProp`"));

        // Duplicate profile id in same document
        let err_dup_id = parse_theme_profiles(
            "profile \"dup\" {\n  match { hostEquals [\"a.com\"] }\n}\nprofile \"dup\" {\n  match { hostEquals [\"b.com\"] }\n}\n",
        )
        .unwrap_err();
        assert_eq!(err_dup_id.line, 4);
        assert_eq!(err_dup_id.column, 1);
        assert!(err_dup_id.message.contains("duplicate profile id `dup`"));

        // Duplicate field inside patch
        let err_dup_field =
            parse_theme_patch("patch {\n  disabled true\n  disabled false\n}\n").unwrap_err();
        assert_eq!(err_dup_field.line, 3);
        assert_eq!(err_dup_field.column, 3);
        assert!(err_dup_field.message.contains("duplicate field `disabled`"));

        // Missing match block
        let err_no_match =
            parse_theme_profile("profile \"no-match\" {\n  priority 1\n}\n").unwrap_err();
        assert_eq!(err_no_match.line, 1);
        assert_eq!(err_no_match.column, 1);
        assert!(err_no_match.message.contains("requires a `match` block"));

        // Unterminated string
        let err_str =
            parse_theme_patch("patch {\n  customCss \"unterminated\n}\n").unwrap_err();
        assert_eq!(err_str.line, 2);
        assert_eq!(err_str.column, 13);

        // Missing separator between same-line properties
        let err_sep =
            parse_theme_patch("patch {\n  disabled true customCss \"x\"\n}\n").unwrap_err();
        assert_eq!(err_sep.line, 2);
        assert!(err_sep.message.contains("expected newline or `;`"));
    }
}
