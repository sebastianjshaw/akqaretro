/** Ensure HttpOnly device cookie is set (mirrors localStorage voter id). */
export async function ensureDeviceCookie(deviceId: string): Promise<boolean> {
  if (!deviceId) return false;
  try {
    const res = await fetch("/api/device/bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ deviceId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
