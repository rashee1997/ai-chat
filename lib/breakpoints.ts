// Mirrors Tailwind's default `lg` breakpoint (see the `lg:` utilities used
// throughout app/page.tsx, components/Sidebar.tsx and
// components/ArtifactPanel.tsx to switch between the persistent desktop
// layout and the mobile overlay/drawer behavior). Centralized here so the
// mobile/desktop cutoff can't drift between the several call sites that
// need it in plain JS (event handlers, mount-time checks) rather than CSS.
export const LG_BREAKPOINT_PX = 1024;

export function isBelowLgBreakpoint(): boolean {
  return typeof window !== "undefined" && window.innerWidth < LG_BREAKPOINT_PX;
}
