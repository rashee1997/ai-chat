"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { X, History, ChevronLeft, ChevronRight, Check, RefreshCw, GitCompare, Loader2 } from "lucide-react";
import { Artifact } from "@/lib/types";
import HTMLArtifact from "./HTMLArtifact";
import WordArtifact from "./WordArtifact";
import PPTArtifact from "./PPTArtifact";
import ExcelArtifact from "./ExcelArtifact";
import SVGArtifact from "./SVGArtifact";
import MermaidArtifact from "./MermaidArtifact";
import VisualDiff from "./VisualDiff";

// Sandpack (~700KB) is only needed when a "react" artifact is actually
// opened — load it on demand instead of bloating every page's bundle.
const ReactArtifact = dynamic(() => import("./ReactArtifact"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-full items-center justify-center bg-surface-sunken rounded-xl border border-border gap-3 text-on-surface-muted">
      <Loader2 size={20} className="animate-spin text-primary" />
      <span className="text-xs font-medium">Loading React workspace…</span>
    </div>
  ),
});

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
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const touchStartY = useRef<number | null>(null);

  // Mobile-only swipe-down-to-close: track the vertical drag on the header/
  // grab handle and dismiss the panel past a threshold, snapping back otherwise.
  const SWIPE_CLOSE_THRESHOLD = 90;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragOffsetY(delta);
  };

  const handleTouchEnd = () => {
    if (dragOffsetY > SWIPE_CLOSE_THRESHOLD) {
      onClose();
    }
    setDragOffsetY(0);
    touchStartY.current = null;
  };

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
      className="h-full flex flex-col bg-surface border-l border-border shadow-2xl relative"
      id="artifact-panel-container"
      style={{
        transform: dragOffsetY ? `translateY(${dragOffsetY}px)` : undefined,
        transition: dragOffsetY ? "none" : "transform 200ms ease-out",
      }}
    >
      {/* Mobile-only grab handle: swipe down to dismiss the full-screen overlay */}
      <div
        className="hidden max-lg:flex items-center justify-center py-2 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1.5 rounded-full bg-border" aria-hidden="true" />
      </div>

      {/* Premium top header bar matching the Sleek design theme */}
      <header className="h-14 flex items-center px-4 justify-between border-b border-border bg-surface-raised select-none relative z-10">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className={`p-1.5 rounded flex-shrink-0 ${
            artifact.type === "word" ? "bg-blue-50 text-blue-600" :
            artifact.type === "excel" ? "bg-green-50 text-green-600" :
            artifact.type === "ppt" ? "bg-orange-50 text-orange-600" :
            artifact.type === "svg" ? "bg-purple-50 text-purple-600" :
            artifact.type === "mermaid" ? "bg-indigo-50 text-indigo-600" :
            artifact.type === "react" ? "bg-sky-50 text-sky-600" :
            "bg-success-surface text-success"
          }`}>
            <span className="material-symbols-outlined text-sm font-bold block leading-none">
              {artifact.type === "word" ? "description" :
               artifact.type === "excel" ? "table_chart" :
               artifact.type === "ppt" ? "present_to_all" :
               artifact.type === "svg" ? "image" :
               artifact.type === "mermaid" ? "git_branch" :
               artifact.type === "react" ? "code_blocks" :
               "terminal"}
            </span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-on-surface truncate">
              {artifact.title}
            </span>
            {isViewingHistory && (
              <span className="text-[10px] text-warning font-bold tracking-tight">
                Viewing Version History: V{selectedVersion.version} (Preview)
              </span>
            )}
            {restoredVersionNumber && (
              <span className="text-[10px] text-success font-bold tracking-tight animate-pulse">
                Successfully restored Version V{restoredVersionNumber}!
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-[10px] bg-surface-sunken text-on-surface-muted px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            {artifact.type}
          </span>

          {/* Visual Diff Toggle Button */}
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              showDiff
                ? "bg-success-surface text-success border-success/30 shadow-sm"
                : "bg-surface-raised text-on-surface border-border hover:bg-surface-sunken"
            }`}
            title="Compare with original AI-generated version"
          >
            <GitCompare size={13} className={showDiff ? "text-success" : "text-on-surface-muted"} />
            <span className="hidden @lg/artifact:inline">Visual Diff</span>
          </button>

          {/* Version History Toggle Button */}
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              showVersionHistory
                ? "bg-warning-surface text-warning border-warning/30"
                : "bg-surface-raised text-on-surface border-border hover:bg-surface-sunken"
            }`}
            title="View History Versions"
          >
            <History size={13} />
            <span className="hidden @lg/artifact:inline">Versions ({versions.length || 1})</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:p-1.5 text-on-surface-muted hover:text-on-surface transition-colors hover:bg-surface-sunken rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            title="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Render active document editor */}
        <div className="flex-1 overflow-hidden p-3 relative bg-surface-sunken flex flex-col h-full">
          {/* History Mode Info Panel */}
          {isViewingHistory && (
            <div className="mb-2 bg-warning-surface border border-warning/30 p-2.5 rounded-xl flex items-center justify-between text-xs text-warning shadow-sm">
              <span className="font-medium">
                You are previewing a static history state: <strong>Version {selectedVersion.version}</strong>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRestoreVersion(selectedVersion)}
                  className="bg-warning hover:opacity-90 text-on-primary font-bold px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-colors"
                >
                  Restore this version
                </button>
                <button
                  onClick={() => setSelectedVersion(null)}
                  className="bg-surface-raised border border-warning/30 px-2.5 py-1 rounded-lg text-[11px] text-on-surface font-semibold cursor-pointer hover:bg-warning-surface transition-colors"
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
                {artifact.type === "react" && (
                  <ReactArtifact
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
          <div className="w-64 bg-surface-raised border-l border-border h-full flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-sunken">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center space-x-1">
                <History size={12} className="text-warning" />
                <span>Version Snapshots</span>
              </span>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-on-surface-muted hover:text-on-surface p-1 hover:bg-surface-sunken rounded"
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
                      ? "border-primary bg-primary/10 text-on-surface font-semibold"
                      : "border-border hover:border-on-surface-muted/40 text-on-surface-muted"
                  }`}
                >
                  <div className="text-xs font-bold">V1 (Initial Active)</div>
                  <div className="text-[10px] text-on-surface-muted mt-1">Current unmodified live state</div>
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
                          ? "border-warning bg-warning-surface/10 text-warning font-semibold shadow-sm"
                          : isLiveActive
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                          : "border-border hover:border-on-surface-muted/40 text-on-surface-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface">
                          Version {ver.version} {idx === versions.length - 1 && " (Latest)"}
                        </span>
                        {isLiveActive && (
                          <span className="text-[8px] bg-primary/15 text-primary font-semibold px-1 rounded uppercase tracking-wider">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-on-surface-muted mt-1.5">
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
                          className="absolute right-2.5 bottom-2 bg-surface-sunken hover:bg-surface-sunken/70 text-on-surface text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
