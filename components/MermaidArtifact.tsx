"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, Copy, Check, Code, GitBranch, Loader2 } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
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
    if (!isScriptLoaded || !window.mermaid || activeTab !== "preview" || !renderRef.current) return;

    setRenderError(null);
    renderRef.current.innerHTML = `<div class="mermaid">${content}</div>`;

    try {
      window.mermaid.contentLoaded();
    } catch (err: any) {
      console.error("Mermaid parsing error:", err);
      // Clean display of errors for user
      setTimeout(() => setRenderError("Syntax error: Unable to parse your flowchart diagrams."), 0);
    }
  }, [content, isScriptLoaded, activeTab]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="flex flex-col h-full bg-[#f9f9f8] rounded-xl shadow-md border border-[#ececec] overflow-hidden" id="mermaid-artifact-wrapper">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#ececec]" id="mermaid-artifact-header">
        <div className="flex items-center space-x-2">
          <GitBranch size={18} className="text-indigo-600" />
          <span className="font-sans font-semibold text-[#1a1a1a] text-sm tracking-tight truncate max-w-xs">
            {title}
          </span>
          <span className="text-xs bg-indigo-50 border border-indigo-200/50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
            Mermaid Diagram
          </span>
        </div>

        <div className="flex items-center space-x-1" id="mermaid-controls">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-focused bg-[#f3f4f6] text-[#1a1a1a]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <GitBranch size={14} className="text-indigo-600" />
            <span>Preview</span>
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "code"
                ? "bg-focused bg-[#f3f4f6] text-[#1a1a1a]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Code size={14} className="text-slate-500" />
            <span>Markup</span>
          </button>

          <div className="w-px h-5 bg-[#ececec] mx-1" />

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#f3f4f6] transition-colors cursor-pointer"
            title="Copy Markup Code"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>

          <button
            onClick={handleDownloadText}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
            title="Download Diagram Source"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Content Viewport */}
      <div className="flex-1 overflow-auto bg-[#f1f1f1] p-6 flex items-center justify-center relative">
        {activeTab === "preview" ? (
          <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px]">
            {!isScriptLoaded && !renderError && (
              <div className="flex flex-col items-center justify-center space-y-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium text-slate-500">Loading diagram renderer...</span>
              </div>
            )}

            {renderError && (
              <div className="text-center max-w-sm p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
                {renderError}
              </div>
            )}

            <div
              ref={renderRef}
              className={`p-8 bg-white border border-[#ececec] rounded-xl shadow-lg max-w-full overflow-auto flex items-center justify-center ${
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
