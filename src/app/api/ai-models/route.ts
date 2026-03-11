import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No GEMINI_API_KEY" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // @ts-expect-error - listModels not in types but exists in API
    const result = await genAI.listModels();
    const models: string[] = [];
    for await (const model of result) {
      models.push(model.name);
    }
    return NextResponse.json({ models });
  } catch (err: unknown) {
    // Fallback: try fetching directly from REST API
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      const data = await res.json();
      const names = (data.models ?? []).map((m: { name: string }) => m.name);
      return NextResponse.json({ models: names });
    } catch {
      return NextResponse.json({
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
}
