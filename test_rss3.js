import fetch from 'node-fetch';
import fs from 'fs';

const urls = [
    'https://www.sehrivangazetesi.com/rss',
    'https://www.vanpostasigazetesi.com/sitemap.xml',
    'https://www.vanpostasigazetesi.com/rss.xml',
    'https://www.gazetevan.com/rss.xml',
    'https://www.vanpostasigazetesi.com/sondakika.rss',
    'https://www.vanekspres.com.tr/rss',
    'https://www.vanekspres.com.tr/rss.xml'
];

async function run() {
    const results = await Promise.allSettled(urls.map(u =>
        fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(r => r.ok ? { url: u, status: 'OK' } : { url: u, status: 'HTTP_FAIL', code: r.status })
            .catch(e => ({ url: u, status: 'NETWORK_ERR', msg: e.message }))
    ));
    fs.writeFileSync('debug_urls2.json', JSON.stringify(results.map(r => r.value), null, 2));
}
run();
