import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/pdf-parser";
import { extractResumeData } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be under 5MB" },
        { status: 400 }
      );
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const rawText = await extractTextFromPdf(pdfBuffer);

    if (!rawText || rawText.length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract sufficient text from the PDF. Please ensure it is a text-based PDF (not a scanned image).",
        },
        { status: 400 }
      );
    }

    // Use Gemma to structure the extracted text
    const structuredJson = await extractResumeData(rawText);

    // Parse and validate
    let data;
    try {
      // Clean potential markdown code blocks from LLM output
      let cleaned = structuredJson.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      data = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse structured data from resume. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Resume parse error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
