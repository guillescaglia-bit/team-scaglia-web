const https = require('https');

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    const slug = req.query.slug;
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    const options = {
        hostname: 'propiedades.redsuma.com.ar',
        path: '/a/' + slug,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html',
        },
    };

    const proxyReq = https.request(options, function(proxyRes) {
        let body = '';
        proxyRes.on('data', function(chunk) { body += chunk; });
        proxyRes.on('end', function() {
            try {
                const properties = parseProperties(body);
                const agentName  = parseAgentName(body);
                res.status(200).json({ agentName, properties });
            } catch(e) {
                res.status(500).json({ error: e.message });
            }
        });
    });

    proxyReq.on('error', function(e) {
        res.status(500).json({ error: e.message });
    });

    proxyReq.end();
};

function parseAgentName(html) {
    const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    return m ? m[1].trim() : '';
}

function parseProperties(html) {
    const properties = [];

    // Extraer todos los bloques de propiedades
    // Cada card tiene: imagen, tipo, precio, dirección, barrio, operación
    const imageRegex = /https:\/\/imagedelivery\.net\/[^\s"'\\]+\/public/g;
    const thumbRegex = /https:\/\/imagedelivery\.net\/[^\s"'\\]+\/thumbnail/g;

    const images = [...html.matchAll(imageRegex)].map(m => m[0]);
    const thumbs = [...html.matchAll(thumbRegex)].map(m => m[0]);

    // Extraer precios (USD X.XXX o $ X.XXX.XXX)
    const priceRegex = /(?:USD|ARS|\$)\s*[\d\.,]+(?:\s*(?:USD|ARS))?/g;
    const prices = [...html.matchAll(priceRegex)].map(m => m[0].trim());

    // Extraer tipo de operación (Venta/Alquiler)
    const opRegex = /<span[^>]*>\s*(Venta|Alquiler temporal|Alquiler)\s*<\/span>/g;
    const ops = [...html.matchAll(opRegex)].map(m => m[1].trim());

    // Extraer tipo de propiedad
    const typeRegex = /<span[^>]*>\s*(Casa|Departamento|PH|Local Comercial|Oficina|Terreno|Lote|Cochera|Monoambiente)\s*<\/span>/g;
    const types = [...html.matchAll(typeRegex)].map(m => m[1].trim());

    // Extraer títulos/addresses (h3 con line-clamp)
    const titleRegex = /<h3[^>]*line-clamp[^>]*>([^<]+)<\/h3>/g;
    const titles = [...html.matchAll(titleRegex)].map(m => m[1].trim());

    // Extraer barrios/ubicaciones
    const neighborhoodRegex = /class="[^"]*text-gray-500[^"]*">\s*<svg[^>]*>.*?<\/svg>\s*([^<]+)<\//gs;
    const neighborhoods = [...html.matchAll(neighborhoodRegex)].map(m => m[1].trim()).filter(n => n.length > 1);

    // Extraer estado (Reservada, En negociación, etc)
    const statusRegex = /<span[^>]*>\s*(Reservada|En negociación|En negociacion)\s*<\/span>/gi;
    const statuses = [...html.matchAll(statusRegex)].map(m => m[1].trim());

    const count = Math.max(titles.length, prices.length, thumbs.length);

    for (let i = 0; i < count; i++) {
        properties.push({
            title:     titles[i]         || '',
            price:     prices[i * 2]     || prices[i] || '',
            expenses:  prices[i * 2 + 1] || '',
            operation: ops[i]            || '',
            type:      types[i]          || '',
            image:     images[i]         || thumbs[i] || '',
            thumbnail: thumbs[i]         || '',
            neighborhood: neighborhoods[i] || '',
            status:    statuses[i]       || '',
        });
    }

    return properties.filter(p => p.title || p.price);
}
