// Pembungkus panggilan Gemini REST API (tanpa SDK) dengan timeout & 1x retry.
// API key hanya dibaca dari environment server, tidak pernah dikirim ke client.

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

export class GeminiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message)
  }
}

const TIMEOUT_MS = 20_000

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY)
}

export async function generateJson<T = unknown>(opts: {
  system: string
  parts: GeminiPart[]
  responseSchema: Record<string, unknown>
  temperature?: number
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new GeminiError('GEMINI_API_KEY belum diatur')

  const generationConfig: Record<string, unknown> = {
    responseMimeType: 'application/json',
    responseSchema: opts.responseSchema,
    temperature: opts.temperature ?? 0.3,
  }

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts: opts.parts }],
    generationConfig,
  })

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'

  const candidateModels = Array.from(new Set([
    primaryModel,
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
  ]))

  let lastError: unknown

  for (const currentModel of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent`

    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body,
          signal: controller.signal,
        })
        if (!res.ok) {
          const detail = await res.text().catch(() => '')
          console.warn(`[Gemini API HTTP ${res.status} on ${currentModel} full detail]:`, detail)
          // 404 (model tidak ada) atau 503 (overloaded) -> lanjut ke model berikutnya
          if (res.status === 404 || res.status === 503) {
            throw new GeminiError(`Model ${currentModel} status ${res.status}: ${detail}`, res.status)
          }
          if (res.status !== 429 && res.status < 500) {
            throw new GeminiError(`Gemini menolak permintaan (${res.status}): ${detail.slice(0, 200)}`, res.status)
          }
          throw new GeminiError(`Gemini error ${res.status}: ${detail.slice(0, 200)}`, res.status)
        }
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[]
        }
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
        if (!text) throw new GeminiError('Respons Gemini kosong')
        return JSON.parse(text) as T
      } catch (err) {
        lastError = err
        if (err instanceof GeminiError) {
          // Jika 404 atau 503, hentikan attempt pada model ini dan lanjut ke model cadangan berikutnya
          if (err.status === 404 || err.status === 503) break
          if (err.status && err.status !== 429 && err.status < 500) break
        }
        await new Promise((r) => setTimeout(r, 1000))
      } finally {
        clearTimeout(timer)
      }
    }
  }
  if (lastError instanceof GeminiError) throw lastError
  if (lastError instanceof Error && lastError.name === 'AbortError') throw new GeminiError('Gemini timeout (20 detik)')
  throw new GeminiError(lastError instanceof Error ? lastError.message : 'Gagal memanggil Gemini')
}

/** Pisahkan data URL "data:image/jpeg;base64,xxxx" menjadi mimeType + data. */
export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}
