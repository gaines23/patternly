export const KIND_LABELS = {
  formula: "Formula",
  automation: "Agent Automation",
  custom_field_set: "Custom Field Set",
  template: "Template",
  integration_recipe: "Integration Recipe",
  snippet: "Snippet",
};

export const KIND_OPTIONS = Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }));

export const KIND_ACCENT = {
  formula:            { bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" },
  automation:         { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  custom_field_set:   { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  template:           { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
  integration_recipe: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  snippet:            { bg: "#F1F5F9", color: "#334155", border: "#CBD5E1" },
};

export const SOURCE_LAYER_LABELS = {
  "build.automations":   "Build · Automations",
  "build.custom_fields": "Build · Custom Fields",
  "build.workflows":     "Build · Workflows",
  "build.integrations":  "Build · Integrations",
  "other":               "Other",
};

export const F = "'Plus Jakarta Sans', sans-serif";
export const MONO = "'JetBrains Mono', 'Fira Code', monospace";
