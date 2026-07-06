# Design Brief — Artifact Studio AI

> Living document. Update this file when a visual decision repeats (a new
> button style, alert pattern, or spacing choice shows up more than once) —
> not after every one-off experiment. If a token value in this file and
> `app/globals.css` ever disagree, `globals.css` is the source of truth and
> this file is stale; fix the doc, not the other way around.

## Audience & job per screen

This is a professional workspace, not a consumer chatbot. The person using it
is delegating document/code/data production to an AI and then inspecting,
editing, and exporting the result — a QHSE/ops professional drafting a policy
doc, a developer scaffolding a web app, an analyst building a ledger.

- **Chat column**: converse and delegate. Get a task stated, watch it get
  picked up (streamed reply, tool call, or background agent job), and jump
  into the artifact it produced.
- **Artifact panel**: inspect, edit, compare versions, and export. This is
  where the actual work product lives — it should feel closer to a
  document/code editor than a chat bubble.

## Chosen direction: "Workshop"

Quiet, high-contrast, paper-and-ink surfaces with a single restrained accent
(violet, already present in the current UI as the brand mark) reserved for
primary actions, focus states, and links.

**Don't:**
- Don't add a second decorative accent hue. Violet is the only accent.
- Don't recolor the per-artifact-type badges (emerald/blue/orange/purple/
  indigo) — they encode *type identity* (Web App vs Word vs PPT vs Excel vs
  SVG vs Mermaid), not decoration, and are exempt from the token pass.
- Don't recolor the Word/PPT/Excel document preview canvases — those colors
  represent the document being produced, not the app's own chrome.
- Don't animate chrome that isn't actively changing (no ambient pulsing,
  gradients-in-motion, or looping spinners for states that could instead be a
  static "running" indicator). Motion confirms an action; it never decorates.
- Don't reach for the cream-paper + terracotta "generic AI tool" look, or the
  near-black + neon-gradient "generic AI tool" look — both were considered
  and rejected in favor of the above.
- Don't hardcode a hex value or a literal px font-size in a component. Add a
  token (below) or use an existing one.

## Token reference

Source of truth: `app/globals.css` (`:root` = light, `[data-theme="dark"]` =
dark, mapped into Tailwind v4's `@theme`). Components consume the Tailwind
utility, never the raw value — `bg-surface`, `text-on-surface-muted`,
`border-border`, `rounded-md`, etc.

### Color roles

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `surface` | `#fdfdfc` | `#161618` | Page background |
| `surface-raised` | `#ffffff` | `#1e1e21` | Cards, panels, the composer |
| `surface-sunken` | `#f3f3f1` | `#101012` | Sidebar, hover fills, code/table chrome |
| `on-surface` | `#1a1a1a` | `#f1f1ef` | Primary text |
| `on-surface-muted` | `#78787a` | `#97979c` | Secondary text, placeholders, icons |
| `border` | `#e6e6e2` | `#2b2b2f` | Hairlines, dividers |
| `primary` | `#6d28d9` | `#a78bfa` | Links, focus rings, primary actions, brand mark |
| `primary-hover` | `#5b21b6` | `#c4b5fd` | Hover/active state of `primary` |
| `on-primary` | `#ffffff` | `#161618` | Text/icons on a `primary`-filled surface |
| `success` / `success-surface` | `#059669` / `#ecfdf5` | `#34d399` / `#062a20` | Positive state (diff additions, "restored" confirmations) |
| `warning` / `warning-surface` | `#d97706` / `#fffbeb` | `#fbbf24` / `#2b1d05` | Caution state (viewing non-live history, pending confirmation) |
| `danger` / `danger-surface` | `#dc2626` / `#fef2f2` | `#f87171` / `#2b0e0e` | Destructive actions, errors |

`on-surface` and `surface` also get used *inverted* for solid "ink" chips
(the user's chat bubble, the composer's send button): `bg-on-surface` +
`text-surface`. In light mode that's a near-black pill with near-white text;
in dark mode it flips to a near-white pill with near-black text — same
utility classes, correct contrast in both themes, no extra token needed.

### Type scale

Fluid `clamp(min, preferred, max)` in rem, so it scales with panel width but
never ignores browser zoom (a pure `vw` value would).

| Token | Expression | Typical use |
|---|---|---|
| `text-xs` | `clamp(0.6875rem, 0.66rem + 0.1vw, 0.75rem)` | Timestamps, badges, uppercase labels |
| `text-sm` | `clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)` | Secondary UI text |
| `text-base` | `clamp(0.875rem, 0.83rem + 0.2vw, 1rem)` | Body / message text |
| `text-lg` | `clamp(1rem, 0.94rem + 0.3vw, 1.125rem)` | Emphasized body, small headings |
| `text-xl`–`text-3xl` | ... | Section and page-level headings |

`--font-sans` (Inter) for UI text, `--font-display` (Space Grotesk) for the
product wordmark/headings, `--font-mono` for code and IDs.

### Spacing, radius, elevation

- Fixed scale: `space-1` (0.25rem) through `space-8` (2rem), plus two fluid
  steps — `spacing-fluid-md` / `spacing-fluid-lg` — for section padding that
  should breathe more on wide panels.
- Radius: `radius-sm` (0.375rem) / `radius-md` (0.625rem) / `radius-lg` (1rem)
  — these override Tailwind's default `rounded-*` scale directly, so existing
  `rounded-md`-style classes already pick them up.
- Elevation: `shadow-sm` / `shadow-md`, theme-aware (softer, more diffuse in
  dark mode — a shadow tuned for a white surface reads as a hard black smudge
  on a dark one).

## Component & state patterns

- **Buttons**: solid (`bg-primary`/`bg-on-surface`) for the one primary action
  per view (send, submit); outlined/ghost (`border-border` + `hover:bg-
  surface-sunken`) for everything else. Every interactive element gets a
  `focus-visible:ring-2 focus-visible:ring-primary/40` — never `outline: none`
  without a replacement.
- **Streaming states** (chat): a message actively receiving tokens uses
  Streamdown's block caret, not a spinner. A background agent job (can run
  for minutes) gets a calm, non-pulsing "running" indicator — continuous
  motion on something that takes minutes reads as broken, not informative.
- **History / non-live states** (version history, diff preview): always
  `warning` colored — it's the single semantic signal for "you are not
  looking at the live state."
- **Destructive actions** (delete thread, wipe workspace): always `danger`
  colored and require an inline confirm step, never a silent single click.

## Accessibility constraints

Measured against the token values above (WCAG 2.x contrast math, not
estimated):

- `on-surface` / `surface` (either theme): **>15:1** — far above the 4.5:1
  body-text minimum.
- `on-surface-muted` / `surface` or `surface-raised`: **4.3–6.2:1** — passes
  AA for body text in both themes.
- `primary` / `surface-raised` (link/focus-ring color on a card): **6.6–7.1:1**
  — passes AA.
- `danger` / `surface-raised`: **4.8:1** (light) — passes AA for body text.
- **Known gap**: `success` (3.77:1) and `warning` (3.19:1) on `surface-raised`
  in *light* mode fall short of the 4.5:1 small-text threshold — they're fine
  as icon colors, borders, or large/bold text (both clear the 3:1 UI-component
  threshold), but don't set small body text in these colors on a white
  background in light mode until they're darkened. Dark mode is not affected:
  `success` (8.65:1) and `warning` (9.96:1) on `surface-raised` both clear AA
  comfortably as-is.
- **Touch targets**: interactive icons target 44×44px minimum (composer send/
  attach, theme toggle, "New message" pill). Dense inline actions inside
  Streamdown's code-block toolbar are smaller — a known, accepted exception
  for secondary in-content actions, not primary navigation.
- **Motion**: `prefers-reduced-motion: reduce` is honored globally (`app/
  globals.css`) and explicitly threaded into Streamdown's `animated`/`caret`
  props — reduced-motion users get zero animation, not just shorter animation.

## Markdown rendering

Assistant messages stream token-by-token, so the renderer must tolerate
unterminated markdown mid-stream. `streamdown` (Vercel, MIT) is used as a
drop-in renderer: it already does incomplete-markdown-safe parsing, per-block
memoization, Shiki code highlighting with copy buttons, GFM tables, and
built-in Mermaid + sanitization — covering this without a hand-rolled remark/
rehype pipeline. Its internal chrome (code block header, copy/zoom controls)
uses shadcn-style class names (`bg-background`, `text-muted-foreground`,
etc.); those are aliased to the tokens above so it re-themes with the rest of
the app instead of shipping its own look.

## React artifact workspace (Sandpack)

The "react" artifact type is a multi-file project (`{ files, dependencies,
entry }`, validated with zod in `lib/reactArtifact.ts`) rendered live via
`@codesandbox/sandpack-react`'s granular building blocks
(`SandpackProvider`/`SandpackLayout`/`SandpackFileExplorer`/
`SandpackCodeEditor`/`SandpackPreview`), not its one-line `<Sandpack />`
preset — that's what lets the workspace chrome (file tree, toolbar, device
preview frame) consume this app's own design tokens instead of Sandpack's
default look.

**Maintenance risk (accepted tradeoff, recorded deliberately):** CodeSandbox
announced `@codesandbox/sandpack-react` is no longer actively maintained. It
remains the most capable lightweight in-browser bundler available (small
bundle size vs. Monaco/full-IDE alternatives, zero server infra, real npm
dependency resolution, hot reload), so it's still the pragmatic choice — but
both `@codesandbox/sandpack-react` and `@codesandbox/sandpack-themes` are
pinned to an **exact** version in `package.json` (no `^`/`~`), so an upstream
change can never surprise-break the workspace on a routine `npm install`.
Bump the pin deliberately, re-test the workspace, and update this note.
If a future React major version (or bundler incompatibility) ever appears
with no upstream fix, the recorded fallback to evaluate is **StackBlitz
WebContainers** — a heavier but actively maintained alternative.

**License note (transitive dependency, recorded deliberately):**
`@codesandbox/sandpack-client` (a dependency of `sandpack-react`) pulls in
`@codesandbox/nodebox`, which is licensed under CodeSandbox's own
"Sustainable Use License" — a source-available, non-OSI-approved license
that restricts use to internal/non-commercial purposes and free
redistribution only. `nodebox` is `sandpack-client`'s in-browser Node.js
runtime, used only by its `"node"` environment/template — this app only
ever instantiates `template="react"` (see `components/ReactArtifact.tsx`),
and `sandpack-client` loads the node client via a runtime-gated dynamic
`require()`, so that code path is never reached and is very likely never
even fetched as a chunk. It's still a transitive dependency present in
`package-lock.json` (a supply-chain fact regardless of runtime reachability)
and can't be removed without patching `sandpack-client` itself, which is
pinned to an exact version specifically so this doesn't shift silently on
an unrelated `npm install`. Flagged here so it's a recorded, deliberate
tradeoff rather than a silent gap — revisit if `sandpack-client` ever makes
`nodebox` a hard (non-lazy) dependency.

The live preview iframe runs on CodeSandbox's own sandboxed subdomain by
design (isolates model/user-written code from this app's cookies/
localStorage) — this is a different, complementary boundary from the
server-side `code_execution` tool used elsewhere for agent reasoning; the
two must never share a trust boundary or code path.

Dependencies the model may request for a react artifact are restricted to a
curated allow-list (`ALLOWED_REACT_DEPENDENCIES` in `lib/reactArtifact.ts`)
rather than resolved from npm sight-unseen — anything off the list is
stripped before the project runs.
