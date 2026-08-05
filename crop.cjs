const Jimp = require('jimp');
const fs = require('fs');

function rgbToHex(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
}

// Simple BFS flood fill
function floodFill(image, startX, startY, matchColorPredicate, replaceColorValue) {
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    const queue = [{ x: startX, y: startY }];
    const visited = new Set();

    if (!matchColorPredicate(Jimp.intToRGBA(image.getPixelColor(startX, startY)))) return;

    const getIdx = (x, y) => y * w + x;

    while (queue.length > 0) {
        const { x, y } = queue.pop();
        const idx = getIdx(x, y);
        if (visited.has(idx)) continue;
        visited.add(idx);

        const color = Jimp.intToRGBA(image.getPixelColor(x, y));
        if (matchColorPredicate(color)) {
            image.setPixelColor(replaceColorValue, x, y);
            if (x > 0) queue.push({ x: x - 1, y });
            if (x < w - 1) queue.push({ x: x + 1, y });
            if (y > 0) queue.push({ x, y: y - 1 });
            if (y < h - 1) queue.push({ x, y: y + 1 });
        }
    }
}

async function run() {
    const imgPath = 'C:/Users/FURKAN/.gemini/antigravity/brain/a2401070-70ab-4b2d-88f9-c508a5374938/uploaded_image_1785786273076.png';
    const image = await Jimp.read(imgPath);

    const w = image.bitmap.width;
    const h = image.bitmap.height;

    // 1. Find the gap before the text
    let top = h, bottom = 0, left = w, right = 0;
    let textTopY = h;
    for (let y = h - 1; y >= 0; y--) {
        let hasNonWhite = false;
        for (let x = 0; x < w; x++) {
            const c = Jimp.intToRGBA(image.getPixelColor(x, y));
            if (c.a > 10 && (c.r < 240 || c.g < 240 || c.b < 240)) {
                hasNonWhite = true;
                break;
            }
        }
        if (y < h * 0.9 && !hasNonWhite) {
            textTopY = y;
            break;
        }
    }

    // 2. Find bounding box of logo above text
    for (let y = 0; y < textTopY; y++) {
        for (let x = 0; x < w; x++) {
            const c = Jimp.intToRGBA(image.getPixelColor(x, y));
            if (c.a > 10 && (c.r < 240 || c.g < 240 || c.b < 240)) {
                if (y < top) top = y;
                if (y > bottom) bottom = y;
                if (x < left) left = x;
                if (x > right) right = x;
            }
        }
    }

    // 3. Crop
    image.crop(left, top, right - left, bottom - top);

    // 4. Sample light blue color from top-center background of logo
    const sampleColor = Jimp.intToRGBA(image.getPixelColor(Math.floor((right - left) / 2), 5));
    const hexBlue = rgbToHex(sampleColor.r, sampleColor.g, sampleColor.b);
    const replaceColor = Jimp.rgbaToInt(sampleColor.r, sampleColor.g, sampleColor.b, 255);
    console.log(`Detected Background Color: ${hexBlue}`);

    // 5. Flood fill the white/transparent corners to perfectly square the logo
    const isWhiteIsh = (c) => c.a < 10 || (c.r > 240 && c.g > 240 && c.b > 240);

    const cw = image.bitmap.width, ch = image.bitmap.height;
    floodFill(image, 0, 0, isWhiteIsh, replaceColor);
    floodFill(image, cw - 1, 0, isWhiteIsh, replaceColor);
    floodFill(image, 0, ch - 1, isWhiteIsh, replaceColor);
    floodFill(image, cw - 1, ch - 1, isWhiteIsh, replaceColor);

    // Remove any remaining stray white pixels directly on the very outer 1px borders
    for (let x = 0; x < cw; x++) {
        if (isWhiteIsh(Jimp.intToRGBA(image.getPixelColor(x, 0)))) image.setPixelColor(replaceColor, x, 0);
        if (isWhiteIsh(Jimp.intToRGBA(image.getPixelColor(x, ch - 1)))) image.setPixelColor(replaceColor, x, ch - 1);
    }
    for (let y = 0; y < ch; y++) {
        if (isWhiteIsh(Jimp.intToRGBA(image.getPixelColor(0, y)))) image.setPixelColor(replaceColor, 0, y);
        if (isWhiteIsh(Jimp.intToRGBA(image.getPixelColor(cw - 1, y)))) image.setPixelColor(replaceColor, cw - 1, y);
    }

    if (!fs.existsSync('./assets')) fs.mkdirSync('./assets');
    await image.writeAsync('./assets/icon.png');
    await image.writeAsync('./assets/splash.png');
    console.log('SUCCESS_CROP');
}

run().catch(console.error);
