const https = require('https');

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const apiKey = process.env.REDSUMA_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key no configurada' });
    }

    const options = {
        hostname: 'app.redsuma.com.ar',
        path: '/api/v1/properties?status=ACTIVE&include=agent,images&pageSize=50',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + apiKey },
    };

    const proxyReq = https.request(options, function(proxyRes) {
        let body = '';
        proxyRes.on('data', function(chunk) { body += chunk; });
        proxyRes.on('end', function() {
            try {
                res.setHeader('Cache-Control', 's-maxage=300');
                res.status(proxyRes.statusCode).json(JSON.parse(body));
            } catch(e) {
                res.status(500).json({ error: 'Parse error', raw: body.slice(0, 300) });
            }
        });
    });

    proxyReq.on('error', function(e) {
        res.status(500).json({ error: e.message, code: e.code });
    });

    proxyReq.end();
};
