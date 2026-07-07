"use client";

import React, { useState } from "react";
import { Download, Copy, Image as ImageIcon } from "lucide-react";
import ArtifactToolbar from "./ArtifactToolbar";

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
  const [mode, setMode] = useState<"preview" | "code">("preview");

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
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
    <div className="flex flex-col h-full bg-surface-sunken rounded-xl shadow-md border border-border overflow-hidden" id="svg-artifact-wrapper">
      <ArtifactToolbar
        icon={<ImageIcon size={18} className="text-[#6d28d9]" />}
        title={title}
        badgeLabel="Vector Graphic"
        badgeClassName="bg-purple-50 border-purple-200/50 text-purple-600"
        mode={mode}
        onModeChange={setMode}
        exportOptions={[
          { label: "Copy SVG XML", onClick: handleCopy, icon: <Copy size={14} /> },
          { label: "Download .svg", onClick: handleDownload, icon: <Download size={14} /> },
        ]}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-surface-sunken p-6 flex items-center justify-center relative">
        {mode === "preview" ? (
          <div
            className="p-8 bg-white border border-border rounded-xl shadow-lg max-w-full max-h-full overflow-auto flex items-center justify-center"
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
