import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseReactArtifactContent } from "@/lib/reactArtifact";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const artifactId = searchParams.get("artifactId");

    if (!artifactId) {
      return NextResponse.json({ error: "Missing artifactId parameter" }, { status: 400 });
    }

    const versions = await db.getArtifactVersions(artifactId);
    return NextResponse.json({ versions });
  } catch (error: any) {
    console.error("GET Artifact Versions Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artifactId, type, title } = body;
    let { content } = body;

    if (!artifactId || content === undefined || !type || !title) {
      return NextResponse.json({ error: "Missing required fields for version saving" }, { status: 400 });
    }

    if (type === "react") {
      const parsed = parseReactArtifactContent(content);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: `Invalid react artifact content: ${parsed.error}` },
          { status: 400 }
        );
      }
      // Persist the sanitized (dependency-stripped) shape, not the raw model output.
      content = JSON.stringify(parsed.content);
    }

    const savedVersion = await db.saveArtifactVersion(artifactId, { content, type, title });
    return NextResponse.json({ version: savedVersion });
  } catch (error: any) {
    console.error("POST Artifact Versions Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}
