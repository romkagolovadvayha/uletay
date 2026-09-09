export class RequestJsonError extends Error {
  constructor(message: string, public readonly status: 400 | 413) {
    super(message);
  }
}

/** Enforce the byte limit while reading, including requests without Content-Length. */
export async function readRequestJson(request: Request, maxBytes: number): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > maxBytes) {
    throw new RequestJsonError('Payload too large', 413);
  }
  if (!request.body) throw new RequestJsonError('Invalid JSON', 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestJsonError('Payload too large', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestJsonError('Invalid JSON', 400);
  }
}
