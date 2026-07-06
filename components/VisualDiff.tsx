"use client";

import React, { useState, useMemo } from "react";
import { diffLines, Change } from "diff";
import { Columns, Eye, GitCompare, HelpCircle, LayoutGrid, List, Check, Copy } from "lucide-react";

interface VisualDiffProps {
  oldContent: string;
  newContent: string;
  title: string;
  type: string;
}

interface AlignedDiffLine {
  leftLineNum?: number;
  leftContent?: string;
  rightLineNum?: number;
  rightContent?: string;
  type: "unchanged" | "added" | "removed" | "empty" | "modified";
}

export default function VisualDiff({
  oldContent,
  newContent,
  title,
  type,
}: VisualDiffProps) {
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");
  const [copied, setCopied] = useState(false);

  // Compute diff change blocks
  const changes = useMemo(() => {
    return diffLines(oldContent || "", newContent || "");
  }, [oldContent, newContent]);

  // Compute stats
  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    changes.forEach((change) => {
      if (change.added) {
        additions += change.count || 0;
      } else if (change.removed) {
        deletions += change.count || 0;
      }
    });
    return { additions, deletions };
  }, [changes]);

  // Align lines for Split View
  const alignedLines = useMemo<AlignedDiffLine[]>(() => {
    let leftLineCount = 1;
    let rightLineCount = 1;
    const lines: AlignedDiffLine[] = [];

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const changeLines = change.value.split(/\r?\n/);
      
      // If the change value ends with a newline, split() creates an extra empty item at the end.
      // Remove it to avoid empty trailing lines.
      if (change.value.endsWith("\n") && changeLines[changeLines.length - 1] === "") {
        changeLines.pop();
      }

      if (!change.added && !change.removed) {
        // Unchanged block
        for (const line of changeLines) {
          lines.push({
            leftLineNum: leftLineCount++,
            leftContent: line,
            rightLineNum: rightLineCount++,
            rightContent: line,
            type: "unchanged",
          });
        }
      } else if (change.removed) {
        const nextChange = changes[i + 1];
        if (nextChange && nextChange.added) {
          // Alignment: removal immediately followed by addition (representing a replacement)
          const addedLines = nextChange.value.split(/\r?\n/);
          if (nextChange.value.endsWith("\n") && addedLines[addedLines.length - 1] === "") {
            addedLines.pop();
          }

          const maxLines = Math.max(changeLines.length, addedLines.length);
          for (let j = 0; j < maxLines; j++) {
            const hasLeft = j < changeLines.length;
            const hasRight = j < addedLines.length;

            lines.push({
              leftLineNum: hasLeft ? leftLineCount++ : undefined,
              leftContent: hasLeft ? changeLines[j] : undefined,
              rightLineNum: hasRight ? rightLineCount++ : undefined,
              rightContent: hasRight ? addedLines[j] : undefined,
              type: hasLeft && hasRight ? "modified" : hasLeft ? "removed" : "added",
            });
          }
          i++; // skip next added block
        } else {
          // Standalone removal
          for (const line of changeLines) {
            lines.push({
              leftLineNum: leftLineCount++,
              leftContent: line,
              type: "removed",
            });
          }
        }
      } else if (change.added) {
        // Standalone addition
        for (const line of changeLines) {
          lines.push({
            rightLineNum: rightLineCount++,
            rightContent: line,
            type: "added",
          });
        }
      }
    }

    return lines;
  }, [changes]);

  const handleCopyUnified = async () => {
    try {
      await navigator.clipboard.writeText(newContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy content", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-sunken rounded-xl shadow-md border border-border overflow-hidden" id="visual-diff-wrapper">
      {/* Visual Diff Sub-Header / Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-raised border-b border-border" id="visual-diff-header">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-warning-surface text-warning">
            <GitCompare size={14} />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-semibold text-on-surface text-xs tracking-wide uppercase">
              Visual Difference
            </span>
            <span className="text-[10px] text-on-surface-muted font-medium">
              Comparing your edits with the original AI version
            </span>
          </div>

          {/* Addition / Deletion Badges */}
          <div className="flex items-center space-x-1.5 ml-2">
            {stats.additions > 0 && (
              <span className="text-[10px] bg-success-surface text-success font-bold px-1.5 py-0.5 rounded-md border border-success/30">
                +{stats.additions}
              </span>
            )}
            {stats.deletions > 0 && (
              <span className="text-[10px] bg-danger-surface text-danger font-bold px-1.5 py-0.5 rounded-md border border-danger/30">
                -{stats.deletions}
              </span>
            )}
            {stats.additions === 0 && stats.deletions === 0 && (
              <span className="text-[10px] bg-surface-sunken text-on-surface-muted font-bold px-1.5 py-0.5 rounded-md border border-border">
                No changes
              </span>
            )}
          </div>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center space-x-2" id="diff-view-mode-controls">
          <div className="bg-surface-sunken p-0.5 rounded-lg flex items-center border border-border/50">
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "split"
                  ? "bg-surface-raised text-on-surface shadow-sm"
                  : "text-on-surface-muted hover:text-on-surface"
              }`}
              title="Side-by-Side Split View"
            >
              <Columns size={12} />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode("unified")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "unified"
                  ? "bg-surface-raised text-on-surface shadow-sm"
                  : "text-on-surface-muted hover:text-on-surface"
              }`}
              title="Inline Unified View"
            >
              <List size={12} />
              <span>Unified</span>
            </button>
          </div>

          <div className="w-px h-5 bg-border" />

          <button
            onClick={handleCopyUnified}
            className="p-1.5 rounded-lg text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken border border-transparent hover:border-border transition-all cursor-pointer"
            title="Copy Current Version"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Main Diff Display Panel */}
      <div className="flex-1 bg-surface-sunken overflow-hidden relative font-mono text-[12px] leading-relaxed">
        {viewMode === "split" ? (
          /* SIDE-BY-SIDE SPLIT VIEW */
          <div className="absolute inset-0 grid grid-cols-2 h-full divide-x divide-border">
            {/* Original Left Panel */}
            <div className="h-full flex flex-col overflow-hidden">
              <div className="bg-surface-sunken px-4 py-1.5 border-b border-border text-on-surface-muted text-[10px] font-bold flex items-center space-x-1.5 select-none">
                <span className="w-2 h-2 rounded-full bg-danger" />
                <span>ORIGINAL AI-GENERATED VERSION</span>
              </div>
              <div className="flex-1 overflow-auto bg-surface text-on-surface p-3 select-text select-all-ignore">
                <table className="w-full table-fixed border-collapse">
                  <tbody>
                    {alignedLines.map((line, idx) => {
                      const isRemoved = line.type === "removed" || line.type === "modified";
                      const isEmpty = line.leftContent === undefined;
                      return (
                        <tr
                          key={`left-${idx}`}
                          className={`group hover:bg-on-surface/5 transition-colors ${
                            isRemoved ? "bg-danger/15 text-danger" : isEmpty ? "bg-on-surface/5" : ""
                          }`}
                        >
                          {/* Line Number */}
                          <td className="w-10 text-right pr-3 text-on-surface-muted select-none font-sans text-[10px]">
                            {line.leftLineNum || ""}
                          </td>
                          {/* Indicator */}
                          <td className="w-5 text-center text-danger font-bold select-none text-[10px]">
                            {isRemoved ? "-" : " "}
                          </td>
                          {/* Code Content */}
                          <td className="whitespace-pre overflow-hidden text-ellipsis pl-1 break-all">
                            {line.leftContent || ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current Right Panel */}
            <div className="h-full flex flex-col overflow-hidden">
              <div className="bg-surface-sunken px-4 py-1.5 border-b border-border text-on-surface-muted text-[10px] font-bold flex items-center space-x-1.5 select-none">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span>YOUR EDITED VERSION</span>
              </div>
              <div className="flex-1 overflow-auto bg-surface text-on-surface p-3 select-text">
                <table className="w-full table-fixed border-collapse">
                  <tbody>
                    {alignedLines.map((line, idx) => {
                      const isAdded = line.type === "added" || line.type === "modified";
                      const isEmpty = line.rightContent === undefined;
                      return (
                        <tr
                          key={`right-${idx}`}
                          className={`group hover:bg-on-surface/5 transition-colors ${
                            isAdded ? "bg-success/15 text-success" : isEmpty ? "bg-on-surface/5" : ""
                          }`}
                        >
                          {/* Line Number */}
                          <td className="w-10 text-right pr-3 text-on-surface-muted select-none font-sans text-[10px]">
                            {line.rightLineNum || ""}
                          </td>
                          {/* Indicator */}
                          <td className="w-5 text-center text-success/80 font-bold select-none text-[10px]">
                            {isAdded ? "+" : " "}
                          </td>
                          {/* Code Content */}
                          <td className="whitespace-pre overflow-hidden text-ellipsis pl-1 break-all">
                            {line.rightContent || ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* UNIFIED INLINE VIEW */
          <div className="absolute inset-0 flex flex-col h-full overflow-hidden">
            <div className="bg-surface-sunken px-4 py-1.5 border-b border-border text-on-surface-muted text-[10px] font-bold flex items-center space-x-1.5 select-none">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>UNIFIED CHRONOLOGY</span>
            </div>
            <div className="flex-1 overflow-auto bg-surface text-on-surface p-3 select-text">
              <table className="w-full table-fixed border-collapse">
                <tbody>
                  {(() => {
                    let leftNum = 1;
                    let rightNum = 1;
                    return changes.flatMap((change, blockIdx) => {
                      const lines = change.value.split(/\r?\n/);
                      if (change.value.endsWith("\n") && lines[lines.length - 1] === "") {
                        lines.pop();
                      }

                      return lines.map((line, lineIdx) => {
                        const isAdded = !!change.added;
                        const isRemoved = !!change.removed;
                        const currentLeft = isAdded ? "" : leftNum++;
                        const currentRight = isRemoved ? "" : rightNum++;

                        let bgClass = "";
                        let textClass = "";
                        let prefix = " ";

                        if (isAdded) {
                          bgClass = "bg-success/15";
                          textClass = "text-success";
                          prefix = "+";
                        } else if (isRemoved) {
                          bgClass = "bg-danger/15";
                          textClass = "text-danger";
                          prefix = "-";
                        }

                        return (
                          <tr
                            key={`unified-${blockIdx}-${lineIdx}`}
                            className={`group hover:bg-on-surface/5 transition-colors ${bgClass} ${textClass}`}
                          >
                            {/* Old Line Number */}
                            <td className="w-9 text-right pr-2 text-on-surface-muted select-none font-sans text-[10px]">
                              {currentLeft}
                            </td>
                            {/* New Line Number */}
                            <td className="w-9 text-right pr-2 text-on-surface-muted border-r border-border select-none font-sans text-[10px]">
                              {currentRight}
                            </td>
                            {/* Prefix */}
                            <td className={`w-6 text-center select-none font-bold text-[11px] ${isAdded ? "text-success" : isRemoved ? "text-danger" : "text-on-surface-muted"}`}>
                              {prefix}
                            </td>
                            {/* Content */}
                            <td className="whitespace-pre overflow-hidden text-ellipsis pl-1 break-all">
                              {line}
                            </td>
                          </tr>
                        );
                      });
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
