// Mini-función (Vercel) que le manda al CLIENTE su cupón por mail apenas lo genera,
// para que lo tenga a mano sin tener que entrar a la plataforma.
// Seguridad: solo se ejecuta si quien la llama está logueado con EL MISMO email del cupón.

const SUPABASE_URL = 'https://fgipdqcxsbmrjvozalqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaXBkcWN4c2Jtcmp2b3phbHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzM2NzIsImV4cCI6MjA5NzkwOTY3Mn0.YjDJBcuzwp0_f3U976eGBtyVia1Uw01cjJbaSV3VlE0';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Falta configurar RESEND_API_KEY en el servidor' });

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Falta token de sesión' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = (body.email || '').trim();
  const nombre = (body.nombre || '').trim();
  const codigo = (body.codigo || '').trim();
  const prestadorNombre = (body.prestadorNombre || '').trim();
  const descuento = body.descuento;
  const venceEn = body.venceEn;
  if (!email || !codigo) return res.status(400).json({ error: 'Faltan datos del cupón' });

  // Verificar que quien pide es el dueño del cupón (su sesión coincide con el email)
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

  const primerNombre = nombre.split(' ')[0] || 'Hola';
  let venceTxt = '';
  try { if (venceEn) venceTxt = new Date(venceEn).toLocaleDateString('es-AR'); } catch (e) {}
  const descTxt = (descuento || descuento === 0) ? `${descuento}% OFF` : 'tu beneficio';

  const html = `
  <div style="background:#f4f4f5; padding:32px 0; font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="background:#253C64; padding:28px 32px; text-align:center;">
        <p style="margin:0; color:rgba(255,255,255,0.7); font-size:11px; letter-spacing:3px; text-transform:uppercase;">Team Scaglia</p>
        <h1 style="margin:8px 0 0; color:#ffffff; font-size:22px; font-weight:500;">Tu cupón está listo</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-size:16px; color:#253C64; margin:0 0 16px;">¡Hola, ${primerNombre}! 👋</p>
        <p style="font-size:14px; line-height:1.7; color:#444; margin:0 0 20px;">
          Generaste tu cupón de <strong>${descTxt}</strong> en <strong>${prestadorNombre}</strong>. Guardalo: este es tu código.
        </p>
        <div style="background:#f4f7fb; border:2px dashed #253C64; border-radius:12px; padding:22px; text-align:center; margin:0 0 20px;">
          <p style="margin:0 0 6px; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#888;">Tu código</p>
          <p style="margin:0; font-size:26px; font-weight:700; letter-spacing:2px; color:#253C64; font-family:monospace;">${codigo}</p>
        </div>
        ${venceTxt ? `<p style="font-size:13px; color:#777; margin:0 0 16px; text-align:center;">Válido hasta el <strong>${venceTxt}</strong></p>` : ''}
        <p style="font-size:14px; line-height:1.7; color:#444; margin:0;">
          <strong>¿Cómo usarlo?</strong> Mostrá este código en <strong>${prestadorNombre}</strong> al momento de tu compra o reserva para aplicar el descuento.
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
        subject: `Tu cupón de ${prestadorNombre} · Team Scaglia`,
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
