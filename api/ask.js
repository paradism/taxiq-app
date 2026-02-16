// Vercel Edge Function — proxies AI requests to Anthropic
// Uses Web standard Request/Response (no CommonJS/ESM issues)

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  try {
    const { system, messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages required" }, { status: 400 });
    }

    // Sanitize input
    const cleanMessages = messages.slice(-20).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.slice(0, 4000) : "",
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: typeof system === "string" ? system.slice(0, 2000) : "",
        messages: cleanMessages,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Anthropic API error ${response.status}:`, errText);
      return Response.json({ error: "AI service error", status: response.status }, { status: 502 });
    }

    const data = await response.json();

    // Extract text content only
    const text = data.content
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n");

    return Response.json({ text }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    console.error("Proxy error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
