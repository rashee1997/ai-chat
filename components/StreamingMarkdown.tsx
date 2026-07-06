"use client";

import React, { useSyncExternalStore } from "react";
import { Streamdown } from "streamdown";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

interface StreamingMarkdownProps {
  content: string;
  /** Whether this message is still actively receiving new tokens. */
  isStreaming: boolean;
}

/**
 * Renders assistant message text through Streamdown so unterminated markdown
 * mid-stream (an unclosed code fence, an unclosed **bold) never flashes
 * garbled syntax. Historical (already-complete) messages render in "static"
 * mode, which skips the streaming block-diffing entirely.
 */
export default function StreamingMarkdown({ content, isStreaming }: StreamingMarkdownProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <Streamdown
      mode={isStreaming ? "streaming" : "static"}
      animated={!prefersReducedMotion}
      caret={isStreaming && !prefersReducedMotion ? "block" : undefined}
      className="text-sm leading-relaxed text-on-surface [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-on-surface-muted [&_hr]:border-border [&_table]:text-xs"
    >
      {content}
    </Streamdown>
  );
}
