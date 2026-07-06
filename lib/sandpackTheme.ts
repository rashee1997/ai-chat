import type { SandpackTheme } from "@codesandbox/sandpack-react";

// Sandpack renders its editor/file-tree chrome directly in this app's own
// document (unlike the preview iframe, which is a separate document), so
// referencing this app's CSS custom properties here means the workspace
// re-themes for free whenever `data-theme` flips on <html> — no separate
// light/dark theme object needed.
export const appSandpackTheme: SandpackTheme = {
  colors: {
    surface1: "var(--surface-raised)",
    surface2: "var(--surface-sunken)",
    surface3: "var(--border)",
    clickable: "var(--on-surface-muted)",
    base: "var(--on-surface)",
    disabled: "var(--on-surface-muted)",
    hover: "var(--on-surface)",
    accent: "var(--primary)",
    error: "var(--danger)",
    errorSurface: "var(--danger-surface)",
    warning: "var(--warning)",
    warningSurface: "var(--warning-surface)",
  },
  syntax: {
    plain: "var(--on-surface)",
    comment: { color: "var(--on-surface-muted)", fontStyle: "italic" },
    keyword: "var(--primary)",
    definition: "var(--primary-hover)",
    punctuation: "var(--on-surface-muted)",
    property: "var(--on-surface)",
    tag: "var(--primary)",
    static: "var(--warning)",
    string: "var(--success)",
  },
  font: {
    body: "var(--font-sans)",
    mono: "var(--font-mono)",
    size: "13px",
    lineHeight: "1.6",
  },
};
