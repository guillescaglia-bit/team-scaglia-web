const https = require('https');

function sendEmail(apiKey, payloadObj) {
    const payload = JSON.stringify(payloadObj);
    const options = {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
        },
    };
    return new Promise((resolve) => {
        const r = https.request(options, (resp) => {
            let data = '';
            resp.on('data', (c) => data += c);
            resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
        });
        r.on('error', (e) => resolve({ status: 0, body: e.message }));
        r.write(payload);
        r.end();
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta RESEND_API_KEY' });

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const nombre    = (body.nombre || '').toString().slice(0, 120);
    const email     = (body.email || '').toString().slice(0, 160);
    const telefono  = (body.telefono || '').toString().slice(0, 60);
    const consulta  = (body.consulta || '').toString().slice(0, 2000);
    const origen    = (body.origen || 'Formulario de contacto').toString().slice(0, 80);

    if (!nombre || !consulta) {
        return res.status(422).json({ error: 'Faltan datos (nombre y consulta)' });
    }

    const FROM = process.env.MAIL_FROM || 'Team Scaglia <info@teamscaglia.com>';
    const TO   = process.env.MAIL_TO   || 'info@teamscaglia.com';

    const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // ── Mail 1: aviso al equipo ──
    const htmlEquipo = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2a2a2a;">
            <div style="background: #253C64; padding: 24px; text-align: center;">
                <h1 style="color: #fff; font-size: 18px; margin: 0; letter-spacing: 1px;">NUEVO LEAD · TEAM SCAGLIA</h1>
            </div>
            <div style="padding: 24px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="font-size: 12px; color: #626970; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px;">${esc(origen)}</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 8px 0; color: #626970; width: 110px;">Nombre</td><td style="padding: 8px 0; font-weight: 600;">${esc(nombre)}</td></tr>
                    ${email ? `<tr><td style="padding: 8px 0; color: #626970;">Email</td><td style="padding: 8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>` : ''}
                    ${telefono ? `<tr><td style="padding: 8px 0; color: #626970;">Teléfono</td><td style="padding: 8px 0;"><a href="https://wa.me/${telefono.replace(/[^0-9]/g,'')}">${esc(telefono)}</a></td></tr>` : ''}
                </table>
                <div style="margin-top: 20px; padding: 16px; background: #f8f7f5; border-left: 3px solid #253C64;">
                    <p style="font-size: 12px; color: #626970; margin: 0 0 8px;">CONSULTA</p>
                    <p style="font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${esc(consulta)}</p>
                </div>
            </div>
            <p style="text-align: center; font-size: 11px; color: #999; margin-top: 16px;">Enviado automáticamente desde teamscaglia.com</p>
        </div>`;

    const r1 = await sendEmail(apiKey, {
        from: FROM,
        to: [TO],
        reply_to: email || undefined,
        subject: `Nuevo lead: ${nombre}`,
        html: htmlEquipo,
    });

    // ── Mail 2: confirmación al cliente (solo si dejó email) ──
    if (email && /\S+@\S+\.\S+/.test(email)) {
        const primerNombre = esc(nombre.split(' ')[0] || nombre);
        const htmlCliente = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2a2a2a;">
                <div style="background: #253C64; padding: 32px 24px; text-align: center;">
                    <h1 style="color: #fff; font-size: 22px; margin: 0; font-weight: 400; letter-spacing: 1px;">Team Scaglia</h1>
                    <p style="color: #8b9aaa; font-size: 11px; margin: 6px 0 0; letter-spacing: 2px; text-transform: uppercase;">Inversión Inmobiliaria</p>
                </div>
                <div style="padding: 32px 24px; border: 1px solid #e0e0e0; border-top: none;">
                    <p style="font-size: 16px; margin: 0 0 16px;">Hola ${primerNombre},</p>
                    <p style="font-size: 14px; line-height: 1.7; color: #444; margin: 0 0 16px;">
                        ¡Gracias por contactarte con <strong>Team Scaglia</strong>! Recibimos tu consulta y uno de nuestros agentes se va a comunicar con vos a la brevedad.
                    </p>
                    <p style="font-size: 14px; line-height: 1.7; color: #444; margin: 0 0 24px;">
                        Si necesitás una respuesta urgente, podés escribirnos directamente por WhatsApp.
                    </p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://wa.me/541130977868" style="display: inline-block; background: #25D366; color: #fff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 600; letter-spacing: 1px;">ESCRIBINOS POR WHATSAPP</a>
                    </div>
                </div>
                <div style="background: #0a0a0a; padding: 20px 24px; text-align: center;">
                    <p style="color: #888; font-size: 11px; margin: 0; line-height: 1.6;">Team Scaglia · Red Suma · Buenos Aires<br>info@teamscaglia.com · @teamscaglia</p>
                </div>
            </div>`;
        // No bloqueamos la respuesta si la confirmación falla
        await sendEmail(apiKey, {
            from: FROM,
            to: [email],
            subject: 'Recibimos tu consulta · Team Scaglia',
            html: htmlCliente,
        });
    }

    if (r1.status >= 200 && r1.status < 300) {
        return res.status(200).json({ ok: true });
    }
    return res.status(r1.status || 500).json({ error: 'Error al enviar', detail: (r1.body || '').slice(0, 300) });
};
