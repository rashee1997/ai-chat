"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import ArtifactToolbar from "./ArtifactToolbar";
import ExcelArtifact from "./ExcelArtifact";
import { excelContentToWorkbookData, workbookDataToExcelContent } from "@/lib/univerConvert";

interface UniverSheetArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange: (newContent: string) => void;
}

/**
 * Renders Excel artifacts with a real, interactive Univer Sheets instance
 * (formulas, formatting, filtering) instead of a static HTML table. Falls
 * back to the previous static ExcelArtifact renderer if Univer fails to
 * load or mount for any reason, so this can never regress below the old
 * behavior.
 */
export default function UniverSheetArtifact({ content, title, id, onContentChange }: UniverSheetArtifactProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<{ univer: any; univerAPI: any } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        const [{ createUniver, LocaleType }, { UniverSheetsCorePreset }, localeModule] = await Promise.all([
          import("@univerjs/presets"),
          import("@univerjs/presets/preset-sheets-core"),
          import("@univerjs/preset-sheets-core/locales/en-US"),
        ]);
        // @ts-expect-error -- CSS side-effect import, no type declarations
        await import("@univerjs/preset-sheets-core/lib/index.css");

        if (disposed || !containerRef.current) return;

        const { univer, univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: { [LocaleType.EN_US]: localeModule.default },
          presets: [UniverSheetsCorePreset({ container: containerRef.current })],
        });
        univerRef.current = { univer, univerAPI };

        univerAPI.createWorkbook(excelContentToWorkbookData(content, id));

        const commitSave = () => {
          try {
            const fWorkbook = univerRef.current?.univerAPI.getActiveWorkbook();
            if (!fWorkbook) return;
            const json = workbookDataToExcelContent(fWorkbook.save());
            onContentChangeRef.current(json);
          } catch (err) {
            console.error("Failed to save Univer sheet snapshot:", err);
          }
        };

        univerAPI.addEvent(univerAPI.Event.CommandExecuted, () => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(commitSave, 1500);
        });

        if (!disposed) setReady(true);
      } catch (err) {
        console.error("Failed to mount Univer Sheets, falling back to static renderer:", err);
        if (!disposed) setLoadFailed(true);
      }
    })();

    return () => {
      disposed = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      try {
        univerRef.current?.univer.dispose();
      } catch {
        // Already torn down.
      }
      univerRef.current = null;
    };
    // Re-mount only when the artifact identity changes, not on every content
    // edit — those are our own writes echoing back through props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const readCurrentExcelJson = useCallback((): string => {
    try {
      const fWorkbook = univerRef.current?.univerAPI.getActiveWorkbook();
      if (!fWorkbook) return content;
      return workbookDataToExcelContent(fWorkbook.save());
    } catch {
      return content;
    }
  }, [content]);

  // The Code view always reflects the latest `content` prop (pretty-printed)
  // rather than a separately-tracked snapshot, so it can never go stale —
  // e.g. when an older version is restored while Code mode is still open.
  // It may lag the live, not-yet-debounce-saved edit by up to the 1.5s
  // commitSave delay; Copy/Export read the live Univer state directly
  // instead (via readCurrentExcelJson) since those need the exact current
  // edit, not the last-saved one.
  const codeView = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(content || "{}"), null, 2);
    } catch {
      return content;
    }
  }, [content]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(readCurrentExcelJson());
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [readCurrentExcelJson]);

  const handleDownloadXlsx = useCallback(() => {
    try {
      const data = JSON.parse(readCurrentExcelJson());
      const wb = XLSX.utils.book_new();
      (data.sheets || []).forEach((sheet: { name: string; headers: string[]; rows: unknown[][] }) => {
        const aoa = [sheet.headers, ...sheet.rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
      XLSX.writeFile(wb, `${id}.xlsx`);
    } catch (err) {
      console.error("Failed to export .xlsx:", err);
    }
  }, [id, readCurrentExcelJson]);

  if (loadFailed) {
    return <ExcelArtifact content={content} title={title} id={id} onContentChange={onContentChange} />;
  }

  return (
    <div className="flex flex-col h-full bg-surface-sunken rounded-xl shadow-md border border-border overflow-hidden">
      <ArtifactToolbar
        mode={mode}
        onModeChange={setMode}
        previewLabel="Interactive Grid"
        codeLabel="JSON Ledger"
        exportOptions={[
          { label: "Copy JSON", onClick: handleCopy, icon: <Copy size={14} /> },
          { label: "Download .xlsx", onClick: handleDownloadXlsx, icon: <Download size={14} /> },
        ]}
      />
      <div className="flex-1 relative bg-white">
        <div ref={containerRef} className={`absolute inset-0 ${mode === "preview" ? "block" : "hidden"}`} />
        {mode === "code" && (
          <pre className="absolute inset-0 overflow-auto p-4 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed">
            {codeView}
          </pre>
        )}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-sunken">
            <Loader2 className="animate-spin text-primary" size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
