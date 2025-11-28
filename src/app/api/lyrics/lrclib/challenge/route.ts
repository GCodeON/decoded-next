export async function POST() {
  try {
    const res = await fetch('https://lrclib.net/api/request-challenge', { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ ok: false, status: res.status, payload: json }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ ok: true, payload: json }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, code: 'challenge_error', message: err?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
