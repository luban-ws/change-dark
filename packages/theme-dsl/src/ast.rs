use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt;

/// Color usage role in CSS variable substitution rules.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ColorUseKind {
    Bg,
    Fg,
    Border,
}

impl ColorUseKind {
    pub fn as_str(self) -> &'static str {
        match self {
            ColorUseKind::Bg => "bg",
            ColorUseKind::Fg => "fg",
            ColorUseKind::Border => "border",
        }
    }
}

/// Host/path matching criteria for a site profile.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteProfileMatchV1 {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub host_equals: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub host_suffix: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path_prefix: Option<Vec<String>>,
}

impl SiteProfileMatchV1 {
    pub fn is_empty(&self) -> bool {
        let count = |opt: &Option<Vec<String>>| opt.as_ref().map_or(0, Vec::len);
        count(&self.host_equals) == 0
            && count(&self.host_suffix) == 0
            && count(&self.path_prefix) == 0
    }
}

/// Gutter probing configuration for surface repair.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GutterProbeV1 {
    pub main_selector: String,
    pub inset_px: u32,
}

/// Surface repair policy overrides for a site profile or patch.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteSurfaceRepairProfileV1 {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub landmark_selectors: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub component_class_hints: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub never_paint: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min_panel_area_px: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min_panel_width_px: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min_panel_height_px: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gutter_probe: Option<GutterProbeV1>,
}

/// Fallback declaration for CSS variable substitution.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CssVarSubstituteV1 {
    #[serde(rename = "use")]
    pub r#use: ColorUseKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fallback: Option<String>,
}

/// Dynamic recolor overrides for a site profile or patch.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteRecolorProfileV1 {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub force_shorthand_properties: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub css_var_substitute: Option<BTreeMap<String, CssVarSubstituteV1>>,
}

/// Compiled site profile IR aligned 1:1 with `@change-dark/site-catalog` `SiteProfileV1`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteProfileV1 {
    pub v: u8,
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<u32>,
    #[serde(rename = "match")]
    pub r#match: SiteProfileMatchV1,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub surface_repair: Option<SiteSurfaceRepairProfileV1>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recolor: Option<SiteRecolorProfileV1>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_css: Option<String>,
}

/// User site patch IR aligned 1:1 with `@change-dark/site-catalog` `SiteProfilePatchV1`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteProfilePatchV1 {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub disabled: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub surface_repair: Option<SiteSurfaceRepairProfileV1>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recolor: Option<SiteRecolorProfileV1>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_css: Option<String>,
}

/// Diagnostic error with 1-based line/column and 0-based byte offset.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DslError {
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub offset: usize,
}

impl fmt::Display for DslError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}:{}: {} (offset {})",
            self.line, self.column, self.message, self.offset
        )
    }
}

impl std::error::Error for DslError {}
