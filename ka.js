// Keep-alive por tráfico real: cuando alguien visita la web, "toca" Supabase para que
// el proyecto del plan gratis no se pause por inactividad. Complementa al cron de Vercel.
// Throttle: como mucho 1 vez cada 12h por navegador. Es fire-and-forget: no bloquea nada,
// no muestra nada, y si falla no pasa nada. Usa la clave anon (pública).
(function () {
  try {
    var KEY = 'ts_keepalive', now = Date.now(), last = +(localStorage.getItem(KEY) || 0);
    if (now - last < 12 * 3600 * 1000) return;   // ya se tocó hace menos de 12h
    localStorage.setItem(KEY, String(now));
  } catch (e) { /* sin localStorage: igual sigue y pinguea */ }
  try {
    var U = 'https://fgipdqcxsbmrjvozalqn.supabase.co/rest/v1/rpc/inversor_existe';
    var K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaXBkcWN4c2Jtcmp2b3phbHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzM2NzIsImV4cCI6MjA5NzkwOTY3Mn0.YjDJBcuzwp0_f3U976eGBtyVia1Uw01cjJbaSV3VlE0';
    fetch(U, {
      method: 'POST',
      headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_email: 'keepalive@teamscaglia.com' }),
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
})();
