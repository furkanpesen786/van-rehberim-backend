import fetch from 'node-fetch'; // wait, node 24 has native fetch
import fs from 'fs';

const urls = [
    'https://www.sehrivan.com/rss',
    'https://www.wanhaber.com/rss',
    'https://www.vanolay.com/rss',
    'https://www.vanpostasigazetesi.com/rss',
    'https://www.vanhavadis.com/rss',
    'https://www.gazetevan.com/rss',
    'https://www.vanekspres.com/rss'
];

async function run() {
    const results = await Promise.allSettled(urls.map(u =>
        fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(r => r.ok ? { url: u, status: 'OK' } : { url: u, status: 'HTTP_FAIL', code: r.status })
            .catch(e => ({ url: u, status: 'NETWORK_ERR', msg: e.message }))
    ));
    fs.writeFileSync('debug_urls.json', JSON.stringify(results.map(r => r.value), null, 2));
}
run();
