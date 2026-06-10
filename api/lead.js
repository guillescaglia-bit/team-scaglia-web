const https = require('https');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta RESEND_API_KEY' });

    // Parsear body (Vercel ya lo parsea si es JSON, pero por las dudas)
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

    const FROM = process.env.MAIL_FROM || 'Team Scaglia <web@teamscaglia.com>';
    const TO   = process.env.MAIL_TO   || 'info@teamscaglia.com';

    const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2a2a2a;">
            <div style="background: #253C64; padding: 24px; text-align: center;">
                <h1 style="color: #fff; font-size: 18px; margin: 0; letter-spacing: 1px;">NUEVO LEAD · TEAM SCAGLIA</h1>
            </div>
            <div style="padding: 24px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="font-size: 12px; color: #626970; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px;">${esc(origen)}</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 8px 0; color: #626970; width: 110px;">Nombre</td><td style="padding: 8px 0; font-weight: 600;">${esc(nombre)}</td></tr>
                    <tr><td style="padding: 8px 0; color: #626970;">Email</td><td style="padding: 8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
                    ${telefono ? `<tr><td style="padding: 8px 0; color: #626970;">Teléfono</td><td style="padding: 8px 0;"><a href="https://wa.me/${telefono.replace(/[^0-9]/g,'')}">${esc(telefono)}</a></td></tr>` : ''}
                </table>
                <div style="margin-top: 20px; padding: 16px; background: #f8f7f5; border-left: 3px solid #253C64;">
                    <p style="font-size: 12px; color: #626970; margin: 0 0 8px;">CONSULTA</p>
                    <p style="font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${esc(consulta)}</p>
                </div>
            </div>
            <p style="text-align: center; font-size: 11px; color: #999; margin-top: 16px;">Enviado automáticamente desde teamscaglia.com</p>
        </div>`;

    const payload = JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email || undefined,
        subject: `Nuevo lead: ${nombre}`,
        html,
    });

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
            resp.on('end', () => {
                if (resp.statusCode >= 200 && resp.statusCode < 300) {
                    res.status(200).json({ ok: true });
                } else {
                    res.status(resp.statusCode).json({ error: 'Error al enviar', detail: data.slice(0, 300) });
                }
                resolve();
            });
        });
        r.on('error', (e) => { res.status(500).json({ error: e.message }); resolve(); });
        r.write(payload);
        r.end();
    });
};
