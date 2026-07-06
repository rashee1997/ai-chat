import { Artifact } from "./types";

export interface ParsedMessage {
  conversationalText: string;
  artifact: Artifact | null;
}

export function parseMessageContent(text: string): ParsedMessage {
  const artifactStartRegex = /<artifact\s+type="([^"]+)"\s+id="([^"]+)"\s+title="([^"]+)">/;
  const startMatch = text.match(artifactStartRegex);

  if (!startMatch) {
    return {
      conversationalText: text,
      artifact: null,
    };
  }

  const type = startMatch[1] as "html" | "word" | "ppt" | "excel" | "svg" | "mermaid";
  const id = startMatch[2];
  const title = startMatch[3];
  
  const startIndex = startMatch.index!;
  const fullStartTag = startMatch[0];
  const contentStartIndex = startIndex + fullStartTag.length;

  const endTag = "</artifact>";
  const endIndex = text.indexOf(endTag, contentStartIndex);

  let content = "";
  let isComplete = false;
  let conversationalText = text.substring(0, startIndex);

  if (endIndex !== -1) {
    content = text.substring(contentStartIndex, endIndex);
    isComplete = true;
    conversationalText += text.substring(endIndex + endTag.length);
  } else {
    content = text.substring(contentStartIndex);
    isComplete = false;
  }

  return {
    conversationalText: conversationalText.trim(),
    artifact: {
      id,
      type,
      title,
      content,
      isComplete,
    },
  };
}
