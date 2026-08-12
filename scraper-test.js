import fs from 'fs';
const html = fs.readFileSync('taziyeler.html', 'utf8');

const blocks = html.split('<div class="qa-box">').slice(1);
const parsed = [];

blocks.forEach(b => {
    // Basic extraction logic
    const extract = (regex) => {
        const match = b.match(regex);
        if (match && match[1]) {
            return match[1].replace(/<[^>]+>/g, '').trim();
        }
        return 'Bilinmiyor';
    };

    const name = extract(/class="qa-title">\s*([^<]+)/i);
    const date = extract(/Vefat Tarihi\s*:\s*(?:<\/span>)?\s*([^<]+)/i);
    const place = extract(/Taziye Yeri\s*:\s*(?:<\/span>)?\s*([^<]+)/i);
    const contact = extract(/İletişim\s*:\s*(?:<\/span>)?\s*([^<]+)/i);
    const district = extract(/İlçe\s*:\s*(?:<\/span>)?\s*([^<]+)/i);

    if (name && name !== 'Bilinmiyor') {
        parsed.push({ name, date, place, contact, district });
    }
});

console.log('Found:', parsed.length);
if (parsed.length) console.log(parsed[0]);
