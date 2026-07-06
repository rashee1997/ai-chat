"use client";

import React from "react";
import {
  FileText,
  Presentation,
  Table,
  Play,
  ArrowRight,
  Loader2,
  Image as ImageIcon,
  GitBranch,
} from "lucide-react";
import { Message, Artifact } from "@/lib/types";
import { parseMessageContent, parseBackgroundJobStatus } from "@/lib/parser";
import StreamingMarkdown from "@/components/StreamingMarkdown";
import BackgroundJobStatus from "@/components/BackgroundJobStatus";

function getArtifactIcon(type: string) {
  switch (type) {
    case "html":
      return <Play size={18} className="text-emerald-500" />;
    case "word":
      return <FileText size={18} className="text-blue-500" />;
    case "ppt":
      return <Presentation size={18} className="text-orange-500" />;
    case "excel":
      return <Table size={18} className="text-emerald-600" />;
    case "svg":
      return <ImageIcon size={18} className="text-purple-500" />;
    case "mermaid":
      return <GitBranch size={18} className="text-indigo-500" />;
    default:
      return <FileText size={18} className="text-on-surface-muted" />;
  }
}

function getArtifactTypeName(type: string) {
  switch (type) {
    case "html":
      return "Interactive Web App";
    case "word":
      return "Microsoft Word Document";
    case "ppt":
      return "PowerPoint Presentation";
    case "excel":
      return "Excel Spreadsheet Ledger";
    case "svg":
      return "SVG Vector Graphic";
    case "mermaid":
      return "Mermaid Graphic Diagram";
    default:
      return "Artifact Document";
  }
}

interface MessageRowProps {
  message: Message;
  isStreaming: boolean;
  onSelectArtifact: (artifact: Artifact) => void;
  activeArtifactId?: string;
}

function MessageRow({ message, isStreaming, onSelectArtifact, activeArtifactId }: MessageRowProps) {
  const isUser = message.role === "user";
  const { conversationalText, artifact } = parseMessageContent(message.content);
  const jobStatus = !isUser && conversationalText ? parseBackgroundJobStatus(conversationalText) : null;

  return (
    <div className={`flex space-x-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-on-primary flex items-center justify-center font-bold text-xs select-none shadow-sm">
          AI
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`max-w-[85%] space-y-2 ${isUser ? "text-right" : "text-left"}`}>
        {/* Username indicator */}
        <div className="text-[10px] text-on-surface-muted font-semibold uppercase tracking-wider select-none">
          {isUser ? "You" : "Claude Assistant"}
        </div>

        {/* Conversational bubble — a detected background-job status swaps in
            its own calm card instead of the generic markdown bubble. */}
        {jobStatus ? (
          <BackgroundJobStatus status={jobStatus} />
        ) : (
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-on-surface text-surface font-medium shadow-sm text-left inline-block"
              : "bg-surface-raised text-on-surface border border-border shadow-sm text-left block"
          }`}
        >
          {/* Render conversational paragraphs: plain text for the user
              (typed, not streamed, so no incomplete-markdown risk),
              streaming-safe markdown for the assistant. */}
          {conversationalText ? (
            isUser ? (
              <div className="whitespace-pre-wrap">{conversationalText}</div>
            ) : (
              <StreamingMarkdown content={conversationalText} isStreaming={isStreaming} />
            )
          ) : (
            !isUser &&
            artifact && (
              <div className="text-on-surface-muted italic text-xs flex items-center space-x-1.5">
                <Loader2 size={12} className="animate-spin text-primary" />
                <span>Generating artifact workspace...</span>
              </div>
            )
          )}
        </div>
        )}

        {/* Inline Artifact Badge (If found) */}
        {artifact && (
          <div
            onClick={() => onSelectArtifact(artifact)}
            className={`p-3 bg-surface-raised border rounded-xl flex items-center justify-between cursor-pointer shadow-sm transition-all duration-200 text-left ${
              activeArtifactId === artifact.id
                ? "border-primary ring-1 ring-primary/20"
                : "border-border hover:border-on-surface-muted/40"
            }`}
            id={`chat-artifact-badge-${artifact.id}`}
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div
                className={`p-2 rounded-lg flex-shrink-0 ${
                  artifact.type === "html"
                    ? "bg-emerald-50 text-emerald-600"
                    : artifact.type === "word"
                    ? "bg-blue-50 text-blue-600"
                    : artifact.type === "ppt"
                    ? "bg-orange-50 text-orange-600"
                    : artifact.type === "svg"
                    ? "bg-purple-50 text-purple-600"
                    : artifact.type === "mermaid"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-green-50 text-green-600"
                }`}
              >
                {getArtifactIcon(artifact.type)}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-on-surface truncate tracking-tight">{artifact.title}</div>
                <div className="text-[10px] text-on-surface-muted font-medium">
                  {getArtifactTypeName(artifact.type)} • {artifact.isComplete ? "Click to open view" : "In progress..."}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 bg-surface hover:bg-surface-sunken rounded-lg border border-border text-on-surface transition-colors flex-shrink-0">
              {artifact.isComplete ? (
                <>
                  <span>View</span>
                  <ArrowRight size={10} className="text-on-surface-muted" />
                </>
              ) : (
                <div className="flex items-center space-x-1 text-primary">
                  <Loader2 size={10} className="animate-spin" />
                  <span className="text-[10px]">Streaming</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-border text-on-surface-muted flex items-center justify-center font-bold text-xs select-none shadow-sm">
          U
        </div>
      )}
    </div>
  );
}

export default React.memo(MessageRow);
