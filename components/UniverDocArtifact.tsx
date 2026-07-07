"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, Copy, Loader2 } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import ArtifactToolbar from "./ArtifactToolbar";
import WordArtifact from "./WordArtifact";
import { wordContentToDocumentData, documentDataToWordContent } from "@/lib/univerConvert";

interface UniverDocArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange: (newContent: string) => void;
}

interface WordSection {
  heading?: string;
  paragraphs?: string[];
}
interface WordDoc {
  title?: string;
  subtitle?: string;
  sections?: WordSection[];
}

/**
 * Renders Word artifacts with a real, interactive Univer Docs instance
 * (rich text, lists, formatting) instead of a static paragraph list. Falls
 * back to the previous static WordArtifact renderer if Univer fails to
 * load or mount for any reason, so this can never regress below the old
 * behavior.
 */
export default function UniverDocArtifact({ content, title, id, onContentChange }: UniverDocArtifactProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<{ univer: any; univerAPI: any } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const contentRef = useRef(content);

  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [codeView, setCodeView] = useState(content);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
    contentRef.current = content;
  }, [onContentChange, content]);

  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        const [{ createUniver, LocaleType }, { UniverDocsCorePreset }, localeModule] = await Promise.all([
          import("@univerjs/presets"),
          import("@univerjs/presets/preset-docs-core"),
          import("@univerjs/preset-docs-core/locales/en-US"),
        ]);
        // @ts-expect-error -- CSS side-effect import, no type declarations
        await import("@univerjs/preset-docs-core/lib/index.css");

        if (disposed || !containerRef.current) return;

        const { univer, univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: { [LocaleType.EN_US]: localeModule.default },
          presets: [UniverDocsCorePreset({ container: containerRef.current })],
        });
        univerRef.current = { univer, univerAPI };

        univerAPI.createUniverDoc(wordContentToDocumentData(content, id));

        const commitSave = () => {
          try {
            const fDoc = univerRef.current?.univerAPI.getActiveDocument();
            if (!fDoc) return;
            const json = documentDataToWordContent(fDoc.getSnapshot(), contentRef.current);
            onContentChangeRef.current(json);
          } catch (err) {
            console.error("Failed to save Univer doc snapshot:", err);
          }
        };

        univerAPI.addEvent(univerAPI.Event.CommandExecuted, () => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(commitSave, 1500);
        });

        if (!disposed) setReady(true);
      } catch (err) {
        console.error("Failed to mount Univer Docs, falling back to static renderer:", err);
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

  const readCurrentWordJson = useCallback((): string => {
    try {
      const fDoc = univerRef.current?.univerAPI.getActiveDocument();
      if (!fDoc) return content;
      return documentDataToWordContent(fDoc.getSnapshot(), content);
    } catch {
      return content;
    }
  }, [content]);

  // Refresh the read-only JSON view when switching into Code mode. Done in
  // this click handler (not derived during render) because reading the ref
  // to the live Univer instance is only safe outside of render.
  const handleModeChange = (newMode: "preview" | "code") => {
    if (newMode === "code") setCodeView(readCurrentWordJson());
    setMode(newMode);
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(readCurrentWordJson());
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [readCurrentWordJson]);

  const handleDownloadDocx = useCallback(async () => {
    try {
      const doc: WordDoc = JSON.parse(readCurrentWordJson());
      const docChildren: Paragraph[] = [];

      docChildren.push(
        new Paragraph({ text: doc.title || title, heading: HeadingLevel.TITLE, spacing: { after: 120 } })
      );
      if (doc.subtitle) {
        docChildren.push(
          new Paragraph({ text: doc.subtitle, heading: HeadingLevel.HEADING_3, spacing: { after: 360 } })
        );
      }
      docChildren.push(new Paragraph({ text: "" }));

      (doc.sections || []).forEach((section) => {
        if (section.heading) {
          docChildren.push(
            new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } })
          );
        }
        (section.paragraphs || []).forEach((pText) => {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: pText, size: 24 })],
              spacing: { after: 120, line: 360 },
            })
          );
        });
      });

      const docxDocument = new Document({ sections: [{ properties: {}, children: docChildren }] });
      const blob = await Packer.toBlob(docxDocument);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export .docx:", err);
    }
  }, [id, title, readCurrentWordJson]);

  if (loadFailed) {
    return <WordArtifact content={content} title={title} id={id} onContentChange={onContentChange} />;
  }

  return (
    <div className="flex flex-col h-full bg-surface-sunken rounded-xl shadow-md border border-border overflow-hidden">
      <ArtifactToolbar
        mode={mode}
        onModeChange={handleModeChange}
        previewLabel="Document"
        codeLabel="JSON Content"
        exportOptions={[
          { label: "Copy JSON", onClick: handleCopy, icon: <Copy size={14} /> },
          { label: "Download .docx", onClick: handleDownloadDocx, icon: <Download size={14} /> },
        ]}
      />
      <div className="flex-1 relative bg-white">
        <div ref={containerRef} className={`absolute inset-0 ${mode === "preview" ? "block" : "hidden"}`} />
        {mode === "code" && (
          <pre className="absolute inset-0 overflow-auto p-4 bg-slate-950 text-blue-300 font-mono text-xs leading-relaxed">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(codeView || "{}"), null, 2);
              } catch {
                return codeView;
              }
            })()}
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
