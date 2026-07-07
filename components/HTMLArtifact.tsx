"use client";

import React, { useState, useEffect, useRef } from "react";
import { Copy, Download } from "lucide-react";
import ArtifactToolbar from "./ArtifactToolbar";

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
  const [mode, setMode] = useState<"preview" | "code">("preview");
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
    if (mode === "preview" && iframeRef.current) {
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
  }, [content, mode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditingCode(val);
    onContentChange(val);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
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

  const handleReload = () => {
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
    <div className="flex flex-col h-full bg-surface-sunken rounded-xl shadow-md border border-border overflow-hidden" id="html-artifact-wrapper">
      <ArtifactToolbar
        icon={<div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
        title={title}
        badgeLabel="Web App"
        badgeClassName="bg-emerald-50 border-emerald-200/50 text-emerald-600"
        mode={mode}
        onModeChange={setMode}
        onReload={handleReload}
        exportOptions={[
          { label: "Copy code", onClick: handleCopy, icon: <Copy size={14} /> },
          { label: "Download .html", onClick: handleDownload, icon: <Download size={14} /> },
        ]}
      />

      {/* Main Content Area */}
      <div className="flex-1 bg-surface-sunken relative min-h-[400px]">
        {mode === "preview" ? (
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
