"use client";

import React, { useState, useEffect } from "react";
import { FileText, Download, Edit2, Code, Check, Copy } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

interface WordArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange: (newContent: string) => void;
}

interface Section {
  heading: string;
  paragraphs: string[];
}

interface ParsedDoc {
  title: string;
  subtitle?: string;
  sections: Section[];
}

export default function WordArtifact({
  content,
  title,
  id,
  onContentChange,
}: WordArtifactProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Track props for render-phase sync
  const [prevContent, setPrevContent] = useState(content);
  const [prevTitle, setPrevTitle] = useState(title);

  // Initialize state with lazy initializers to avoid duplicate run of parser
  const [parsedDoc, setParsedDoc] = useState<ParsedDoc | null>(() => {
    try {
      const cleanContent = content.trim();
      const parsed = JSON.parse(cleanContent) as ParsedDoc;
      if (parsed && Array.isArray(parsed.sections)) {
        return parsed;
      }
      throw new Error("Invalid document format");
    } catch (e) {
      return {
        title: title,
        subtitle: "Document created dynamically",
        sections: [
          {
            heading: "Document Content",
            paragraphs: content.split("\n\n").filter(Boolean),
          },
        ],
      };
    }
  });

  const [jsonString, setJsonString] = useState(() => content);

  // Sync props in render phase directly
  if (content !== prevContent || title !== prevTitle) {
    try {
      const cleanContent = content.trim();
      const parsed = JSON.parse(cleanContent) as ParsedDoc;
      if (parsed && Array.isArray(parsed.sections)) {
        setParsedDoc(parsed);
        setParseError(null);
      } else {
        throw new Error("Invalid document format: 'sections' array is required.");
      }
    } catch (e: any) {
      const fallback: ParsedDoc = {
        title: title,
        subtitle: "Document created dynamically",
        sections: [
          {
            heading: "Document Content",
            paragraphs: content.split("\n\n").filter(Boolean),
          },
        ],
      };
      setParsedDoc(fallback);
      setParseError("Showing raw text fallback due to JSON parsing issue: " + e.message);
    }
    setJsonString(content);
    setPrevContent(content);
    setPrevTitle(title);
  }

  const updateDocumentState = (newDoc: ParsedDoc) => {
    setParsedDoc(newDoc);
    const newJson = JSON.stringify(newDoc, null, 2);
    setJsonString(newJson);
    onContentChange(newJson);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!parsedDoc) return;
    updateDocumentState({ ...parsedDoc, title: newTitle });
  };

  const handleSubtitleChange = (newSubtitle: string) => {
    if (!parsedDoc) return;
    updateDocumentState({ ...parsedDoc, subtitle: newSubtitle });
  };

  const handleHeadingChange = (sectionIndex: number, newHeading: string) => {
    if (!parsedDoc) return;
    const updatedSections = [...parsedDoc.sections];
    updatedSections[sectionIndex].heading = newHeading;
    updateDocumentState({ ...parsedDoc, sections: updatedSections });
  };

  const handleParagraphChange = (sectionIndex: number, paraIndex: number, newText: string) => {
    if (!parsedDoc) return;
    const updatedSections = [...parsedDoc.sections];
    updatedSections[sectionIndex].paragraphs[paraIndex] = newText;
    updateDocumentState({ ...parsedDoc, sections: updatedSections });
  };

  const addParagraph = (sectionIndex: number) => {
    if (!parsedDoc) return;
    const updatedSections = [...parsedDoc.sections];
    updatedSections[sectionIndex].paragraphs.push("New paragraph text. Click to edit...");
    updateDocumentState({ ...parsedDoc, sections: updatedSections });
  };

  const addSection = () => {
    if (!parsedDoc) return;
    const updatedSections = [...parsedDoc.sections, { heading: "New Section Heading", paragraphs: ["Enter details here..."] }];
    updateDocumentState({ ...parsedDoc, sections: updatedSections });
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonString(val);
    onContentChange(val);
    try {
      const parsed = JSON.parse(val);
      if (parsed && Array.isArray(parsed.sections)) {
        setParsedDoc(parsed);
        setParseError(null);
      }
    } catch (err: any) {
      setParseError("JSON Syntax Error: " + err.message);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadDocx = async () => {
    if (!parsedDoc) return;

    // Compile Word file structure using high-fidelity elements from docx library
    const docChildren: any[] = [];

    // Title
    docChildren.push(
      new Paragraph({
        text: parsedDoc.title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 120 },
      })
    );

    // Subtitle
    if (parsedDoc.subtitle) {
      docChildren.push(
        new Paragraph({
          text: parsedDoc.subtitle,
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 360 },
        })
      );
    }

    // Dividers or line spaces
    docChildren.push(new Paragraph({ text: "" }));

    // Sections
    parsedDoc.sections.forEach((section) => {
      docChildren.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );

      section.paragraphs.forEach((pText) => {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: pText, size: 24 })], // 12pt font
            spacing: { after: 120, line: 360 }, // 1.5 line spacing
          })
        );
      });
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    try {
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate docx", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f9f9f8] rounded-xl shadow-md border border-[#ececec] overflow-hidden" id="word-artifact-wrapper">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#ececec]" id="word-artifact-header">
        <div className="flex items-center space-x-2">
          <FileText size={18} className="text-blue-500" />
          <span className="font-sans font-semibold text-[#1a1a1a] text-sm tracking-tight truncate max-w-xs">
            {parsedDoc?.title || title}
          </span>
          <span className="text-xs bg-blue-50 border border-blue-200/50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
            Word Document
          </span>
        </div>

        <div className="flex items-center space-x-1" id="word-controls">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-[#f3f4f6] text-[#1a1a1a]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText size={14} className="text-blue-500" />
            <span>Document Preview</span>
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "code"
                ? "bg-[#f3f4f6] text-[#1a1a1a]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Code size={14} className="text-slate-500" />
            <span>JSON Data</span>
          </button>

          <div className="w-px h-5 bg-[#ececec] mx-1" />

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#f3f4f6] transition-colors cursor-pointer"
            title="Copy JSON"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>

          <button
            onClick={handleDownloadDocx}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
            title="Download Word Document"
          >
            <Download size={14} />
            <span>Download .docx</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#f1f1f1] relative min-h-[400px] overflow-auto p-6 flex justify-center">
        {activeTab === "preview" && parsedDoc ? (
          <div className="w-full max-w-2xl bg-white shadow-xl border border-[#ececec] rounded-xl p-12 min-h-[800px] flex flex-col text-slate-800 relative select-text" id="docx-sheet">
            {/* Top Margins Guidance (Visual Only) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-mono tracking-widest text-slate-400 pointer-events-none">
              A4 Page Preview • Double Click to Edit Any Text Block
            </div>

            {/* Document Title */}
            <input
              type="text"
              value={parsedDoc.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="font-display text-3xl font-bold text-slate-900 tracking-tight mb-2 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full py-1"
              title="Edit Document Title"
            />

            {/* Subtitle */}
            <input
              type="text"
              value={parsedDoc.subtitle || ""}
              onChange={(e) => handleSubtitleChange(e.target.value)}
              placeholder="Add subtitle..."
              className="text-base text-slate-500 italic mb-8 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full py-1"
              title="Edit Document Subtitle"
            />

            <div className="w-full h-px bg-slate-200 mb-8" />

            {/* Sections */}
            <div className="space-y-8 flex-1">
              {parsedDoc.sections.map((section, sIdx) => (
                <div key={sIdx} className="group/section space-y-4">
                  <input
                    type="text"
                    value={section.heading}
                    onChange={(e) => handleHeadingChange(sIdx, e.target.value)}
                    className="font-display text-xl font-semibold text-slate-900 tracking-tight border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full py-0.5"
                    title="Edit Section Heading"
                  />

                  <div className="space-y-3">
                    {section.paragraphs.map((para, pIdx) => (
                      <textarea
                        key={pIdx}
                        value={para}
                        onChange={(e) => handleParagraphChange(sIdx, pIdx, e.target.value)}
                        className="text-sm leading-relaxed text-slate-600 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-slate-50 focus:outline-none w-full p-1.5 rounded transition-all resize-none h-auto min-h-[40px]"
                        rows={Math.max(2, Math.ceil(para.length / 85))}
                        title="Edit Paragraph Content"
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => addParagraph(sIdx)}
                    className="text-xs text-blue-500 font-medium hover:text-blue-700 opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center space-x-1"
                  >
                    <span>+ Add Paragraph to Section</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Actions at bottom */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <button
                onClick={addSection}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <span>+ Add Section</span>
              </button>
              <span>Total Sections: {parsedDoc.sections.length}</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col font-mono text-xs bg-slate-900 text-slate-300">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-500 text-[10px]">
              <span>RAW JSON EDITOR (STRUCTURAL LAYOUT)</span>
              {parseError ? (
                <span className="text-rose-400 font-semibold">{parseError}</span>
              ) : (
                <span className="text-emerald-400 font-semibold">Valid JSON Structure</span>
              )}
            </div>
            <textarea
              value={jsonString}
              onChange={handleJsonChange}
              className="flex-1 p-4 bg-slate-950 text-blue-400 font-mono text-sm leading-relaxed focus:outline-none resize-none overflow-auto"
              spellCheck={false}
              id="word-json-textarea"
            />
          </div>
        )}
      </div>
    </div>
  );
}
