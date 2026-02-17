/**
 * Safe JSON parse for request bodies to avoid unhandled rejections.
 */
export async function safeParseJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    return null;
  }
}
