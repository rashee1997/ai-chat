import React from "react";
import { Server, CircleHelp, AlertTriangle } from "lucide-react";
import type { BackgroundJobStatus as BackgroundJobStatusData } from "@/lib/parser";

interface BackgroundJobStatusProps {
  status: BackgroundJobStatusData;
}

// A calm, deliberately non-pulsing indicator for a remote agent job that can
// run for minutes — continuous motion on something this long-lived reads as
// broken rather than informative (see DESIGN.md's state patterns).
export default function BackgroundJobStatus({ status }: BackgroundJobStatusProps) {
  if (status.kind === "running") {
    return (
      <div className="p-3 bg-surface-raised border border-border rounded-xl flex items-start gap-3 shadow-sm">
        <div className="p-1.5 rounded-lg bg-surface-sunken text-on-surface-muted flex-shrink-0">
          <Server size={14} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-on-surface">Background agent running</div>
          <div className="text-xs text-on-surface-muted mt-0.5">
            {status.status} — this can take a few minutes, feel free to keep working elsewhere.
          </div>
        </div>
      </div>
    );
  }

  if (status.kind === "requires_action") {
    return (
      <div className="p-3 bg-warning-surface border border-warning/30 rounded-xl flex items-start gap-3 shadow-sm">
        <div className="p-1.5 rounded-lg bg-surface-raised text-warning flex-shrink-0">
          <CircleHelp size={14} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-xs font-semibold text-warning">Action required</div>
          <div className="text-xs text-on-surface">{status.description}</div>
          <div className="text-[10px] text-on-surface-muted font-mono uppercase tracking-wide">
            {status.actionType}
          </div>
          <div className="text-[10px] text-on-surface-muted italic">Type your response below to resume.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-danger-surface border border-danger/30 rounded-xl flex items-start gap-3 shadow-sm">
      <div className="p-1.5 rounded-lg bg-surface-raised text-danger flex-shrink-0">
        <AlertTriangle size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-danger">Background task failed</div>
        <div className="text-xs text-on-surface mt-0.5">{status.error}</div>
      </div>
    </div>
  );
}
