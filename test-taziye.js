import axios from 'axios';
import https from 'https';

async function run() {
    const targetUrl = 'https://van.bel.tr/Taziyeler.html';
    const todayStr = 'TEST';
    try {
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const vanBelRes = await axios.get(targetUrl, {
            timeout: 10000, // 10 seconds timeout
            httpsAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
        });

        if (vanBelRes && vanBelRes.status === 200) {
            const html = String(vanBelRes.data);
            const blocks = html.split('<div class="qa-box">').slice(1);
            const parsedNotices = [];

            blocks.forEach((box, idx) => {
                const extract = (regex) => {
                    const match = box.match(regex);
                    if (match && match[1]) {
                        return match[1].replace(/<[^>]+>/g, '').trim();
                    }
                    return 'Bilinmiyor';
                };

                const name = extract(/class="qa-title">\s*([^<\n]+)/i);
                const date = extract(/<span>Vefat Tarihi<\/span>\s*:\s*(.*?)(?:<\/li>|<)/i);
                const place = extract(/<span>Taziye Yeri<\/span>\s*:\s*(.*?)(?:<\/li>|<)/i);
                const contact = extract(/<span>İletişim<\/span>\s*:\s*(.*?)(?:<\/li>|<)/i);
                const district = extract(/<span>İlçe<\/span>\s*:\s*(.*?)(?:<\/li>|<)/i);

                if (name && name !== 'Bilinmiyor') {
                    parsedNotices.push({
                        id: `vanbel-taziye-${idx}`,
                        fullName: name,
                        age: 'Vefat İlanı',
                        family: district === 'Bilinmiyor' ? 'Van' : district,
                        funeralPlace: place,
                        condolenceAddress: place,
                        date: date === 'Bilinmiyor' ? todayStr : date,
                        contactPhone: contact,
                        sourceUrl: targetUrl,
                    });
                }
            });
            console.log('SUCCESS:', parsedNotices.length);
            console.log(parsedNotices[0]);
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
run();
