"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Eye, Code as CodeIcon, RotateCcw } from "lucide-react";

export interface ArtifactExportOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface ArtifactToolbarProps {
  mode: "preview" | "code";
  onModeChange: (mode: "preview" | "code") => void;
  previewLabel?: string;
  codeLabel?: string;
  /** Shown as a Reload icon in preview mode when provided (e.g. re-mount an
   * iframe/sandbox). Omit for renderers with nothing to reload. */
  onReload?: () => void;
  exportOptions: ArtifactExportOption[];
  /** Extra control rendered before the Preview/Code toggle, e.g. a file-tree
   * toggle for the React workspace. */
  leftExtra?: React.ReactNode;
  /** Extra control(s) rendered right after the mode toggle, shown only in
   * preview mode — e.g. a device-size switcher. */
  previewExtra?: React.ReactNode;
  /** Extra control(s) rendered after the Export dropdown (always visible),
   * e.g. a "Save as new version" or "Open in CodeSandbox" button. */
  rightExtra?: React.ReactNode;
}

/**
 * Shared per-artifact toolbar: a Preview|Code segmented toggle, an optional
 * Reload action, and a single Export dropdown consolidating copy/download
 * actions — modeled on Google AI Studio's Build-mode chrome. Title/type
 * identity and panel-level concerns (fullscreen, close, version history)
 * already live in ArtifactPanel's own header above this, so this toolbar
 * intentionally doesn't repeat them.
 */
export default function ArtifactToolbar({
  mode,
  onModeChange,
  previewLabel = "Preview",
  codeLabel = "Code",
  onReload,
  exportOptions,
  leftExtra,
  previewExtra,
  rightExtra,
}: ArtifactToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportOpen]);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-border gap-2" id="artifact-toolbar">
      <div className="flex items-center space-x-1 min-w-0">
        {leftExtra}

        <div className="flex items-center bg-surface-sunken rounded-lg p-0.5" role="tablist">
          <button
            onClick={() => onModeChange("preview")}
            role="tab"
            aria-selected={mode === "preview"}
            className={`flex items-center space-x-1.5 min-h-[38px] px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
              mode === "preview" ? "bg-surface-raised text-on-surface shadow-sm" : "text-on-surface-muted hover:text-on-surface"
            }`}
          >
            <Eye size={14} />
            <span>{previewLabel}</span>
          </button>
          <button
            onClick={() => onModeChange("code")}
            role="tab"
            aria-selected={mode === "code"}
            className={`flex items-center space-x-1.5 min-h-[38px] px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
              mode === "code" ? "bg-surface-raised text-on-surface shadow-sm" : "text-on-surface-muted hover:text-on-surface"
            }`}
          >
            <CodeIcon size={14} />
            <span>{codeLabel}</span>
          </button>
        </div>

        {mode === "preview" && previewExtra}

        {onReload && mode === "preview" && (
          <button
            onClick={onReload}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] lg:min-w-[36px] lg:min-h-[36px] rounded-lg text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken transition-colors cursor-pointer"
            title="Reload preview"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center space-x-1 flex-shrink-0">
        {exportOptions.length > 0 && (
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              aria-expanded={exportOpen}
              className="flex items-center space-x-1 min-h-[44px] lg:min-h-[36px] px-3 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-on-primary shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown size={12} />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-surface-raised border border-border rounded-lg shadow-lg z-30 overflow-hidden py-1">
                {exportOptions.map((opt, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      opt.onClick();
                      setExportOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2.5 lg:py-2 text-xs font-medium text-on-surface hover:bg-surface-sunken transition-colors cursor-pointer text-left"
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {rightExtra}
      </div>
    </div>
  );
}
