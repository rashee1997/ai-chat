import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type {
  DBConversation,
  DBMessage,
  DBArtifactVersion,
  DBRemoteAgentJob,
  DBWebhookEvent,
} from "@/lib/dbTypes";

export type {
  DBConversation,
  DBMessage,
  DBArtifactVersion,
  DBRemoteAgentJob,
  DBWebhookEvent,
} from "@/lib/dbTypes";

// Prisma returns `Date` for DateTime columns; every consumer of this module
// (API routes, ultimately JSON-serialized to the client) expects the same
// ISO string shape the old file-based db.json returned, so every read maps
// Date -> string at the boundary here rather than pushing that concern out
// to every call site.
function toConversation(row: {
  id: string;
  title: string;
  pinned: boolean;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}): DBConversation {
  return {
    id: row.id,
    title: row.title,
    pinned: row.pinned,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessage(row: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  timestamp: Date;
}): DBMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as "user" | "assistant",
    content: row.content,
    timestamp: row.timestamp.toISOString(),
  };
}

function toArtifactVersion(row: {
  id: string;
  artifactId: string;
  version: number;
  content: string;
  type: string;
  title: string;
  createdAt: Date;
}): DBArtifactVersion {
  return {
    id: row.id,
    artifactId: row.artifactId,
    version: row.version,
    content: row.content,
    type: row.type,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  };
}

function toJob(row: {
  id: string;
  conversationId: string;
  messageId: string | null;
  userId: string;
  agentType: string;
  geminiInteractionId: string;
  status: string;
  inputSummary: string;
  resultJson: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DBRemoteAgentJob {
  return {
    id: row.id,
    conversationId: row.conversationId,
    messageId: row.messageId ?? undefined,
    userId: row.userId,
    agentType: row.agentType,
    geminiInteractionId: row.geminiInteractionId,
    status: row.status as DBRemoteAgentJob["status"],
    inputSummary: row.inputSummary,
    resultJson: row.resultJson ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toWebhookEvent(row: {
  id: string;
  webhookId: string;
  eventType: string;
  receivedAt: Date;
  processedAt: Date | null;
  rawPayload: string;
}): DBWebhookEvent {
  return {
    id: row.id,
    webhookId: row.webhookId,
    eventType: row.eventType,
    receivedAt: row.receivedAt.toISOString(),
    processedAt: row.processedAt ? row.processedAt.toISOString() : undefined,
    rawPayload: row.rawPayload,
  };
}

// Prisma's update()/delete() throw P2025 when the row doesn't exist. The old
// file-based implementation was a no-op/undefined-returning `.find()` in
// that case, and every call site relies on that lenient contract (checking
// `if (updatedJob)` rather than catching an exception), so this restores it.
async function ignoreNotFound<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return undefined;
    }
    throw err;
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const db = {
  async getConversations(): Promise<DBConversation[]> {
    const rows = await prisma.conversation.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(toConversation);
  },

  async getConversation(id: string): Promise<DBConversation | undefined> {
    const row = await prisma.conversation.findUnique({ where: { id } });
    return row ? toConversation(row) : undefined;
  },

  async createConversation(
    id: string,
    title: string,
    model: string = "gemini-3.5-flash"
  ): Promise<DBConversation> {
    const row = await prisma.conversation.create({
      data: { id, title, model, pinned: false },
    });
    return toConversation(row);
  },

  async updateConversation(
    id: string,
    updates: Partial<Omit<DBConversation, "id" | "createdAt">>
  ): Promise<DBConversation | undefined> {
    const row = await ignoreNotFound(() =>
      prisma.conversation.update({ where: { id }, data: updates })
    );
    return row ? toConversation(row) : undefined;
  },

  async deleteConversation(id: string): Promise<void> {
    // Messages cascade-delete via the schema relation; artifact versions,
    // jobs, and webhook events are intentionally left behind, matching the
    // previous file-based implementation.
    await ignoreNotFound(() => prisma.conversation.delete({ where: { id } }));
  },

  async getMessages(conversationId: string): Promise<DBMessage[]> {
    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: "asc" },
    });
    return rows.map(toMessage);
  },

  async saveMessage(
    conversationId: string,
    message: { id: string; role: "user" | "assistant"; content: string }
  ): Promise<DBMessage> {
    const [row] = await prisma.$transaction([
      prisma.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          conversationId,
          role: message.role,
          content: message.content,
        },
        update: {
          role: message.role,
          content: message.content,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {},
      }),
    ]);
    return toMessage(row);
  },

  async getArtifactVersions(artifactId: string): Promise<DBArtifactVersion[]> {
    const rows = await prisma.artifactVersion.findMany({
      where: { artifactId },
      orderBy: { version: "asc" },
    });
    return rows.map(toArtifactVersion);
  },

  async saveArtifactVersion(
    artifactId: string,
    versionData: { content: string; type: string; title: string }
  ): Promise<DBArtifactVersion> {
    const row = await prisma.$transaction(async (tx) => {
      const latest = await tx.artifactVersion.aggregate({
        where: { artifactId },
        _max: { version: true },
      });
      const nextVersion = (latest._max.version ?? 0) + 1;
      return tx.artifactVersion.create({
        data: {
          id: generateId(`${artifactId}-v${nextVersion}`),
          artifactId,
          version: nextVersion,
          content: versionData.content,
          type: versionData.type,
          title: versionData.title,
        },
      });
    });
    return toArtifactVersion(row);
  },

  async clearAll(): Promise<void> {
    await prisma.$transaction([
      prisma.message.deleteMany({}),
      prisma.conversation.deleteMany({}),
      prisma.artifactVersion.deleteMany({}),
      prisma.remoteAgentJob.deleteMany({}),
      prisma.webhookEvent.deleteMany({}),
    ]);
  },

  // Jobs
  async getJob(id: string): Promise<DBRemoteAgentJob | undefined> {
    const row = await prisma.remoteAgentJob.findUnique({ where: { id } });
    return row ? toJob(row) : undefined;
  },

  async getJobByInteractionId(geminiInteractionId: string): Promise<DBRemoteAgentJob | undefined> {
    const row = await prisma.remoteAgentJob.findUnique({ where: { geminiInteractionId } });
    return row ? toJob(row) : undefined;
  },

  async getJobsForConversation(conversationId: string): Promise<DBRemoteAgentJob[]> {
    const rows = await prisma.remoteAgentJob.findMany({ where: { conversationId } });
    return rows.map(toJob);
  },

  async getPendingJobs(): Promise<DBRemoteAgentJob[]> {
    const rows = await prisma.remoteAgentJob.findMany({
      where: { status: { in: ["queued", "in_progress", "requires_action"] } },
    });
    return rows.map(toJob);
  },

  async createJob(
    conversationId: string,
    userId: string,
    agentType: string,
    geminiInteractionId: string,
    inputSummary: string
  ): Promise<DBRemoteAgentJob> {
    const row = await prisma.remoteAgentJob.create({
      data: {
        id: generateId("job"),
        conversationId,
        userId,
        agentType,
        geminiInteractionId,
        status: "queued",
        inputSummary,
      },
    });
    return toJob(row);
  },

  async updateJob(
    id: string,
    updates: Partial<Omit<DBRemoteAgentJob, "id" | "createdAt">>
  ): Promise<DBRemoteAgentJob | undefined> {
    const row = await ignoreNotFound(() =>
      prisma.remoteAgentJob.update({ where: { id }, data: updates })
    );
    return row ? toJob(row) : undefined;
  },

  // Webhook Events
  async getWebhookEvent(webhookId: string): Promise<DBWebhookEvent | undefined> {
    const row = await prisma.webhookEvent.findUnique({ where: { webhookId } });
    return row ? toWebhookEvent(row) : undefined;
  },

  async createWebhookEvent(
    webhookId: string,
    eventType: string,
    rawPayload: string
  ): Promise<DBWebhookEvent> {
    const row = await prisma.webhookEvent.create({
      data: { id: generateId("whe"), webhookId, eventType, rawPayload },
    });
    return toWebhookEvent(row);
  },

  async updateWebhookEvent(
    webhookId: string,
    updates: Partial<DBWebhookEvent>
  ): Promise<DBWebhookEvent | undefined> {
    const { id, webhookId: _wh, ...rest } = updates;
    const row = await ignoreNotFound(() =>
      prisma.webhookEvent.update({ where: { webhookId }, data: rest })
    );
    return row ? toWebhookEvent(row) : undefined;
  },
};
