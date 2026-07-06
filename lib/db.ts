import fs from "fs";
import path from "path";

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
  type: string; // "html" | "word" | "ppt" | "excel" | "react" | "svg" | "mermaid"
  title: string;
  createdAt: string;
}

export interface DBRemoteAgentJob {
  id: string;
  conversationId: string;
  messageId?: string; // the assistant Message this job is fulfilling, once known
  userId: string;
  agentType: string; // "antigravity" | "deep_research" | "deep_research_max"
  geminiInteractionId: string;
  status: "queued" | "in_progress" | "requires_action" | "completed" | "failed" | "cancelled";
  inputSummary: string; // short human-readable description of what was asked, for the sidebar/UI
  resultJson?: string; // final output payload once completed (Text/Json)
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBWebhookEvent {
  id: string;
  webhookId: string; // the webhook-id header value, unique
  eventType: string;
  receivedAt: string;
  processedAt?: string;
  rawPayload: string;
}

export interface DBData {
  conversations: DBConversation[];
  messages: DBMessage[];
  artifactVersions: DBArtifactVersion[];
  jobs: DBRemoteAgentJob[];
  webhookEvents: DBWebhookEvent[];
}

const DB_FILE = path.join(process.cwd(), "db.json");

// In-memory cache to make reads instantaneous
let cache: DBData | null = null;

function loadDB(): DBData {
  if (cache) return cache;

  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      cache = JSON.parse(data);
    } else {
      cache = {
        conversations: [],
        messages: [],
        artifactVersions: [],
        jobs: [],
        webhookEvents: [],
      };
      saveDB(cache);
    }
  } catch (error) {
    console.error("Failed to load local DB, fallback to empty state", error);
    cache = {
      conversations: [],
      messages: [],
      artifactVersions: [],
      jobs: [],
      webhookEvents: [],
    };
  }

  // Ensure cache is not null and arrays exist
  if (!cache) {
    cache = {
      conversations: [],
      messages: [],
      artifactVersions: [],
      jobs: [],
      webhookEvents: [],
    };
  }
  if (!cache.conversations) cache.conversations = [];
  if (!cache.messages) cache.messages = [];
  if (!cache.artifactVersions) cache.artifactVersions = [];
  if (!cache.jobs) cache.jobs = [];
  if (!cache.webhookEvents) cache.webhookEvents = [];

  return cache;
}

function saveDB(data: DBData) {
  try {
    cache = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save local DB:", error);
  }
}

// Thread-safe repository operations
export const db = {
  getConversations(): DBConversation[] {
    const data = loadDB();
    return [...data.conversations].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  },

  getConversation(id: string): DBConversation | undefined {
    const data = loadDB();
    return data.conversations.find((c) => c.id === id);
  },

  createConversation(id: string, title: string, model: string = "gemini-3.5-flash"): DBConversation {
    const data = loadDB();
    const newConv: DBConversation = {
      id,
      title,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model,
    };
    data.conversations.push(newConv);
    saveDB(data);
    return newConv;
  },

  updateConversation(id: string, updates: Partial<Omit<DBConversation, "id" | "createdAt">>): DBConversation | undefined {
    const data = loadDB();
    const conv = data.conversations.find((c) => c.id === id);
    if (conv) {
      Object.assign(conv, updates, { updatedAt: new Date().toISOString() });
      saveDB(data);
    }
    return conv;
  },

  deleteConversation(id: string): void {
    const data = loadDB();
    data.conversations = data.conversations.filter((c) => c.id !== id);
    data.messages = data.messages.filter((m) => m.conversationId !== id);
    // Also remove artifact versions related to this conversation? 
    // Usually artifact versions are linked through conversationId in practice or can be kept/pruned.
    saveDB(data);
  },

  getMessages(conversationId: string): DBMessage[] {
    const data = loadDB();
    return data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  saveMessage(conversationId: string, message: { id: string; role: "user" | "assistant"; content: string }): DBMessage {
    const data = loadDB();
    
    // Remove if message with same ID already exists to avoid duplication
    data.messages = data.messages.filter((m) => m.id !== message.id);

    const newMsg: DBMessage = {
      id: message.id,
      conversationId,
      role: message.role,
      content: message.content,
      timestamp: new Date().toISOString(),
    };
    data.messages.push(newMsg);

    // Update conversation's updatedAt timestamp
    const conv = data.conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.updatedAt = new Date().toISOString();
    }

    saveDB(data);
    return newMsg;
  },

  getArtifactVersions(artifactId: string): DBArtifactVersion[] {
    const data = loadDB();
    return data.artifactVersions
      .filter((v) => v.artifactId === artifactId)
      .sort((a, b) => a.version - b.version);
  },

  saveArtifactVersion(artifactId: string, versionData: { content: string; type: string; title: string }): DBArtifactVersion {
    const data = loadDB();
    const existingVersions = data.artifactVersions.filter((v) => v.artifactId === artifactId);
    const nextVersionNum = existingVersions.length > 0 
      ? Math.max(...existingVersions.map((v) => v.version)) + 1 
      : 1;

    const newVer: DBArtifactVersion = {
      id: `${artifactId}-v${nextVersionNum}-${Date.now()}`,
      artifactId,
      version: nextVersionNum,
      content: versionData.content,
      type: versionData.type,
      title: versionData.title,
      createdAt: new Date().toISOString(),
    };

    data.artifactVersions.push(newVer);
    saveDB(data);
    return newVer;
  },

  clearAll(): void {
    saveDB({
      conversations: [],
      messages: [],
      artifactVersions: [],
      jobs: [],
      webhookEvents: [],
    });
  },

  // Jobs
  getJob(id: string): DBRemoteAgentJob | undefined {
    const data = loadDB();
    return data.jobs.find((j) => j.id === id);
  },

  getJobByInteractionId(geminiInteractionId: string): DBRemoteAgentJob | undefined {
    const data = loadDB();
    return data.jobs.find((j) => j.geminiInteractionId === geminiInteractionId);
  },

  getJobsForConversation(conversationId: string): DBRemoteAgentJob[] {
    const data = loadDB();
    return data.jobs.filter((j) => j.conversationId === conversationId);
  },

  getPendingJobs(): DBRemoteAgentJob[] {
    const data = loadDB();
    return data.jobs.filter((j) => ["queued", "in_progress", "requires_action"].includes(j.status));
  },

  createJob(conversationId: string, userId: string, agentType: string, geminiInteractionId: string, inputSummary: string): DBRemoteAgentJob {
    const data = loadDB();
    const newJob: DBRemoteAgentJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      userId,
      agentType,
      geminiInteractionId,
      status: "queued",
      inputSummary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.jobs.push(newJob);
    saveDB(data);
    return newJob;
  },

  updateJob(id: string, updates: Partial<Omit<DBRemoteAgentJob, "id" | "createdAt">>): DBRemoteAgentJob | undefined {
    const data = loadDB();
    const job = data.jobs.find((j) => j.id === id);
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date().toISOString() });
      saveDB(data);
    }
    return job;
  },

  // Webhook Events
  getWebhookEvent(webhookId: string): DBWebhookEvent | undefined {
    const data = loadDB();
    return data.webhookEvents.find((e) => e.webhookId === webhookId);
  },

  createWebhookEvent(webhookId: string, eventType: string, rawPayload: string): DBWebhookEvent {
    const data = loadDB();
    const newEvent: DBWebhookEvent = {
      id: `whe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      webhookId,
      eventType,
      receivedAt: new Date().toISOString(),
      rawPayload,
    };
    data.webhookEvents.push(newEvent);
    saveDB(data);
    return newEvent;
  },

  updateWebhookEvent(webhookId: string, updates: Partial<DBWebhookEvent>): DBWebhookEvent | undefined {
    const data = loadDB();
    const event = data.webhookEvents.find((e) => e.webhookId === webhookId);
    if (event) {
      Object.assign(event, updates);
      saveDB(data);
    }
    return event;
  }
};
