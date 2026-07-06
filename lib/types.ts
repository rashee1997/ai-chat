export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  artifact?: {
    id: string;
    type: "html" | "word" | "ppt" | "excel";
    title: string;
  };
}

export interface Artifact {
  id: string;
  type: "html" | "word" | "ppt" | "excel";
  title: string;
  content: string;
  isComplete: boolean;
}

export interface WordDocumentContent {
  title: string;
  subtitle?: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
}

export interface PPTTheme {
  bg: string;
  text: string;
  accent: string;
}

export interface PPTSlide {
  title: string;
  bullets: string[];
}

export interface PPTContent {
  theme?: PPTTheme;
  slides: PPTSlide[];
}

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: any[][];
}

export interface ExcelContent {
  sheets: ExcelSheet[];
}
