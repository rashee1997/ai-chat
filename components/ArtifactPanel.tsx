"use client";

import React from "react";
import { X, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Artifact } from "@/lib/types";
import HTMLArtifact from "./HTMLArtifact";
import WordArtifact from "./WordArtifact";
import PPTArtifact from "./PPTArtifact";
import ExcelArtifact from "./ExcelArtifact";

interface ArtifactPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
  onContentChange: (newContent: string) => void;
}

export default function ArtifactPanel({
  artifact,
  onClose,
  onContentChange,
}: ArtifactPanelProps) {
  if (!artifact) return null;

  return (
    <div
      className="h-full flex flex-col bg-white border-l border-[#ececec] shadow-2xl transition-all duration-300 relative"
      id="artifact-panel-container"
    >
      {/* Premium top header bar matching the Sleek design theme */}
      <header className="h-14 flex items-center px-4 justify-between border-b border-[#ececec] bg-white select-none">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className={`p-1.5 rounded flex-shrink-0 ${
            artifact.type === "word" ? "bg-blue-50 text-blue-600" :
            artifact.type === "excel" ? "bg-green-50 text-green-600" :
            artifact.type === "ppt" ? "bg-orange-50 text-orange-600" :
            "bg-emerald-50 text-emerald-600"
          }`}>
            <span className="material-symbols-outlined text-sm font-bold block leading-none">
              {artifact.type === "word" ? "description" :
               artifact.type === "excel" ? "table_chart" :
               artifact.type === "ppt" ? "present_to_all" :
               "terminal"}
            </span>
          </div>
          <span className="text-sm font-semibold text-[#1a1a1a] truncate">
            {artifact.title}
          </span>
        </div>
        
        <div className="flex items-center space-x-3 flex-shrink-0">
          <span className="text-[10px] bg-[#f3f4f6] text-[#8e8e8e] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            {artifact.type}
          </span>
          <button
            onClick={onClose}
            className="text-[#8e8e8e] hover:text-[#1a1a1a] transition-colors p-1.5 hover:bg-[#f3f4f6] rounded-lg cursor-pointer"
            title="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Dynamic render of document editors */}
      <div className="flex-1 overflow-hidden p-3 relative bg-[#f1f1f1]">
        {artifact.type === "html" && (
          <HTMLArtifact
            content={artifact.content}
            title={artifact.title}
            id={artifact.id}
            onContentChange={onContentChange}
          />
        )}
        {artifact.type === "word" && (
          <WordArtifact
            content={artifact.content}
            title={artifact.title}
            id={artifact.id}
            onContentChange={onContentChange}
          />
        )}
        {artifact.type === "ppt" && (
          <PPTArtifact
            content={artifact.content}
            title={artifact.title}
            id={artifact.id}
            onContentChange={onContentChange}
          />
        )}
        {artifact.type === "excel" && (
          <ExcelArtifact
            content={artifact.content}
            title={artifact.title}
            id={artifact.id}
            onContentChange={onContentChange}
          />
        )}
      </div>
    </div>
  );
}
