const Jimp = require('jimp');
const fs = require('fs');

async function run() {
    const iconImg = await Jimp.read('C:/Users/FURKAN/.gemini/antigravity/brain/a2401070-70ab-4b2d-88f9-c508a5374938/uploaded_image_1785789190657.png');

    const mipmaps = [
        { dir: 'mipmap-mdpi', size: 48 },
        { dir: 'mipmap-hdpi', size: 72 },
        { dir: 'mipmap-xhdpi', size: 96 },
        { dir: 'mipmap-xxhdpi', size: 144 },
        { dir: 'mipmap-xxxhdpi', size: 192 },
        // for android 8+ adaptive icons foreground
        { dir: 'mipmap-mdpi', size: 108, isFg: true },
        { dir: 'mipmap-hdpi', size: 162, isFg: true },
        { dir: 'mipmap-xhdpi', size: 216, isFg: true },
        { dir: 'mipmap-xxhdpi', size: 324, isFg: true },
        { dir: 'mipmap-xxxhdpi', size: 432, isFg: true }
    ];

    for (const m of mipmaps) {
        const p = `./android/app/src/main/res/${m.dir}`;
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });

        const scaled = iconImg.clone().resize(m.size, m.size);

        if (m.isFg) {
            await scaled.writeAsync(`${p}/ic_launcher_foreground.png`);
            // create a matching transparent background just in case
            const bg = await new Jimp(m.size, m.size, 0x00000000);
            await bg.writeAsync(`${p}/ic_launcher_background.png`);
        } else {
            await scaled.writeAsync(`${p}/ic_launcher.png`);
            await scaled.writeAsync(`${p}/ic_launcher_round.png`);
        }
    }

    console.log('Forced overwritten all mipmap icons!');
}

run().catch(console.error);
