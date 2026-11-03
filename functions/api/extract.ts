// Cloudflare Pages Function — secure Gemini proxy.
// The browser sends { parts, generationConfig }; this server injects the API key
// (stored as the GEMINI_API_KEY secret in Cloudflare) so it never ships to clients.

interface Env {
  GEMINI_API_KEY: string
}

const MODEL = 'gemini-2.5-flash'
const MAX_BODY_BYTES = 8 * 1024 * 1024 // receipt photos are sent as base64

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function onRequestPost(context: {
  request: Request
  env: Env
}): Promise<Response> {
  const { request, env } = context

  // Only the app itself may use this proxy (it spends the owner's Gemini quota), and the
  // request size is capped so it can't be used to push arbitrarily large payloads.
  const origin = request.headers.get('Origin')
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'Forbidden' }, 403)
  const declaredLength = Number(request.headers.get('Content-Length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413)

  if (!env.GEMINI_API_KEY) return json({ error: 'AI is not configured on the server' }, 500)

  try {
    const body = (await request.json()) as { parts?: unknown; generationConfig?: unknown }
    if (!body.parts) return json({ error: 'Missing parts' }, 400)

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: body.parts }],
          generationConfig: body.generationConfig ?? { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      },
    )

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    if (!res.ok) return json({ error: `AI error ${res.status}` }, 502)

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string') return json({ error: 'Empty AI response' }, 502)
    return json({ text })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Proxy error' }, 500)
  }
}
