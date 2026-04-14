/**
 * Server-only module for extracting raw text from PDF buffers.
 * Uses pdf-parse under the hood (listed in serverExternalPackages).
 */

export async function extractTextFromPdfBase64(
  base64: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64")
  return extractTextFromBuffer(buffer)
}

export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  // Dynamic import to keep this server-only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule = await import("pdf-parse") as any
  const pdfParse = pdfModule.default ?? pdfModule
  const data = await pdfParse(buffer)
  return data.text
}

export async function extractTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) {
    throw new Error(`Blob-Download fehlgeschlagen: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  return extractTextFromBuffer(buffer)
}
