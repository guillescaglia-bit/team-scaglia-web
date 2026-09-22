// Mini-función (Vercel) que avisa por mail a los clientes VALIDADOS que hay un beneficio nuevo.
// Seguridad: solo la puede ejecutar el ADMIN (info@teamscaglia.com), verificado por su sesión.
// Modos:
//   - 'prueba' : manda el mail SOLO al admin (para ver cómo queda antes de largarlo).
//   - 'todos'  : manda a todos los clientes validados (que no se dieron de baja).

const SUPABASE_URL = 'https://fgipdqcxsbmrjvozalqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaXBkcWN4c2Jtcmp2b3phbHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzM2NzIsImV4cCI6MjA5NzkwOTY3Mn0.YjDJBcuzwp0_f3U976eGBtyVia1Uw01cjJbaSV3VlE0';
const ADMIN_EMAIL = 'info@teamscaglia.com';
const SITE = 'https://www.teamscaglia.com';
const UNSUB_MAILTO = 'mailto:info@teamscaglia.com?subject=Baja%20de%20avisos%20de%20beneficios';

function envoltorio(prestador) {
  const p = prestador;
  const banner = p.banner ? (p.banner.startsWith('http') ? p.banner : SITE + p.banner) : '';
  const descuento = p.descuento ? `${p.descuento}% OFF` : 'Beneficio exclusivo';
  return `
  <div style="background:#f4f4f5; padding:32px 0; font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="background:#253C64; padding:24px 32px; text-align:center;">
        <p style="margin:0; color:rgba(255,255,255,0.7); font-size:11px; letter-spacing:3px; text-transform:uppercase;">Team Scaglia · Programa de Beneficios</p>
        <h1 style="margin:8px 0 0; color:#ffffff; font-size:22px; font-weight:500;">Nuevo beneficio para vos 🎁</h1>
      </div>
      ${banner ? `<img src="${banner}" alt="${p.nombre || ''}" width="520" style="display:block; width:100%; max-width:520px; height:auto; border:0;">` : ''}
      <div style="padding:32px;">
        <div style="text-align:center; margin-bottom:18px;">
          <span style="display:inline-block; background:${p.color || '#253C64'}; color:#fff; font-size:26px; font-weight:bold; padding:8px 22px; border-radius:10px;">${descuento}</span>
        </div>
        <h2 style="text-align:center; color:#253C64; font-size:20px; margin:0 0 6px;">${p.icono || ''} ${p.nombre}</h2>
        <p style="text-align:center; font-size:14px; line-height:1.6; color:#555; margin:0 0 8px;">${p.descripcion || ''}</p>
        ${p.alcance ? `<p style="text-align:center; font-size:12px; color:#888; margin:0 0 18px;">📍 ${p.alcance}</p>` : '<div style="height:8px"></div>'}
        <div style="text-align:center; margin:22px 0 6px;">
          <a href="${SITE}/beneficios" style="display:inline-block; background:#253C64; color:#ffffff; text-decoration:none; padding:14px 34px; border-radius:8px; font-size:13px; letter-spacing:1px; text-transform:uppercase;">Generar mi cupón</a>
        </div>
        <p style="text-align:center; font-size:12px; color:#aaa; margin:16px 0 0;">Ingresá con tu email en el Programa de Beneficios y generá tu cupón.</p>
      </div>
      <div style="padding:18px 32px; border-top:1px solid #eee; text-align:center;">
        <p style="margin:0 0 4px; font-size:11px; color:#aaa;">Team Scaglia · Red Suma · teamscaglia.com</p>
        <p style="margin:0; font-size:11px; color:#bbb;">Recibís este mail porque estás registrado en el Programa de Beneficios. <a href="${UNSUB_MAILTO}" style="color:#999;">Darse de baja</a>.</p>
      </div>
    </div>
  </div>`;
}

async function enviarBatch(key, mails) {
  return fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mails),
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Falta configurar RESEND_API_KEY en el servidor' });

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Falta token de sesión' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const prestador = body.prestador || {};
  const modo = body.modo === 'todos' ? 'todos' : 'prueba';
  const incluirAgentes = body.incluirAgentes === true;
  const agentesEmails = Array.isArray(body.agentes) ? body.agentes : [];
  if (!prestador.nombre) return res.status(400).json({ error: 'Falta el beneficio a avisar' });

  // Verificar que quien llama es el ADMIN
  let user;
  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Sesión inválida' });
    user = await userResp.json();
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo verificar la sesión' });
  }
  if ((user.email || '').toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Solo el admin puede enviar avisos' });
  }

  // Armar destinatarios
  let destinatarios = [];
  if (modo === 'prueba') {
    destinatarios = [ADMIN_EMAIL];
  } else {
    // Traer clientes validados (RLS: el admin ve todos) usando SU token
    try {
      const hdrs = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
      // Intento con la columna no_avisos (para respetar bajas). Si no existe todavía, reintento sin ella.
      let r = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=email,validado,no_avisos&validado=eq.true`, { headers: hdrs });
      if (!r.ok) {
        r = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=email,validado&validado=eq.true`, { headers: hdrs });
      }
      if (!r.ok) return res.status(502).json({ error: 'No se pudo leer la lista de clientes' });
      const filas = await r.json();
      const set = new Set();
      for (const c of (filas || [])) {
        const em = (c.email || '').trim().toLowerCase();
        if (!em || !/^\S+@\S+\.\S+$/.test(em)) continue;
        if (c.no_avisos === true) continue;
        set.add(em);
      }
      // Sumar agentes del Team si se pidió
      if (incluirAgentes) {
        for (const a of agentesEmails) {
          const em = (a || '').trim().toLowerCase();
          if (em && /^\S+@\S+\.\S+$/.test(em)) set.add(em);
        }
      }
      destinatarios = Array.from(set);
    } catch (e) {
      return res.status(502).json({ error: 'No se pudo leer la lista de clientes' });
    }
  }

  if (!destinatarios.length) return res.status(200).json({ ok: true, enviados: 0, total: 0 });

  const html = envoltorio(prestador);
  const subject = prestador.descuento
    ? `Nuevo beneficio: ${prestador.nombre} · ${prestador.descuento}% OFF`
    : `Nuevo beneficio para vos: ${prestador.nombre}`;

  // Enviar en tandas de a 100 (límite del endpoint batch de Resend)
  let enviados = 0;
  const errores = [];
  for (let i = 0; i < destinatarios.length; i += 100) {
    const lote = destinatarios.slice(i, i + 100).map(to => ({
      from: 'Team Scaglia <info@teamscaglia.com>',
      to: [to],
      subject,
      html,
      headers: { 'List-Unsubscribe': `<${UNSUB_MAILTO}>` },
    }));
    try {
      const r = await enviarBatch(RESEND_API_KEY, lote);
      if (r.ok) { const j = await r.json().catch(() => null); enviados += (j && Array.isArray(j.data)) ? j.data.length : lote.length; }
      else { const t = await r.text().catch(() => ''); errores.push(`${r.status}: ${t.slice(0, 200)}`); }
    } catch (e) {
      errores.push(String(e));
    }
  }

  return res.status(200).json({ ok: true, modo, enviados, total: destinatarios.length, errores: errores.slice(0, 3) });
};
