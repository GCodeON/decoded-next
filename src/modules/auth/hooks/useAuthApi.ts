"use client";

export const useAuthApi = () => {
  const getToken = async (): Promise<string> => {
    const res = await fetch('/api/auth/token', { credentials: 'include' });
    const contentType = res.headers.get?.('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('unauthorized');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('unauthorized');
      if (res.status === 502) throw new Error('gateway');
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    return data.token as string;
  };

  const refresh = async (): Promise<void> => {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      if (res.status === 502) throw new Error('gateway');
      throw new Error(json.error || `HTTP ${res.status}`);
    }
  };

  return { getToken, refresh } as const;
};

export default useAuthApi;
