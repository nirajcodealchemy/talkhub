import { createClient } from "@/src/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type AIMessage = {
  sender: string;
  content: string;
  created_at?: string;
};

type RequestBody = {
  task: "reply" | "summary";
  messages: AIMessage[];
};

export async function POST(request: NextRequest) {
  try {
    // Verify Supabase authentication
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing from environment variables." },
        { status: 500 },
      );
    }

    const body: RequestBody = await request.json();
    const { task, messages } = body;

    if (!["reply", "summary"].includes(task)) {
      return NextResponse.json({ error: "Invalid AI task." }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided." },
        { status: 400 },
      );
    }

    const conversation = messages
      .map((message) => `${message.sender}: ${message.content}`)
      .join("\n");

    const prompt =
      task === "reply"
        ? `You are an AI assistant helping someone reply to a chat conversation.

Analyze this conversation:
${conversation}

Generate exactly 3 short, natural, context-aware reply suggestions.

Return ONLY valid JSON in this format:
{
  "suggestions": [
    "First reply",
    "Second reply",
    "Third reply"
  ]
}

Do not include markdown or explanations.`
        : `You are an assistant that summarizes chat conversations.

Summarize the following conversation from the last 48 hours:
${conversation}

Include these sections:

**Main topics discussed:**
**Important decisions or updates:**
**Questions that need answers:**
**Any pending tasks or follow-ups:**

Formatting rules:
- Return the summary using Markdown.
- Use **bold** for each section heading.
- Do not display literal asterisks as text.
- Keep the summary clear and concise.

Make the summary clear and concise.`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            ...(task === "reply" && {
              responseMimeType: "application/json",
            }),
          },
        }),
      },
    );

    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", result);

      return NextResponse.json(
        {
          error: result.error?.message || "Gemini API request failed.",
        },
        { status: 502 },
      );
    }

    const generatedText = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!generatedText) {
      throw new Error("Gemini returned an empty response.");
    }

    if (task === "reply") {
      const parsed = JSON.parse(generatedText);

      const suggestions = parsed.suggestions;

      if (
        !Array.isArray(suggestions) ||
        suggestions.length !== 3 ||
        !suggestions.every((item: unknown) => typeof item === "string")
      ) {
        throw new Error("Gemini returned an invalid suggestions format.");
      }

      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({
      summary: generatedText,
    });
  } catch (error) {
    console.error("Gemini route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate AI response.",
      },
      { status: 500 },
    );
  }
}
