x// Health check — hit /api/health to verify serverless functions work
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    keyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.slice(0, 7) + "..." : "not set",
    node: process.version,
    time: new Date().toISOString(),
  });
}
