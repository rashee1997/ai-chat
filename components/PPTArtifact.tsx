"use client";

import React, { useState } from "react";
import { Download, ChevronLeft, ChevronRight, Copy, Plus, Trash } from "lucide-react";
import PptxGenJS from "pptxgenjs";
import ArtifactToolbar from "./ArtifactToolbar";

interface PPTTheme {
  bg: string;
  text: string;
  accent: string;
}

interface PPTSlide {
  title: string;
  bullets: string[];
}

interface PPTContent {
  theme?: PPTTheme;
  slides: PPTSlide[];
}

interface PPTArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange: (newContent: string) => void;
}

export default function PPTArtifact({
  content,
  title,
  id,
  onContentChange,
}: PPTArtifactProps) {
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  // Track props for render-phase sync
  const [prevContent, setPrevContent] = useState(content);
  const [prevTitle, setPrevTitle] = useState(title);

  // Initialize state with lazy initializers to avoid duplicate run of parser
  const [pptData, setPptData] = useState<PPTContent | null>(() => {
    try {
      const parsed = JSON.parse(content.trim()) as PPTContent;
      if (parsed && Array.isArray(parsed.slides)) {
        if (!parsed.theme) {
          parsed.theme = { bg: "#0f172a", text: "#ffffff", accent: "#38bdf8" };
        }
        return parsed;
      }
      throw new Error("Invalid format");
    } catch (err) {
      return {
        theme: { bg: "#1e1b4b", text: "#ffffff", accent: "#f43f5e" },
        slides: [
          {
            title: title || "AI Presentation Slide Deck",
            bullets: [
              "Interactive slide generation enabled.",
              "Fully custom themes and text modules.",
              "Downloadable as real PPTX files.",
            ],
          },
        ],
      };
    }
  });

  const [jsonString, setJsonString] = useState(() => content);

  // Sync props in render phase directly
  if (content !== prevContent || title !== prevTitle) {
    try {
      const parsed = JSON.parse(content.trim()) as PPTContent;
      if (parsed && Array.isArray(parsed.slides)) {
        if (!parsed.theme) {
          parsed.theme = { bg: "#0f172a", text: "#ffffff", accent: "#38bdf8" };
        }
        setPptData(parsed);
        setParseError(null);
      } else {
        throw new Error("Invalid structure: 'slides' array is required.");
      }
    } catch (err: any) {
      const fallback: PPTContent = {
        theme: { bg: "#1e1b4b", text: "#ffffff", accent: "#f43f5e" },
        slides: [
          {
            title: title || "AI Presentation Slide Deck",
            bullets: [
              "Interactive slide generation enabled.",
              "Fully custom themes and text modules.",
              "Downloadable as real PPTX files.",
            ],
          },
        ],
      };
      setPptData(fallback);
      setParseError("Using fallback slide. JSON Error: " + err.message);
    }
    setJsonString(content);
    setPrevContent(content);
    setPrevTitle(title);
  }

  const updatePptState = (newData: PPTContent) => {
    setPptData(newData);
    const newJson = JSON.stringify(newData, null, 2);
    setJsonString(newJson);
    onContentChange(newJson);
  };

  const handleSlideTitleChange = (idx: number, newTitle: string) => {
    if (!pptData) return;
    const updatedSlides = [...pptData.slides];
    updatedSlides[idx].title = newTitle;
    updatePptState({ ...pptData, slides: updatedSlides });
  };

  const handleBulletChange = (sIdx: number, bIdx: number, newVal: string) => {
    if (!pptData) return;
    const updatedSlides = [...pptData.slides];
    updatedSlides[sIdx].bullets[bIdx] = newVal;
    updatePptState({ ...pptData, slides: updatedSlides });
  };

  const addBullet = (sIdx: number) => {
    if (!pptData) return;
    const updatedSlides = [...pptData.slides];
    updatedSlides[sIdx].bullets.push("New key point. Click to edit...");
    updatePptState({ ...pptData, slides: updatedSlides });
  };

  const removeBullet = (sIdx: number, bIdx: number) => {
    if (!pptData) return;
    const updatedSlides = [...pptData.slides];
    updatedSlides[sIdx].bullets.splice(bIdx, 1);
    updatePptState({ ...pptData, slides: updatedSlides });
  };

  const addSlide = () => {
    if (!pptData) return;
    const newSlide: PPTSlide = {
      title: "New Slide Title",
      bullets: ["Bullet point one", "Bullet point two"],
    };
    const updatedSlides = [...pptData.slides, newSlide];
    updatePptState({ ...pptData, slides: updatedSlides });
    setCurrentSlideIndex(updatedSlides.length - 1);
  };

  const removeSlide = (idx: number) => {
    if (!pptData || pptData.slides.length <= 1) return;
    const updatedSlides = pptData.slides.filter((_, sIdx) => sIdx !== idx);
    updatePptState({ ...pptData, slides: updatedSlides });
    setCurrentSlideIndex(Math.max(0, idx - 1));
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonString(val);
    onContentChange(val);
    try {
      const parsed = JSON.parse(val) as PPTContent;
      if (parsed && Array.isArray(parsed.slides)) {
        if (!parsed.theme) {
          parsed.theme = { bg: "#0f172a", text: "#ffffff", accent: "#38bdf8" };
        }
        setPptData(parsed);
        setParseError(null);
      }
    } catch (err: any) {
      setParseError("JSON Error: " + err.message);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPptx = () => {
    if (!pptData) return;

    // Use pptxgenjs to build slide deck
    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.title = title;
    pptx.layout = "LAYOUT_16x9";

    const theme = pptData.theme || { bg: "#0f172a", text: "#ffffff", accent: "#38bdf8" };

    pptData.slides.forEach((slide) => {
      const pptSlide = pptx.addSlide();
      
      // Background fill color
      pptSlide.background = { fill: theme.bg };

      // Header title box
      pptSlide.addText(slide.title, {
        x: 0.8,
        y: 0.6,
        w: "80%",
        h: 1.0,
        fontSize: 32,
        bold: true,
        color: theme.text,
        fontFace: "Calibri",
      });

      // Bullets text block with bullet lists formatting
      const bulletsText = slide.bullets.map((b) => ({
        text: b,
        options: { bullet: true, indentLevel: 0, fontSize: 18, color: theme.text, fontFace: "Calibri" },
      }));

      if (bulletsText.length > 0) {
        pptSlide.addText(bulletsText, {
          x: 0.8,
          y: 1.8,
          w: "80%",
          h: 4.5,
          valign: "top",
        });
      }
    });

    pptx.writeFile({ fileName: `${id}.pptx` })
      .then(() => console.log("PowerPoint generated successfully!"))
      .catch((err) => console.error("PowerPoint generation error", err));
  };

  const currentSlide = pptData?.slides[currentSlideIndex];
  const theme = pptData?.theme || { bg: "#0f172a", text: "#ffffff", accent: "#38bdf8" };

  return (
    <div className="flex flex-col h-full bg-surface-sunken rounded-xl shadow-md border border-border overflow-hidden" id="ppt-artifact-wrapper">
      <ArtifactToolbar
        mode={mode}
        onModeChange={setMode}
        previewLabel="Present Stage"
        codeLabel="JSON Slides"
        exportOptions={[
          { label: "Copy JSON", onClick: handleCopy, icon: <Copy size={14} /> },
          { label: "Download .pptx", onClick: handleDownloadPptx, icon: <Download size={14} /> },
        ]}
      />

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-100 flex min-h-[400px] relative">
        {mode === "preview" && pptData && currentSlide ? (
          <div className="flex-1 flex flex-col md:flex-row" id="presentation-stage">
            {/* Sidebar Slide Thumbnails */}
            <div className="w-full md:w-48 bg-slate-50 border-r border-slate-200 p-3 flex md:flex-col overflow-auto gap-2 select-none" id="thumbnails-rail">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 hidden md:block">
                Slides Rail
              </div>
              {pptData.slides.map((slide, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => setCurrentSlideIndex(sIdx)}
                  className={`relative p-3 rounded-lg border text-left cursor-pointer transition-all flex-shrink-0 w-36 md:w-full ${
                    sIdx === currentSlideIndex
                      ? "border-orange-500 bg-orange-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400 font-bold mb-1">
                    SLIDE {sIdx + 1}
                  </div>
                  <div className="text-xs font-medium text-slate-800 truncate">
                    {slide.title || "(Untitled Slide)"}
                  </div>
                  
                  {pptData.slides.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSlide(sIdx);
                      }}
                      className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-500 p-0.5 rounded transition-colors"
                      title="Delete Slide"
                    >
                      <Trash size={10} />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                onClick={addSlide}
                className="flex items-center justify-center space-x-1 p-2 border border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/20 rounded-lg text-xs text-slate-500 hover:text-orange-600 font-medium transition-all w-36 md:w-full flex-shrink-0 mt-auto"
              >
                <Plus size={12} />
                <span>Add Slide</span>
              </button>
            </div>

            {/* Slide Preview Stage */}
            <div className="flex-1 p-6 flex flex-col justify-between items-center" id="slide-viewer">
              {/* Slide Screen Frame */}
              <div
                style={{ backgroundColor: theme.bg, color: theme.text }}
                className="w-full aspect-video rounded-xl shadow-lg flex flex-col justify-between p-12 relative overflow-hidden transition-all max-w-2xl border border-slate-200"
                id="slide-card"
              >
                {/* Accent decoration */}
                <div
                  style={{ backgroundColor: theme.accent }}
                  className="absolute top-0 left-0 right-0 h-1.5"
                />

                {/* Slide Header */}
                <div className="w-full">
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => handleSlideTitleChange(currentSlideIndex, e.target.value)}
                    style={{ color: theme.text }}
                    className="font-display text-3xl font-extrabold tracking-tight bg-transparent border-b border-transparent hover:border-white/20 focus:border-orange-500 focus:outline-none w-full py-1 leading-normal"
                    title="Edit Slide Title"
                  />
                </div>

                {/* Slide Bullets */}
                <div className="flex-1 flex flex-col justify-center space-y-4 my-6">
                  {currentSlide.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="group/bullet flex items-start space-x-3 text-lg leading-relaxed relative">
                      <span
                        style={{ color: theme.accent }}
                        className="text-2xl leading-none mt-1"
                      >
                        •
                      </span>
                      <textarea
                        value={bullet}
                        onChange={(e) => handleBulletChange(currentSlideIndex, bIdx, e.target.value)}
                        style={{ color: theme.text }}
                        className="bg-transparent text-base border border-transparent hover:border-white/10 focus:border-orange-500 focus:bg-white/5 focus:outline-none w-full px-2 py-1 rounded transition-all resize-none overflow-hidden h-auto"
                        rows={Math.max(1, Math.ceil(bullet.length / 50))}
                        title="Edit Bullet"
                      />
                      <button
                        onClick={() => removeBullet(currentSlideIndex, bIdx)}
                        className="opacity-0 group-hover/bullet:opacity-100 text-white/30 hover:text-rose-400 p-1 rounded transition-opacity absolute right-0 top-1 text-xs"
                        title="Delete Bullet"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => addBullet(currentSlideIndex)}
                    style={{ color: theme.accent }}
                    className="text-xs font-semibold flex items-center space-x-1 hover:opacity-80 transition-all ml-5 w-fit"
                  >
                    <span>+ Add Bullet Point</span>
                  </button>
                </div>

                {/* Slide Footer */}
                <div className="flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-4">
                  <span>{title}</span>
                  <span>Slide {currentSlideIndex + 1} of {pptData.slides.length}</span>
                </div>
              </div>

              {/* Slide Navigation controls */}
              <div className="flex items-center space-x-4 mt-6">
                <button
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white rounded-xl shadow-sm transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>

                <span className="text-xs font-medium text-slate-500">
                  SLIDE {currentSlideIndex + 1} / {pptData.slides.length}
                </span>

                <button
                  onClick={() => setCurrentSlideIndex(Math.min(pptData.slides.length - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex === pptData.slides.length - 1}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white rounded-xl shadow-sm transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col font-mono text-xs bg-slate-900 text-slate-300">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-500 text-[10px]">
              <span>PRESENTATION STRUCTURE JSON EDITOR</span>
              {parseError ? (
                <span className="text-rose-400 font-semibold">{parseError}</span>
              ) : (
                <span className="text-emerald-400 font-semibold">Valid JSON Structure</span>
              )}
            </div>
            <textarea
              value={jsonString}
              onChange={handleJsonChange}
              className="flex-1 p-4 bg-slate-950 text-orange-400 font-mono text-sm leading-relaxed focus:outline-none resize-none overflow-auto"
              spellCheck={false}
              id="ppt-json-textarea"
            />
          </div>
        )}
      </div>
    </div>
  );
}
