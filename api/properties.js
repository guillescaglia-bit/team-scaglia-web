module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.REDSUMA_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key no configurada' });
    }

    try {
        const url = 'https://app.redsuma.com.ar/api/v1/properties?status=ACTIVE&include=agent,images&pageSize=50';

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
