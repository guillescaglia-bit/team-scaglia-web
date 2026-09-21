// Keep-alive de Supabase.
// Vercel lo llama solo una vez por dia (ver "crons" en vercel.json) y le hace
// una mini consulta a la base para que el proyecto GRATIS no se pause por inactividad.
// Se puede probar a mano entrando a: https://www.teamscaglia.com/api/keepalive

export default async function handler(req, res) {
  const URL = 'https://fgipdqcxsbmrjvozalqn.supabase.co';
  // anon key (publica, ya esta en el front) — solo puede tocar la base, no da acceso privilegiado
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaXBkcWN4c2Jtcmp2b3phbHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzM2NzIsImV4cCI6MjA5NzkwOTY3Mn0.YjDJBcuzwp0_f3U976eGBtyVia1Uw01cjJbaSV3VlE0';
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/inversor_existe`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_email: 'keepalive@teamscaglia.com' }),
    });
    return res.status(200).json({ ok: true, supabase: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e), at: new Date().toISOString() });
  }
}
