// Mini-función (Vercel) que envía el mail "ya podés acceder" cuando el admin aprueba un cliente.
// Seguridad: solo se ejecuta si quien la llama está logueado como admin (verificado contra Supabase).
// La llave de Resend vive en una variable de entorno secreta (RESEND_API_KEY), nunca en el navegador.

const SUPABASE_URL = 'https://fgipdqcxsbmrjvozalqn.supabase.co';
// anon key: es pública por diseño (segura de tener acá)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaXBkcWN4c2Jtcmp2b3phbHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzM2NzIsImV4cCI6MjA5NzkwOTY3Mn0.YjDJBcuzwp0_f3U976eGBtyVia1Uw01cjJbaSV3VlE0';
const ADMIN_EMAIL = 'info@teamscaglia.com';
const BENEFICIOS_URL = 'https://www.teamscaglia.com/beneficios';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Falta configurar RESEND_API_KEY en el servidor' });

  // 1) Verificar que quien llama es el admin (por su token de sesión de Supabase)
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Falta token de sesión' });

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
  if ((user.email || '').toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  // 2) Leer datos del cliente a notificar
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = (body.email || '').trim();
  const nombre = (body.nombre || '').trim();
  if (!email) return res.status(400).json({ error: 'Falta el email del cliente' });

  const primerNombre = nombre.split(' ')[0] || 'Hola';

  // 3) Armar y enviar el mail con Resend (desde info@teamscaglia.com)
  const html = `
  <div style="background:#f4f4f5; padding:32px 0; font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="background:#253C64; padding:28px 32px; text-align:center;">
        <p style="margin:0; color:rgba(255,255,255,0.7); font-size:11px; letter-spacing:3px; text-transform:uppercase;">Team Scaglia</p>
        <h1 style="margin:8px 0 0; color:#ffffff; font-size:22px; font-weight:500;">Programa de Beneficios</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-size:16px; color:#253C64; margin:0 0 16px;">¡Hola, ${primerNombre}! 👋</p>
        <p style="font-size:14px; line-height:1.7; color:#444; margin:0 0 16px;">
          Tu cuenta del <strong>Programa de Beneficios Team Scaglia</strong> fue <strong>aprobada</strong>.
          Ya podés ingresar y empezar a generar tus cupones de descuento en las marcas seleccionadas.
        </p>
        <div style="text-align:center; margin:28px 0;">
          <a href="${BENEFICIOS_URL}" style="display:inline-block; background:#253C64; color:#ffffff; text-decoration:none; padding:14px 34px; border-radius:8px; font-size:13px; letter-spacing:1px; text-transform:uppercase;">Entrar a mis beneficios</a>
        </div>
        <p style="font-size:13px; line-height:1.7; color:#777; margin:0;">
          Para ingresar, usá este mismo email y te enviaremos un código de acceso.
        </p>
      </div>
      <div style="padding:18px 32px; border-top:1px solid #eee; text-align:center;">
        <p style="margin:0; font-size:11px; color:#aaa;">Team Scaglia · Red Suma · teamscaglia.com</p>
      </div>
    </div>
  </div>`;

  try {
    const sendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Team Scaglia <info@teamscaglia.com>',
        to: [email],
        subject: '¡Ya podés acceder a tus beneficios! · Team Scaglia',
        html
      })
    });
    if (!sendResp.ok) {
      const detail = await sendResp.text();
      return res.status(502).json({ error: 'Resend rechazó el envío', detail });
    }
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo enviar el mail' });
  }

  return res.status(200).json({ ok: true });
};
