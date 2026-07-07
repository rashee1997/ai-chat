"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, Copy, GitBranch, Loader2 } from "lucide-react";
import ArtifactToolbar from "./ArtifactToolbar";

interface MermaidArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange?: (newContent: string) => void;
}

declare global {
  interface Window {
    mermaid?: any;
  }
}

export default function MermaidArtifact({
  content,
  title,
  id,
  onContentChange,
}: MermaidArtifactProps) {
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderRef = useRef<HTMLDivElement>(null);

  // Load Mermaid CDN dynamically
  useEffect(() => {
    if (window.mermaid) {
      setTimeout(() => setIsScriptLoaded(true), 0);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
      });
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      setRenderError("Failed to load Mermaid renderer from CDN.");
    };
    document.body.appendChild(script);

    return () => {
      // Keep script loaded on page
    };
  }, []);

  // Re-render Mermaid chart when content or script status changes
  useEffect(() => {
    if (!isScriptLoaded || !window.mermaid || mode !== "preview" || !renderRef.current) return;

    setRenderError(null);
    renderRef.current.innerHTML = `<div class="mermaid">${content}</div>`;

    try {
      window.mermaid.contentLoaded();
    } catch (err: any) {
      console.error("Mermaid parsing error:", err);
      // Clean display of errors for user
      setTimeout(() => setRenderError("Syntax error: Unable to parse your flowchart diagrams."), 0);
    }
  }, [content, isScriptLoaded, mode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownloadText = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.mmd`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-surface-sunken rounded-xl shadow-md border border-border overflow-hidden" id="mermaid-artifact-wrapper">
      <ArtifactToolbar
        icon={<GitBranch size={18} className="text-indigo-600" />}
        title={title}
        badgeLabel="Mermaid Diagram"
        badgeClassName="bg-indigo-50 border-indigo-200/50 text-indigo-600"
        mode={mode}
        onModeChange={setMode}
        codeLabel="Markup"
        exportOptions={[
          { label: "Copy markup", onClick: handleCopy, icon: <Copy size={14} /> },
          { label: "Download .mmd", onClick: handleDownloadText, icon: <Download size={14} /> },
        ]}
      />

      {/* Content Viewport */}
      <div className="flex-1 overflow-auto bg-surface-sunken p-6 flex items-center justify-center relative">
        {mode === "preview" ? (
          <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px]">
            {!isScriptLoaded && !renderError && (
              <div className="flex flex-col items-center justify-center space-y-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium text-on-surface-muted">Loading diagram renderer...</span>
              </div>
            )}

            {renderError && (
              <div className="text-center max-w-sm p-4 bg-danger-surface border border-danger/30 rounded-xl text-danger text-xs font-medium">
                {renderError}
              </div>
            )}

            <div
              ref={renderRef}
              className={`p-8 bg-white border border-border rounded-xl shadow-lg max-w-full overflow-auto flex items-center justify-center ${
                !isScriptLoaded || renderError ? "hidden" : "block"
              }`}
              id="mermaid-render-viewport"
            />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onContentChange?.(e.target.value)}
            className="w-full h-full font-mono text-xs p-4 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:outline-none resize-none leading-relaxed"
            id="mermaid-raw-code-editor"
          />
        )}
      </div>
    </div>
  );
}
