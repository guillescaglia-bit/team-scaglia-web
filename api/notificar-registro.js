// Mini-función (Vercel) que avisa cuando un cliente se registra (queda pendiente de validación):
//  - a INFO@: "hay un nuevo cliente pendiente" (con sus datos)
//  - al AGENTE asignado: "tu cliente se registró"
// Seguridad: solo se ejecuta si quien la llama está logueado con EL MISMO email que se está registrando.

const SUPABASE_URL = 'https://fgipdqcxsbmrjvozalqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaXBkcWN4c2Jtcmp2b3phbHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzM2NzIsImV4cCI6MjA5NzkwOTY3Mn0.YjDJBcuzwp0_f3U976eGBtyVia1Uw01cjJbaSV3VlE0';
const INFO_EMAIL = 'info@teamscaglia.com';
const ADMIN_URL = 'https://www.teamscaglia.com/beneficios';

async function enviarMail(key, to, subject, html) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Team Scaglia <info@teamscaglia.com>', to: [to], subject, html })
  });
}

function envoltorio(titulo, cuerpoHtml) {
  return `
  <div style="background:#f4f4f5; padding:32px 0; font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="background:#253C64; padding:28px 32px; text-align:center;">
        <p style="margin:0; color:rgba(255,255,255,0.7); font-size:11px; letter-spacing:3px; text-transform:uppercase;">Team Scaglia</p>
        <h1 style="margin:8px 0 0; color:#ffffff; font-size:22px; font-weight:500;">${titulo}</h1>
      </div>
      <div style="padding:32px;">${cuerpoHtml}</div>
      <div style="padding:18px 32px; border-top:1px solid #eee; text-align:center;">
        <p style="margin:0; font-size:11px; color:#aaa;">Team Scaglia · Red Suma · teamscaglia.com</p>
      </div>
    </div>
  </div>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Falta configurar RESEND_API_KEY en el servidor' });

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Falta token de sesión' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const nombre = (body.nombre || '').trim();
  const email = (body.email || '').trim();
  const telefono = (body.telefono || '').trim();
  const operacion = (body.operacion || '').trim();
  const direccion = (body.direccion || '').trim();
  // Soporta un array `agentes: [{nombre,email}]` o el formato viejo (agenteEmail/agenteNombre)
  let agentes = Array.isArray(body.agentes) ? body.agentes : [];
  if (!agentes.length && body.agenteEmail) agentes = [{ nombre: body.agenteNombre || '', email: body.agenteEmail }];
  const agenteNombre = agentes.map(a => (a && a.nombre) || '').filter(Boolean).join(', ');
  if (!email) return res.status(400).json({ error: 'Falta el email del cliente' });

  // Verificar que quien llama es el propio cliente recién registrado (su sesión coincide)
  let user;
  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Sesión inválida' });
    user = await userResp.json();
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo verificar la sesión' });
  }
  if ((user.email || '').toLowerCase() !== email.toLowerCase()) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const filaDato = (label, valor) => `<tr><td style="padding:6px 0; color:#888; font-size:13px; width:120px;">${label}</td><td style="padding:6px 0; color:#253C64; font-size:13px; font-weight:600;">${valor || '—'}</td></tr>`;

  // Mail a INFO@ (aviso de cliente pendiente, con todos los datos)
  const htmlInfo = envoltorio('Nuevo cliente pendiente', `
    <p style="font-size:14px; line-height:1.7; color:#444; margin:0 0 18px;">
      Se registró un nuevo cliente en el Programa de Beneficios y está <strong>pendiente de validación</strong>.
    </p>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      ${filaDato('Nombre', nombre)}
      ${filaDato('Email', email)}
      ${filaDato('Teléfono', telefono)}
      ${filaDato('Operación', operacion)}
      ${filaDato('Dirección', direccion)}
      ${filaDato('Agente', agenteNombre)}
    </table>
    <div style="text-align:center; margin:8px 0;">
      <a href="${ADMIN_URL}" style="display:inline-block; background:#253C64; color:#ffffff; text-decoration:none; padding:12px 30px; border-radius:8px; font-size:12px; letter-spacing:1px; text-transform:uppercase;">Ir a validar</a>
    </div>
  `);

  let enviados = 0;
  try { const r = await enviarMail(RESEND_API_KEY, INFO_EMAIL, `Nuevo cliente pendiente · ${nombre || email}`, htmlInfo); if (r.ok) enviados++; }
  catch (e) { /* seguimos */ }

  // Mail a cada AGENTE asignado
  for (const ag of agentes) {
    const agEmail = ((ag && ag.email) || '').trim();
    if (!agEmail) continue;
    const agNombre = ((ag && ag.nombre) || '').trim();
    const htmlAgente = envoltorio('Nuevo cliente registrado', `
      <p style="font-size:15px; color:#253C64; margin:0 0 14px;">Hola${agNombre ? ', ' + agNombre.split(' ')[0] : ''} 👋</p>
      <p style="font-size:14px; line-height:1.7; color:#444; margin:0;">
        Tu cliente <strong>${nombre || email}</strong> se registró en el Programa de Beneficios y quedó <strong>pendiente de validación</strong>.
        Te avisaremos cuando esté aprobado.
      </p>
    `);
    try { const r = await enviarMail(RESEND_API_KEY, agEmail, `Tu cliente ${nombre || ''} se registró · Beneficios`, htmlAgente); if (r.ok) enviados++; }
    catch (e) { /* seguimos */ }
  }

  return res.status(200).json({ ok: true, enviados });
};
