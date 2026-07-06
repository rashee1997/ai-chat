"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Code, Download, Copy, Check, RotateCcw } from "lucide-react";

interface HTMLArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange: (newContent: string) => void;
}

export default function HTMLArtifact({
  content,
  title,
  id,
  onContentChange,
}: HTMLArtifactProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [editingCode, setEditingCode] = useState(content);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Keep internal editing code in sync with external content updates using render-phase sync
  const [prevContent, setPrevContent] = useState(content);
  if (content !== prevContent) {
    setEditingCode(content);
    setPrevContent(content);
  }

  // Update preview when content changes
  useEffect(() => {
    if (activeTab === "preview" && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        // In order to make it run beautifully, we can inject Tailwind script if not present
        let htmlToRender = content;
        if (!content.includes("tailwindcss") && !content.includes("unpkg.com")) {
          htmlToRender = content.replace(
            "</head>",
            `  <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
            </head>`
          );
        }
        doc.write(htmlToRender);
        doc.close();
      }
    }
  }, [content, activeTab]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditingCode(val);
    onContentChange(val);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(content);
        doc.close();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f9f9f8] rounded-xl shadow-md border border-[#ececec] overflow-hidden" id="html-artifact-wrapper">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#ececec]" id="html-artifact-header">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-sans font-semibold text-[#1a1a1a] text-sm tracking-tight truncate max-w-xs sm:max-w-md">
            {title}
          </span>
          <span className="text-xs bg-emerald-50 border border-emerald-200/50 text-emerald-600 font-medium px-2 py-0.5 rounded-full">
            Web App
          </span>
        </div>

        <div className="flex items-center space-x-1" id="html-controls">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-[#f3f4f6] text-[#1a1a1a]"
                : "text-slate-500 hover:text-slate-900"
            }`}
            id="tab-preview-btn"
          >
            <Play size={14} className="text-emerald-500" />
            <span>Preview</span>
          </button>
          
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "code"
                ? "bg-[#f3f4f6] text-[#1a1a1a]"
                : "text-slate-500 hover:text-slate-900"
            }`}
            id="tab-code-btn"
          >
            <Code size={14} className="text-blue-500" />
            <span>Code</span>
          </button>

          <div className="w-px h-5 bg-[#ececec] mx-1" />

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#f3f4f6] transition-colors cursor-pointer"
            title="Copy Code"
            id="copy-code-btn"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#f3f4f6] transition-colors cursor-pointer"
            title="Download Code"
            id="download-html-btn"
          >
            <Download size={16} />
          </button>

          {activeTab === "preview" && (
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#f3f4f6] transition-colors cursor-pointer"
              title="Restart Application"
              id="reset-preview-btn"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-100 relative min-h-[400px]">
        {activeTab === "preview" ? (
          <iframe
            ref={iframeRef}
            className="absolute inset-0 w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-popups allow-modals allow-same-origin allow-forms"
            title={title}
            id="html-live-preview-iframe"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col font-mono text-xs bg-slate-900 text-slate-300" id="html-code-editor-container">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-500 text-[10px]">
              <span>EDITABLE SOURCE CODE</span>
              <span>HTML5 / Tailwind v4</span>
            </div>
            <textarea
              value={editingCode}
              onChange={handleCodeChange}
              className="flex-1 p-4 bg-slate-950 text-emerald-400 font-mono text-sm leading-relaxed focus:outline-none resize-none overflow-auto"
              spellCheck={false}
              id="html-code-textarea"
            />
          </div>
        )}
      </div>
    </div>
  );
}
