"use client";

import React, { useState } from "react";
import { Download, Copy, Check, Code, Image as ImageIcon } from "lucide-react";

interface SVGArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange?: (newContent: string) => void;
}

export default function SVGArtifact({
  content,
  title,
  id,
  onContentChange,
}: SVGArtifactProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#f9f9f8] rounded-xl shadow-md border border-[#ececec] overflow-hidden" id="svg-artifact-wrapper">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#ececec]" id="svg-artifact-header">
        <div className="flex items-center space-x-2">
          <ImageIcon size={18} className="text-[#6d28d9]" />
          <span className="font-sans font-semibold text-[#1a1a1a] text-sm tracking-tight truncate max-w-xs">
            {title}
          </span>
          <span className="text-xs bg-purple-50 border border-purple-200/50 text-purple-600 font-medium px-2 py-0.5 rounded-full">
            Vector Graphic
          </span>
        </div>

        <div className="flex items-center space-x-1" id="svg-controls">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-focused bg-[#f3f4f6] text-[#1a1a1a]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ImageIcon size={14} className="text-[#6d28d9]" />
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
            <span>Code</span>
          </button>

          <div className="w-px h-5 bg-[#ececec] mx-1" />

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#f3f4f6] transition-colors cursor-pointer"
            title="Copy SVG XML"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#6d28d9] hover:bg-[#5b21b6] text-white shadow-sm transition-all cursor-pointer"
            title="Download SVG"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-[#f1f1f1] p-6 flex items-center justify-center relative">
        {activeTab === "preview" ? (
          <div
            className="p-8 bg-white border border-[#ececec] rounded-xl shadow-lg max-w-full max-h-full overflow-auto flex items-center justify-center"
            id="svg-render-viewport"
          >
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onContentChange?.(e.target.value)}
            className="w-full h-full font-mono text-xs p-4 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:outline-none resize-none leading-relaxed"
            id="svg-raw-code-editor"
          />
        )}
      </div>
    </div>
  );
}
