/**
 * Server-only module for extracting raw text from PDF buffers.
 * Uses unpdf which is specifically built for serverless environments
 * (no DOMMatrix / browser API dependencies).
 */
import { extractText, getDocumentProxy } from "unpdf"

export async function extractTextFromPdfBase64(
  base64: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64")
  return extractTextFromBuffer(buffer)
}

export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return text
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
