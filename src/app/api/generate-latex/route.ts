import { NextRequest, NextResponse } from "next/server";
import { generateLatex } from "@/lib/gemini";
import { compileLatex } from "@/lib/latex-compiler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, template } = body;

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Resume data is required" },
        { status: 400 }
      );
    }

    if (!template || !["college", "offcampus"].includes(template)) {
      return NextResponse.json(
        { success: false, error: "Valid template type is required (college or offcampus)" },
        { status: 400 }
      );
    }

    // Phase 2: Generate LaTeX using Gemini 2.5 Flash
    const resumeJson = typeof data === "string" ? data : JSON.stringify(data);
    let texContent = await generateLatex(resumeJson, template);

    // Clean potential markdown code blocks
    texContent = texContent.trim();
    if (texContent.startsWith("```")) {
      texContent = texContent
        .replace(/^```(?:latex|tex)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    // Compile LaTeX to PDF via LaTeX.Online
    const result = await compileLatex(texContent);

    if (!result.success || !result.pdf) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to compile LaTeX to PDF",
          texContent, // Return the .tex source for debugging
        },
        { status: 500 }
      );
    }

    // Return PDF as binary
    return new NextResponse(new Uint8Array(result.pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="resume.pdf"',
        "Content-Length": result.pdf.length.toString(),
      },
    });
  } catch (error) {
    console.error("Generate LaTeX error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
