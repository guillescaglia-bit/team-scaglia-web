const https = require('https');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.REDSUMA_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key no configurada', hasKey: false });
    }

    return new Promise((resolve) => {
        const options = {
            hostname: 'app.redsuma.com.ar',
            path: '/api/v1/properties?status=ACTIVE&include=agent,images&pageSize=50',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        };

        const req2 = https.request(options, (response) => {
            let body = '';
            response.on('data', (chunk) => { body += chunk; });
            response.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
                    res.status(response.statusCode).json(data);
                    resolve();
                } catch (e) {
                    res.status(500).json({ error: 'Error parseando respuesta', raw: body.substring(0, 200) });
                    resolve();
                }
            });
        });

        req2.on('error', (e) => {
            res.status(500).json({ error: e.message, code: e.code });
            resolve();
        });

        req2.end();
    });
};
