import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const artifactId = searchParams.get("artifactId");

    if (!artifactId) {
      return NextResponse.json({ error: "Missing artifactId parameter" }, { status: 400 });
    }

    const versions = db.getArtifactVersions(artifactId);
    return NextResponse.json({ versions });
  } catch (error: any) {
    console.error("GET Artifact Versions Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artifactId, content, type, title } = body;

    if (!artifactId || content === undefined || !type || !title) {
      return NextResponse.json({ error: "Missing required fields for version saving" }, { status: 400 });
    }

    const savedVersion = db.saveArtifactVersion(artifactId, { content, type, title });
    return NextResponse.json({ version: savedVersion });
  } catch (error: any) {
    console.error("POST Artifact Versions Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}
