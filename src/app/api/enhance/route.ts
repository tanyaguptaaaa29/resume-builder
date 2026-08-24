import { NextRequest, NextResponse } from "next/server";
import { enhanceContent } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, section } = body;

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Resume data is required" },
        { status: 400 }
      );
    }

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section to enhance is required" },
        { status: 400 }
      );
    }

    const resumeJson = typeof data === "string" ? data : JSON.stringify(data);
    const enhancedJson = await enhanceContent(resumeJson, section);

    // Parse the enhanced data
    let enhanced;
    try {
      let cleaned = enhancedJson.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }
      enhanced = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse enhanced data. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: enhanced });
  } catch (error) {
    console.error("Enhancement error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
