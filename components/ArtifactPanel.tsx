"use client";

import React, { useState, useEffect } from "react";
import { X, History, ChevronLeft, ChevronRight, Check, RefreshCw, GitCompare } from "lucide-react";
import { Artifact } from "@/lib/types";
import HTMLArtifact from "./HTMLArtifact";
import WordArtifact from "./WordArtifact";
import PPTArtifact from "./PPTArtifact";
import ExcelArtifact from "./ExcelArtifact";
import SVGArtifact from "./SVGArtifact";
import MermaidArtifact from "./MermaidArtifact";
import VisualDiff from "./VisualDiff";

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
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [restoredVersionNumber, setRestoredVersionNumber] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  // Fetch all saved versions of this artifact whenever it loads or changes
  useEffect(() => {
    if (!artifact) return;

    const fetchVersions = async () => {
      try {
        const res = await fetch(`/api/artifacts/versions?artifactId=${artifact.id}`);
        if (res.ok) {
          const data = await res.json();
          let currentVersions = data.versions || [];

          // If there are no saved versions yet, save the original unedited state right away as Version 1
          if (currentVersions.length === 0 && artifact.content) {
            try {
              const saveRes = await fetch("/api/artifacts/versions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  artifactId: artifact.id,
                  content: artifact.content,
                  type: artifact.type,
                  title: artifact.title,
                }),
              });
              if (saveRes.ok) {
                const saveData = await saveRes.json();
                if (saveData.version) {
                  currentVersions = [saveData.version];
                }
              }
            } catch (saveErr) {
              console.error("Failed to auto-save original version:", saveErr);
            }
          }

          setVersions(currentVersions);
        }
      } catch (err) {
        console.error("Failed to load versions:", err);
      }
    };

    fetchVersions();
    setTimeout(() => {
      setSelectedVersion(null);
      setRestoredVersionNumber(null);
      setShowDiff(false);
    }, 0);
  }, [artifact]);

  if (!artifact) return null;

  // Intercept onContentChange to automatically persist a new version on the server DB
  const handleLocalContentChange = async (newContent: string) => {
    onContentChange(newContent);

    try {
      await fetch("/api/artifacts/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId: artifact.id,
          content: newContent,
          type: artifact.type,
          title: artifact.title,
        }),
      });

      // Reload versions from DB
      const res = await fetch(`/api/artifacts/versions?artifactId=${artifact.id}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error("Error committing new version snapshot:", err);
    }
  };

  // Restore a historical version as the active version
  const handleRestoreVersion = async (ver: any) => {
    await handleLocalContentChange(ver.content);
    setSelectedVersion(null);
    setRestoredVersionNumber(ver.version);
    setTimeout(() => setRestoredVersionNumber(null), 3000);
  };

  // Content that should actually be sent to the individual artifact viewer
  const activeContent = selectedVersion ? selectedVersion.content : artifact.content;
  const isViewingHistory = selectedVersion !== null;

  return (
    <div
      className="h-full flex flex-col bg-[#fdfdfd] border-l border-[#ececec] shadow-2xl transition-all duration-300 relative"
      id="artifact-panel-container"
    >
      {/* Premium top header bar matching the Sleek design theme */}
      <header className="h-14 flex items-center px-4 justify-between border-b border-[#ececec] bg-white select-none relative z-10">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className={`p-1.5 rounded flex-shrink-0 ${
            artifact.type === "word" ? "bg-blue-50 text-blue-600" :
            artifact.type === "excel" ? "bg-green-50 text-green-600" :
            artifact.type === "ppt" ? "bg-orange-50 text-orange-600" :
            artifact.type === "svg" ? "bg-purple-50 text-purple-600" :
            artifact.type === "mermaid" ? "bg-indigo-50 text-indigo-600" :
            "bg-emerald-50 text-emerald-600"
          }`}>
            <span className="material-symbols-outlined text-sm font-bold block leading-none">
              {artifact.type === "word" ? "description" :
               artifact.type === "excel" ? "table_chart" :
               artifact.type === "ppt" ? "present_to_all" :
               artifact.type === "svg" ? "image" :
               artifact.type === "mermaid" ? "git_branch" :
               "terminal"}
            </span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-[#1a1a1a] truncate">
              {artifact.title}
            </span>
            {isViewingHistory && (
              <span className="text-[10px] text-amber-600 font-bold tracking-tight">
                Viewing Version History: V{selectedVersion.version} (Preview)
              </span>
            )}
            {restoredVersionNumber && (
              <span className="text-[10px] text-emerald-600 font-bold tracking-tight animate-pulse">
                Successfully restored Version V{restoredVersionNumber}!
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-[10px] bg-[#f3f4f6] text-[#8e8e8e] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            {artifact.type}
          </span>

          {/* Visual Diff Toggle Button */}
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              showDiff
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                : "bg-white text-slate-700 border-[#e0e0e0] hover:bg-[#f9f9f8]"
            }`}
            title="Compare with original AI-generated version"
          >
            <GitCompare size={13} className={showDiff ? "text-emerald-600" : "text-slate-500"} />
            <span className="hidden sm:inline">Visual Diff</span>
          </button>

          {/* Version History Toggle Button */}
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              showVersionHistory
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-white text-slate-700 border-[#e0e0e0] hover:bg-[#f9f9f8]"
            }`}
            title="View History Versions"
          >
            <History size={13} />
            <span className="hidden sm:inline">Versions ({versions.length || 1})</span>
          </button>

          <button
            onClick={onClose}
            className="text-[#8e8e8e] hover:text-[#1a1a1a] transition-colors p-1.5 hover:bg-[#f3f4f6] rounded-lg cursor-pointer"
            title="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Render active document editor */}
        <div className="flex-1 overflow-hidden p-3 relative bg-[#f1f1f1] flex flex-col h-full">
          {/* History Mode Info Panel */}
          {isViewingHistory && (
            <div className="mb-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-amber-800 shadow-sm">
              <span className="font-medium">
                You are previewing a static history state: <strong>Version {selectedVersion.version}</strong>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRestoreVersion(selectedVersion)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-colors"
                >
                  Restore this version
                </button>
                <button
                  onClick={() => setSelectedVersion(null)}
                  className="bg-white border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] text-slate-700 font-semibold cursor-pointer hover:bg-amber-100/50 transition-colors"
                >
                  Back to live
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative">
            {showDiff ? (
              <VisualDiff
                oldContent={versions[0]?.content || ""}
                newContent={activeContent}
                title={artifact.title}
                type={artifact.type}
              />
            ) : (
              <>
                {artifact.type === "html" && (
                  <HTMLArtifact
                    content={activeContent}
                    title={artifact.title}
                    id={artifact.id}
                    onContentChange={isViewingHistory ? () => {} : handleLocalContentChange}
                  />
                )}
                {artifact.type === "word" && (
                  <WordArtifact
                    content={activeContent}
                    title={artifact.title}
                    id={artifact.id}
                    onContentChange={isViewingHistory ? () => {} : handleLocalContentChange}
                  />
                )}
                {artifact.type === "ppt" && (
                  <PPTArtifact
                    content={activeContent}
                    title={artifact.title}
                    id={artifact.id}
                    onContentChange={isViewingHistory ? () => {} : handleLocalContentChange}
                  />
                )}
                {artifact.type === "excel" && (
                  <ExcelArtifact
                    content={activeContent}
                    title={artifact.title}
                    id={artifact.id}
                    onContentChange={isViewingHistory ? () => {} : handleLocalContentChange}
                  />
                )}
                {artifact.type === "svg" && (
                  <SVGArtifact
                    content={activeContent}
                    title={artifact.title}
                    id={artifact.id}
                    onContentChange={isViewingHistory ? () => {} : handleLocalContentChange}
                  />
                )}
                {artifact.type === "mermaid" && (
                  <MermaidArtifact
                    content={activeContent}
                    title={artifact.title}
                    id={artifact.id}
                    onContentChange={isViewingHistory ? () => {} : handleLocalContentChange}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Sliding Version History Sidebar Drawer */}
        {showVersionHistory && (
          <div className="w-64 bg-white border-l border-[#ececec] h-full flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-[#ececec] flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                <History size={12} className="text-amber-600" />
                <span>Version Snapshots</span>
              </span>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-[#8e8e8e] hover:text-[#1a1a1a] p-1 hover:bg-[#ececec] rounded"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {/* If no saved versions yet, show the currently active state as V1 */}
              {versions.length === 0 ? (
                <div
                  onClick={() => setSelectedVersion(null)}
                  className={`p-3 border rounded-xl text-left cursor-pointer transition-all ${
                    selectedVersion === null
                      ? "border-blue-500 bg-blue-50/20 text-[#1a1a1a] font-semibold"
                      : "border-[#ececec] hover:border-[#c0c0c0] text-slate-600"
                  }`}
                >
                  <div className="text-xs font-bold">V1 (Initial Active)</div>
                  <div className="text-[10px] text-slate-500 mt-1">Current unmodified live state</div>
                </div>
              ) : (
                versions.map((ver, idx) => {
                  const isCurrentSelected = selectedVersion?.id === ver.id;
                  const isLiveActive = selectedVersion === null && idx === versions.length - 1;
                  return (
                    <div
                      key={ver.id}
                      onClick={() => setSelectedVersion(ver)}
                      className={`p-3 border rounded-xl text-left cursor-pointer transition-all relative group ${
                        isCurrentSelected
                          ? "border-amber-500 bg-amber-50/10 text-amber-900 font-semibold shadow-sm"
                          : isLiveActive
                          ? "border-blue-500 bg-blue-50/10 text-blue-900 font-semibold shadow-sm"
                          : "border-[#ececec] hover:border-[#c0c0c0] text-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1a1a1a]">
                          Version {ver.version} {idx === versions.length - 1 && " (Latest)"}
                        </span>
                        {isLiveActive && (
                          <span className="text-[8px] bg-blue-100 text-blue-800 font-semibold px-1 rounded uppercase tracking-wider">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#8e8e8e] mt-1.5">
                        {new Date(ver.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}{" "}
                        • {new Date(ver.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </p>

                      {/* Quick Restore link on hover */}
                      {!isLiveActive && !isCurrentSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreVersion(ver);
                          }}
                          className="absolute right-2.5 bottom-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
