"use client";

import React, { useState, useEffect } from "react";
import { Table, Download, Search, Edit2, Code, Check, Copy, Plus, Trash, Grid3X3 } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelSheet {
  name: string;
  headers: string[];
  rows: any[][];
}

interface ExcelContent {
  sheets: ExcelSheet[];
}

interface ExcelArtifactProps {
  content: string;
  title: string;
  id: string;
  onContentChange: (newContent: string) => void;
}

export default function ExcelArtifact({
  content,
  title,
  id,
  onContentChange,
}: ExcelArtifactProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [cellEditVal, setCellEditVal] = useState("");

  // Track props for render-phase sync
  const [prevContent, setPrevContent] = useState(content);
  const [prevTitle, setPrevTitle] = useState(title);

  // Initialize state with lazy initializers to avoid duplicate run of parser
  const [excelData, setExcelData] = useState<ExcelContent | null>(() => {
    try {
      const parsed = JSON.parse(content.trim()) as ExcelContent;
      if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
        return parsed;
      }
      throw new Error("Invalid format");
    } catch (err) {
      return {
        sheets: [
          {
            name: "Main Ledger",
            headers: ["Transaction ID", "Date", "Category", "Amount ($)", "Status"],
            rows: [
              ["TX-1001", "2026-07-01", "Software Sub", 150.00, "Approved"],
              ["TX-1002", "2026-07-02", "Office Supplies", 42.50, "Pending"],
              ["TX-1003", "2026-07-03", "Server Credits", 1200.00, "Approved"],
              ["TX-1004", "2026-07-04", "Team Lunch", 84.20, "Approved"],
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
      const parsed = JSON.parse(content.trim()) as ExcelContent;
      if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
        setExcelData(parsed);
        setParseError(null);
      } else {
        throw new Error("Invalid format: 'sheets' array with at least 1 sheet is required.");
      }
    } catch (err: any) {
      const fallback: ExcelContent = {
        sheets: [
          {
            name: "Main Ledger",
            headers: ["Transaction ID", "Date", "Category", "Amount ($)", "Status"],
            rows: [
              ["TX-1001", "2026-07-01", "Software Sub", 150.00, "Approved"],
              ["TX-1002", "2026-07-02", "Office Supplies", 42.50, "Pending"],
              ["TX-1003", "2026-07-03", "Server Credits", 1200.00, "Approved"],
              ["TX-1004", "2026-07-04", "Team Lunch", 84.20, "Approved"],
            ],
          },
        ],
      };
      setExcelData(fallback);
      setParseError("Using fallback sheet. JSON Error: " + err.message);
    }
    setJsonString(content);
    setPrevContent(content);
    setPrevTitle(title);
  }

  const updateExcelState = (newData: ExcelContent) => {
    setExcelData(newData);
    const newJson = JSON.stringify(newData, null, 2);
    setJsonString(newJson);
    onContentChange(newJson);
  };

  const handleCellEditStart = (rIdx: number, cIdx: number, currentVal: any) => {
    setEditingCell({ rIdx, cIdx });
    setCellEditVal(String(currentVal ?? ""));
  };

  const handleCellEditSave = () => {
    if (!editingCell || !excelData) return;
    const { rIdx, cIdx } = editingCell;
    const updatedSheets = [...excelData.sheets];
    
    // Try to parse number if applicable
    let finalVal: any = cellEditVal;
    if (cellEditVal.trim() !== "" && !isNaN(Number(cellEditVal))) {
      finalVal = Number(cellEditVal);
    }

    updatedSheets[activeSheetIndex].rows[rIdx][cIdx] = finalVal;
    updateExcelState({ ...excelData, sheets: updatedSheets });
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellEditSave();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonString(val);
    onContentChange(val);
    try {
      const parsed = JSON.parse(val) as ExcelContent;
      if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
        setExcelData(parsed);
        setParseError(null);
      }
    } catch (err: any) {
      setParseError("JSON Error: " + err.message);
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

  const handleDownloadXlsx = () => {
    if (!excelData) return;

    // Create workbook using SheetJS
    const wb = XLSX.utils.book_new();

    excelData.sheets.forEach((sheet) => {
      // Align headers and rows together
      const aoa = [sheet.headers, ...sheet.rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });

    XLSX.writeFile(wb, `${id}.xlsx`);
  };

  const addRow = () => {
    if (!excelData) return;
    const updatedSheets = [...excelData.sheets];
    const sheet = updatedSheets[activeSheetIndex];
    const newRow = new Array(sheet.headers.length).fill("");
    sheet.rows.push(newRow);
    updateExcelState({ ...excelData, sheets: updatedSheets });
  };

  const removeRow = (rIdx: number) => {
    if (!excelData) return;
    const updatedSheets = [...excelData.sheets];
    updatedSheets[activeSheetIndex].rows.splice(rIdx, 1);
    updateExcelState({ ...excelData, sheets: updatedSheets });
  };

  const currentSheet = excelData?.sheets[activeSheetIndex];
  
  // Filter rows based on search query
  const filteredRows = currentSheet
    ? currentSheet.rows.filter((row) =>
        row.some((cell) =>
          String(cell ?? "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : [];

  return (
    <div className="flex flex-col h-full bg-[#f9f9f8] rounded-xl shadow-md border border-[#ececec] overflow-hidden" id="excel-artifact-wrapper">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#ececec]" id="excel-artifact-header">
        <div className="flex items-center space-x-2">
          <Table size={18} className="text-emerald-600" />
          <span className="font-sans font-semibold text-[#1a1a1a] text-sm tracking-tight truncate max-w-xs">
            {currentSheet?.name || title}
          </span>
          <span className="text-xs bg-emerald-50 border border-emerald-200/50 text-emerald-600 font-medium px-2 py-0.5 rounded-full">
            Spreadsheet
          </span>
        </div>

        <div className="flex items-center space-x-1" id="excel-controls">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-[#f3f4f6] text-[#1a1a1a]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Grid3X3 size={14} className="text-emerald-600" />
            <span>Interactive Grid</span>
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
            <span>JSON Ledger</span>
          </button>

          <div className="w-px h-5 bg-[#ececec] mx-1" />

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#f3f4f6] transition-colors cursor-pointer"
            title="Copy JSON Ledger"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>

          <button
            onClick={handleDownloadXlsx}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
            title="Download Workbook"
          >
            <Download size={14} />
            <span>Download .xlsx</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-100 flex flex-col min-h-[400px]">
        {activeTab === "preview" && excelData && currentSheet ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden" id="spreadsheet-workspace">
            {/* Action Bar (Search & Sheet Tabs) */}
            <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Sheet Tabs */}
              <div className="flex items-center space-x-1.5 overflow-auto w-full sm:w-auto" id="sheet-tabs">
                {excelData.sheets.map((sheet, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => {
                      setActiveSheetIndex(sIdx);
                      setEditingCell(null);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      sIdx === activeSheetIndex
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>

              {/* Search & Actions */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <span className="absolute left-2.5 top-2.5 text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search spreadsheet rows..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <button
                  onClick={addRow}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-medium text-slate-700 hover:text-emerald-700 shadow-sm transition-all bg-white"
                >
                  <Plus size={12} />
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-auto p-4" id="grid-scroll-container">
              <div className="min-w-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden select-text">
                <table className="min-w-full table-fixed border-collapse font-sans text-xs">
                  {/* Grid Headers */}
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                    <tr>
                      <th className="w-10 border-r border-slate-200 text-center py-2 bg-slate-100">#</th>
                      {currentSheet.headers.map((header, cIdx) => (
                        <th key={cIdx} className="border-r border-slate-200 px-4 py-2 text-left">
                          <div className="flex items-center justify-between">
                            <span>{header}</span>
                            <span className="text-[9px] font-mono opacity-50">
                              {String.fromCharCode(65 + cIdx)}
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="w-12 text-center py-2">Delete</th>
                    </tr>
                  </thead>

                  {/* Grid Rows */}
                  <tbody className="divide-y divide-slate-150">
                    {filteredRows.map((row, rIdx) => {
                      // Map filtered index back to absolute sheet index
                      const absoluteIndex = currentSheet.rows.indexOf(row);
                      
                      return (
                        <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                          {/* Row Indicator */}
                          <td className="border-r border-slate-200 bg-slate-50 text-slate-400 text-center font-mono py-2.5 font-semibold select-none">
                            {absoluteIndex + 1}
                          </td>

                          {/* Row Cells */}
                          {row.map((cell, cIdx) => {
                            const isEditing =
                              editingCell?.rIdx === absoluteIndex && editingCell?.cIdx === cIdx;

                            return (
                              <td
                                key={cIdx}
                                className="border-r border-slate-200 px-4 py-1.5 text-slate-700 truncate cursor-text hover:bg-emerald-50/20"
                                onClick={() => handleCellEditStart(absoluteIndex, cIdx, cell)}
                              >
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={cellEditVal}
                                    onChange={(e) => setCellEditVal(e.target.value)}
                                    onBlur={handleCellEditSave}
                                    onKeyDown={handleCellKeyDown}
                                    className="w-full bg-white border border-emerald-500 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
                                    autoFocus
                                  />
                                ) : (
                                  <span className={typeof cell === "number" ? "font-mono font-medium text-emerald-700" : ""}>
                                    {cell !== null && cell !== undefined ? String(cell) : ""}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Delete Row button */}
                          <td className="text-center py-1 bg-slate-50/25">
                            <button
                              onClick={() => removeRow(absoluteIndex)}
                              className="text-slate-300 hover:text-rose-500 p-1.5 rounded transition-colors"
                              title="Delete Row"
                            >
                              <Trash size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={currentSheet.headers.length + 2}
                          className="py-8 text-center text-slate-400 italic"
                        >
                          No ledger rows match your search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase select-none">
              <span>Spreadsheet Grid Workspace</span>
              <span>
                Rows: {currentSheet.rows.length} • Columns: {currentSheet.headers.length}
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col font-mono text-xs bg-slate-900 text-slate-300">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-500 text-[10px]">
              <span>SPREADSHEET DOCUMENT JSON EDITOR</span>
              {parseError ? (
                <span className="text-rose-400 font-semibold">{parseError}</span>
              ) : (
                <span className="text-emerald-400 font-semibold">Valid JSON Structure</span>
              )}
            </div>
            <textarea
              value={jsonString}
              onChange={handleJsonChange}
              className="flex-1 p-4 bg-slate-950 text-emerald-400 font-mono text-sm leading-relaxed focus:outline-none resize-none overflow-auto"
              spellCheck={false}
              id="excel-json-textarea"
            />
          </div>
        )}
      </div>
    </div>
  );
}
