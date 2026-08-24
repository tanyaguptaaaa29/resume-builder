import { NextRequest, NextResponse } from "next/server";
import { chatWithUser } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Get response from Gemma
    const reply = await chatWithUser(messages);

    // Check if the extraction is complete
    const isComplete = reply.includes("[EXTRACTION_COMPLETE]");

    let data = null;
    let cleanReply = reply;

    if (isComplete) {
      // Extract the JSON after [EXTRACTION_COMPLETE]
      const jsonPart = reply.split("[EXTRACTION_COMPLETE]")[1]?.trim();
      if (jsonPart) {
        try {
          let cleaned = jsonPart;
          if (cleaned.startsWith("```")) {
            cleaned = cleaned
              .replace(/^```(?:json)?\n?/, "")
              .replace(/\n?```$/, "");
          }
          data = JSON.parse(cleaned);
        } catch {
          // If JSON parsing fails, ask again
          cleanReply =
            "I have all your information. Let me organize it — one moment please...";
        }
      }
      // Clean the reply to remove the JSON part
      cleanReply = reply.split("[EXTRACTION_COMPLETE]")[0]?.trim() ||
        "Great! I have all your information. Generating your resume now...";
    }

    return NextResponse.json({
      success: true,
      reply: cleanReply,
      isComplete,
      data,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
