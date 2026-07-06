import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      // Fetch messages for a specific conversation
      const conversation = db.getConversation(id);
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      const messages = db.getMessages(id);
      return NextResponse.json({ conversation, messages });
    }

    // List all conversations
    const list = db.getConversations();
    return NextResponse.json({ conversations: list });
  } catch (error: any) {
    console.error("GET Conversations Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, title, pinned, model } = body;

    if (action === "create") {
      if (!id || !title) {
        return NextResponse.json({ error: "Missing id or title for creation" }, { status: 400 });
      }
      const conv = db.createConversation(id, title, model);
      return NextResponse.json({ conversation: conv });
    }

    if (action === "update") {
      if (!id) {
        return NextResponse.json({ error: "Missing id for update" }, { status: 400 });
      }
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (pinned !== undefined) updates.pinned = pinned;
      if (model !== undefined) updates.model = model;

      const conv = db.updateConversation(id, updates);
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      return NextResponse.json({ conversation: conv });
    }

    if (action === "delete") {
      if (!id) {
        return NextResponse.json({ error: "Missing id for deletion" }, { status: 400 });
      }
      db.deleteConversation(id);
      return NextResponse.json({ success: true });
    }

    if (action === "clear") {
      db.clearAll();
      return NextResponse.json({ success: true });
    }

    if (action === "saveMessage") {
      const { conversationId, message } = body;
      if (!conversationId || !message) {
        return NextResponse.json({ error: "Missing conversationId or message" }, { status: 400 });
      }
      db.saveMessage(conversationId, message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST Conversations Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}
