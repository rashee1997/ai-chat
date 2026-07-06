"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
  UnstyledOpenInCodeSandboxButton,
} from "@codesandbox/sandpack-react";
import { zipSync, strToU8 } from "fflate";
import {
  Smartphone,
  Tablet,
  Monitor,
  Plus,
  Save,
  Download,
  ExternalLink,
  FolderTree,
  File as FileIcon,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { appSandpackTheme } from "@/lib/sandpackTheme";
import {
  parseReactArtifactContent,
  type ReactArtifactContent,
} from "@/lib/reactArtifact";

interface ReactArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange: (newContent: string) => void;
}

type DevicePreset = "mobile" | "tablet" | "desktop";

const DEVICE_PRESETS: Array<{ id: DevicePreset; label: string; width: string; icon: React.ReactNode }> = [
  { id: "mobile", label: "Mobile", width: "375px", icon: <Smartphone size={12} /> },
  { id: "tablet", label: "Tablet", width: "768px", icon: <Tablet size={12} /> },
  { id: "desktop", label: "Fill", width: "100%", icon: <Monitor size={12} /> },
];

function newFileBoilerplate(path: string): string {
  if (/\.css$/.test(path)) return "/* new stylesheet */\n";
  const componentName = (path.split("/").pop() || "Component")
    .replace(/\.(jsx?|tsx?)$/, "")
    .replace(/[^a-zA-Z0-9]/g, "") || "Component";
  return `import React from 'react';\n\nexport default function ${componentName}() {\n  return (\n    <div>${componentName}</div>\n  );\n}\n`;
}

export default function ReactArtifact({ content, title, id, onContentChange }: ReactArtifactProps) {
  const [parsed, setParsed] = useState<ReactArtifactContent | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [prevContent, setPrevContent] = useState<string | null>(null);
  const [pendingSelfSave, setPendingSelfSave] = useState<string | null>(null);

  // Deliberately NOT a useEffect: this is React's own documented pattern for
  // "adjusting state when a prop changes" (see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) —
  // comparing to a "previous prop" state during render and conditionally
  // updating. An effect would introduce an extra commit-then-rerender pass
  // (briefly rendering with stale `parsed`) and this project's lint config
  // (react-hooks/set-state-in-effect) rejects synchronous setState-in-effect
  // outright, so this intentionally stays in the render body.
  //
  // Only accept a new files/dependency snapshot — and remount the Sandpack
  // instance — when the incoming content actually changed and parses
  // cleanly. Partial JSON mid-stream fails to parse and is ignored until
  // the model finishes; a round-trip of our own "Save as new version" is
  // recognized via pendingSelfSave so it doesn't force a jarring remount of
  // the editor the user is actively looking at.
  if (content !== prevContent) {
    const isSelfSave = pendingSelfSave === content;
    const result = parseReactArtifactContent(content);
    if (result.ok) {
      setParsed(result.content);
      setParseError(null);
      if (!isSelfSave) setLoadKey((k) => k + 1);
    } else {
      setParseError(result.error);
    }
    if (isSelfSave) setPendingSelfSave(null);
    setPrevContent(content);
  }

  const handleSave = useCallback(
    (files: Record<string, string>, dependencies: Record<string, string>, entry?: string) => {
      const serialized = JSON.stringify({ files, dependencies, entry });
      setPendingSelfSave(serialized);
      onContentChange(serialized);
    },
    [onContentChange]
  );

  if (!parsed) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-surface-sunken rounded-xl border border-border gap-3 text-on-surface-muted">
        <Loader2 size={20} className="animate-spin text-primary" />
        <span className="text-xs font-medium">Generating multi-file React project…</span>
        {parseError && (
          <span className="text-[10px] text-on-surface-muted/70 max-w-xs text-center px-4">
            {parseError}
          </span>
        )}
      </div>
    );
  }

  // parseReactArtifactContent() already sanitized dependencies against the
  // allow-list — parsed.dependencies is the final, safe-to-use shape.
  const dependencies = parsed.dependencies ?? {};
  const fileKeys = Object.keys(parsed.files);
  const entry = parsed.entry && parsed.files[parsed.entry] ? parsed.entry : fileKeys[0];

  return (
    <SandpackProvider
      key={loadKey}
      template="react"
      theme={appSandpackTheme}
      files={parsed.files}
      customSetup={{ entry, dependencies }}
      options={{
        visibleFiles: fileKeys,
        activeFile: entry,
        autorun: true,
        recompileMode: "delayed",
        recompileDelay: 300,
      }}
      className="h-full !block"
    >
      <Workspace
        title={title}
        artifactId={id}
        entry={entry}
        dependencies={dependencies}
        initialFiles={fileKeys}
        onSave={handleSave}
      />
    </SandpackProvider>
  );
}

interface WorkspaceProps {
  title: string;
  artifactId: string;
  entry: string;
  dependencies: Record<string, string>;
  initialFiles: string[];
  onSave: (files: Record<string, string>, dependencies: Record<string, string>, entry?: string) => void;
}

function Workspace({ title, artifactId, entry, dependencies, initialFiles, onSave }: WorkspaceProps) {
  const { sandpack } = useSandpack();
  const { activeFile, files, editorState, setActiveFile, addFile, deleteFile } = sandpack;

  // `sandpack.visibleFiles` is fixed from the initial `options.visibleFiles`
  // prop and does NOT grow when `addFile` is called at runtime, and the
  // "react" template's own scaffold files (/index.js, /package.json,
  // /public/index.html) live alongside ours in `sandpack.files` without a
  // reliable `hidden` flag to filter them out — so the artifact's own file
  // list is tracked explicitly here, seeded from the artifact's stored
  // content and only ever grown/shrunk by this workspace's own add/delete
  // actions (never derived from Sandpack's internal file map).
  const [userFiles, setUserFiles] = useState<string[]>(initialFiles);

  const [device, setDevice] = useState<DevicePreset>("mobile");
  const [viewTab, setViewTab] = useState<"preview" | "code">("preview");
  const [showFileTree, setShowFileTree] = useState(true);
  const [addingFile, setAddingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const isDirty = editorState === "dirty";
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitSave = useCallback(() => {
    const snapshot: Record<string, string> = {};
    userFiles.forEach((path) => {
      const f = files[path];
      if (f) snapshot[path] = f.code;
    });
    onSave(snapshot, dependencies, entry);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, [userFiles, files, dependencies, entry, onSave]);

  // Debounced auto-save: 1.5s after the last edit, commit a new version
  // rather than persisting one on every keystroke.
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => commitSave(), 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- files identity change is the intentional debounce trigger
  }, [files, isDirty]);

  useEffect(() => {
    if (addingFile) newFileInputRef.current?.focus();
  }, [addingFile]);

  const handleDownloadZip = useCallback(() => {
    const zipInput: Record<string, Uint8Array> = {};
    userFiles.forEach((path) => {
      const f = files[path];
      if (f) zipInput[path.replace(/^\//, "")] = strToU8(f.code);
    });
    const zipped = zipSync(zipInput);
    const blob = new Blob([zipped as BlobPart], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifactId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [userFiles, files, artifactId]);

  const commitNewFile = useCallback(() => {
    let path = newFilePath.trim();
    if (!path) {
      setAddingFile(false);
      return;
    }
    if (!path.startsWith("/")) path = `/${path}`;
    if (!files[path]) {
      addFile(path, newFileBoilerplate(path));
      setUserFiles((prev) => (prev.includes(path) ? prev : [...prev, path]));
      setActiveFile(path);
      setViewTab("code");
    }
    setNewFilePath("");
    setAddingFile(false);
  }, [newFilePath, files, addFile, setActiveFile]);

  const handleDeleteFile = useCallback(
    (path: string) => {
      deleteFile(path);
      setUserFiles((prev) => prev.filter((p) => p !== path));
    },
    [deleteFile]
  );

  const canDeleteFiles = userFiles.length > 1;
  const sortedUserFiles = useMemo(() => [...userFiles].sort(), [userFiles]);

  const devicePreset = DEVICE_PRESETS.find((d) => d.id === device)!;

  return (
    <div className="flex flex-col h-full bg-surface-sunken rounded-xl shadow-md border border-border overflow-hidden @container/react-workspace">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-raised border-b border-border flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => setShowFileTree((v) => !v)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showFileTree
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border text-on-surface-muted hover:bg-surface-sunken"
            }`}
            title={showFileTree ? "Hide file tree" : "Show file tree"}
          >
            <FolderTree size={13} />
          </button>
          <span className="text-xs font-semibold text-on-surface truncate max-w-[10rem]">{title}</span>
          <span className="text-[10px] bg-sky-50 border border-sky-200/50 text-sky-600 font-medium px-2 py-0.5 rounded-full flex-shrink-0">
            React
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Device preview toggle */}
          <div className="bg-surface-sunken p-0.5 rounded-lg flex items-center border border-border/50">
            {DEVICE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setDevice(preset.id);
                  setViewTab("preview");
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  device === preset.id
                    ? "bg-surface-raised text-on-surface shadow-sm"
                    : "text-on-surface-muted hover:text-on-surface"
                }`}
                title={`Preview at ${preset.label}`}
              >
                {preset.icon}
                <span className="hidden @lg/react-workspace:inline">{preset.label}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border" />

          {/* Mobile/narrow-only Code/Preview tabs */}
          <div className="flex @lg/react-workspace:hidden bg-surface-sunken p-0.5 rounded-lg border border-border/50">
            <button
              onClick={() => setViewTab("preview")}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                viewTab === "preview" ? "bg-surface-raised text-on-surface shadow-sm" : "text-on-surface-muted"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewTab("code")}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                viewTab === "code" ? "bg-surface-raised text-on-surface shadow-sm" : "text-on-surface-muted"
              }`}
            >
              Code
            </button>
          </div>

          <button
            onClick={commitSave}
            disabled={!isDirty}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer disabled:cursor-default ${
              justSaved
                ? "bg-success-surface text-success border-success/30"
                : isDirty
                ? "bg-primary text-on-primary border-primary hover:bg-primary-hover"
                : "bg-surface-raised text-on-surface-muted border-border"
            }`}
            title="Save current edits as a new artifact version"
          >
            {justSaved ? <Check size={12} /> : <Save size={12} />}
            <span className="hidden @lg/react-workspace:inline">
              {justSaved ? "Saved" : isDirty ? "Save as new version" : "Saved"}
            </span>
          </button>

          <button
            onClick={handleDownloadZip}
            className="p-1.5 rounded-lg text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken border border-transparent hover:border-border transition-all cursor-pointer"
            title="Download project as .zip"
          >
            <Download size={13} />
          </button>

          <UnstyledOpenInCodeSandboxButton
            className="p-1.5 rounded-lg text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken border border-transparent hover:border-border transition-all cursor-pointer"
            title="Open in CodeSandbox"
          >
            <ExternalLink size={13} />
          </UnstyledOpenInCodeSandboxButton>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* File tree */}
        {showFileTree && (
          <div className="w-40 flex-shrink-0 border-r border-border bg-surface-raised flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto py-1.5">
              {sortedUserFiles.map((path) => (
                <div
                  key={path}
                  onClick={() => {
                    setActiveFile(path);
                    setViewTab("code");
                  }}
                  className={`group flex items-center justify-between gap-1 px-2.5 py-1.5 text-[11px] font-mono cursor-pointer truncate ${
                    activeFile === path
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-on-surface-muted hover:bg-surface-sunken hover:text-on-surface"
                  }`}
                  title={path}
                >
                  <span className="flex items-center gap-1 min-w-0 truncate">
                    <FileIcon size={10} className="flex-shrink-0" />
                    <span className="truncate">{path}</span>
                  </span>
                  {canDeleteFiles && path !== entry && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(path);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-muted hover:text-danger flex-shrink-0"
                      title={`Delete ${path}`}
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-border p-1.5">
              {addingFile ? (
                <input
                  ref={newFileInputRef}
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitNewFile();
                    if (e.key === "Escape") {
                      setNewFilePath("");
                      setAddingFile(false);
                    }
                  }}
                  onBlur={commitNewFile}
                  placeholder="/components/New.jsx"
                  className="w-full text-[11px] font-mono px-2 py-1 rounded-md border border-primary/40 bg-surface text-on-surface focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => setAddingFile(true)}
                  className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold px-2 py-1.5 rounded-md text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken transition-colors cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Add file</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className={`flex-1 min-w-0 overflow-hidden ${viewTab === "code" ? "block" : "hidden"} @lg/react-workspace:block`}>
          <SandpackCodeEditor
            showTabs={false}
            showLineNumbers
            showInlineErrors
            wrapContent
            style={{ height: "100%" }}
          />
        </div>

        {/* Preview */}
        <div
          className={`flex-1 min-w-0 overflow-auto bg-surface-sunken flex items-start justify-center p-3 ${
            viewTab === "preview" ? "flex" : "hidden"
          } @lg/react-workspace:flex`}
        >
          <div
            className="h-full border border-border rounded-lg overflow-auto bg-white shadow-sm"
            style={{
              width: devicePreset.width,
              maxWidth: "100%",
              resize: device === "desktop" ? "none" : "horizontal",
              minWidth: "280px",
            }}
          >
            <SandpackPreview
              showNavigator={false}
              showRefreshButton
              showRestartButton={false}
              showOpenInCodeSandbox={false}
              showSandpackErrorOverlay
              style={{ height: "100%", minHeight: "480px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
