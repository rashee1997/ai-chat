# Design Brief — Claude Artifact Studio

## Audience & job per screen

This is a professional workspace, not a consumer chatbot. The person using it is
delegating document/code/data production to an AI and then inspecting, editing,
and exporting the result — a QHSE/ops professional drafting a policy doc, a
developer scaffolding a web app, an analyst building a ledger.

- **Chat column**: converse and delegate. Get a task stated, watch it get picked
  up (streamed reply, tool call, or background agent job), and jump into the
  artifact it produced.
- **Artifact panel**: inspect, edit, compare versions, and export. This is where
  the actual work product lives — it should feel closer to a document/code editor
  than a chat bubble.

## Chosen direction: "Workshop"

Quiet, high-contrast, paper-and-ink surfaces with a single restrained accent
(violet, already present in the current UI as the brand mark) reserved for
primary actions, focus states, and links. Explicitly **not**:

- the cream-paper + terracotta "generic AI tool" look, and
- the near-black + neon-gradient "generic AI tool" look.

Rules that keep it restrained:
- One accent hue (violet) for interactive/primary elements. No secondary
  decorative accent.
- Color is otherwise functional only: success/warning/danger for state, and the
  existing per-artifact-type badge colors (emerald/blue/orange/purple/indigo)
  stay because they encode *type identity* (Web App vs Word vs PPT vs Excel vs
  SVG vs Mermaid), not decoration.
- Motion is a confirmation, never ambient. No pulsing/animated chrome for
  things that aren't actively changing.
- Typography: a fluid, rem-based clamp() scale so hierarchy holds at any zoom
  level or panel width, not a fixed set of breakpoint-specific sizes.

## Token source of truth

All color/type/spacing/radius values live as CSS custom properties in
`app/globals.css`, mapped into Tailwind v4's `@theme` block. Components consume
`bg-surface`, `text-on-surface-muted`, `border-border`, etc. — never a raw hex
or literal px font-size. Light values sit at `:root`; dark values live under
`[data-theme="dark"]`, so retheming is a token edit, not a component rewrite.

The artifact preview surfaces (Word page, PPT slide canvas, Excel grid) are
*intentionally* excluded from the token pass where they emulate a real
document's paper/slide colors — those colors represent the document being
produced, not the app's own chrome.

## Markdown rendering

Assistant messages stream token-by-token, so the renderer must tolerate
unterminated markdown mid-stream. `streamdown` (Vercel, MIT) is used as a
drop-in renderer: it already does incomplete-markdown-safe parsing, per-block
memoization, Shiki code highlighting with copy buttons, GFM tables, and
built-in Mermaid + sanitization — which covers this addendum's Phase 15
requirements without a hand-rolled remark/rehype pipeline. Its own internal
chrome (code block header, copy/zoom controls) uses shadcn-style class names
(`bg-background`, `text-muted-foreground`, etc.); those are aliased to the same
tokens above so it re-themes with the rest of the app instead of shipping its
own look.
