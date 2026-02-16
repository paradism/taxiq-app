export const config = {
  runtime: "edge",
};

export default async function handler(req) {
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
        max_tokens: 2048,
        system: typeof system === "string" ? system.slice(0, 2000) : "",
        messages: cleanMessages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return Response.json({
        error: `Anthropic ${response.status}: ${errBody}`,
      }, {
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await response.json();

    const text = data.content
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n");

    return Response.json({ text }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    return Response.json({ error: `Proxy error: ${err.message}` }, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
