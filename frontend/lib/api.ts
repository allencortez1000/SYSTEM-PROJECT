export async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return String(data?.error || data?.message || fallback);
  } catch {
    try {
      const text = await response.text();
      return text.trim() || fallback;
    } catch {
      return fallback;
    }
  }
}
