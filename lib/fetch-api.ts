/** Safe fetch wrapper — always returns JSON and never throws on parse errors. */
export async function fetchApi<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      ...options,
    });

    let data: T;
    try {
      data = await res.json();
    } catch {
      data = {
        error: `Server error (${res.status})`,
      } as T;
    }

    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "Network error. Check your connection." } as T,
    };
  }
}
