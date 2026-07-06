// Pure type declarations shared between server code (lib/db.ts, which talks
// to Prisma) and client components (Sidebar.tsx, page.tsx). This file must
// stay free of any runtime imports — Prisma's generated client is Node-only
// and must never end up in the browser bundle, so client components import
// types from here instead of from lib/db.ts directly.

export interface DBConversation {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  model: string;
}

export interface DBMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DBArtifactVersion {
  id: string;
  artifactId: string;
  version: number;
  content: string;
  type: string;
  title: string;
  createdAt: string;
}

export interface DBRemoteAgentJob {
  id: string;
  conversationId: string;
  messageId?: string;
  userId: string;
  agentType: string;
  geminiInteractionId: string;
  status: "queued" | "in_progress" | "requires_action" | "completed" | "failed" | "cancelled";
  inputSummary: string;
  resultJson?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBWebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  receivedAt: string;
  processedAt?: string;
  rawPayload: string;
}
