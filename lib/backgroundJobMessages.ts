// Single source of truth for the plain-text conventions used to signal
// background-agent job state through `message.content`. `app/page.tsx`
// (trackBackgroundJob) builds these strings; `lib/parser.ts`
// (parseBackgroundJobStatus) parses them back out to drive
// `components/BackgroundJobStatus`. Keeping both sides here means a copy
// tweak can't silently desync the builder from the matcher.

export function formatBackgroundJobRunning(status: string): string {
  return `⚙️ [Background Agent: ${status}] Running remote operations... please stand by.`;
}

export function formatBackgroundJobActionRequired(actionType: string, description: string): string {
  return `⚙️ **Action Required**: The remote agent requires your approval or input to proceed.\n\nType: \`${actionType}\`\nDescription: \`${description}\`\n\n*(Type your response below to resume the job)*`;
}

export function formatBackgroundJobFailed(error: string): string {
  return `⚠️ Background task failed: ${error}`;
}
