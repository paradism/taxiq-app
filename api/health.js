export const config = { runtime: "edge" };

export default function handler() {
  return Response.json({
    ok: true,
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    time: new Date().toISOString(),
  });
}
