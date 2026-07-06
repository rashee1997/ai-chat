import { EventEmitter } from "events";

class JobPubSub extends EventEmitter {
  private static instance: JobPubSub;

  private constructor() {
    super();
    this.setMaxListeners(0);
  }

  public static getInstance(): JobPubSub {
    if (!JobPubSub.instance) {
      JobPubSub.instance = new JobPubSub();
    }
    return JobPubSub.instance;
  }

  public publish(jobId: string, data: any) {
    this.emit(`job:${jobId}`, data);
    if (data.conversationId) {
      this.emit(`conversation:${data.conversationId}`, data);
    }
  }

  public subscribe(jobId: string, listener: (data: any) => void) {
    this.on(`job:${jobId}`, listener);
    return () => {
      this.off(`job:${jobId}`, listener);
    };
  }

  public subscribeConversation(conversationId: string, listener: (data: any) => void) {
    this.on(`conversation:${conversationId}`, listener);
    return () => {
      this.off(`conversation:${conversationId}`, listener);
    };
  }
}

export const pubsub = JobPubSub.getInstance();
