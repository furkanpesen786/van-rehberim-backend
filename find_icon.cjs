const Jimp = require('jimp');
const fs = require('fs');

async function run() {
    const imgPath = 'C:/Users/FURKAN/.gemini/antigravity/brain/a2401070-70ab-4b2d-88f9-c508a5374938/uploaded_image_1785788768030.jpg';
    const image = await Jimp.read(imgPath);
    const w = image.bitmap.width;
    const h = image.bitmap.height;

    // The icon is in the top left. Let's find the bounding box of non-white pixels in the top-left area.
    // Actually, the presentation board might have a light background, not pure white.
    // Let's sample (0,0) as the background color.
    const bgC = Jimp.intToRGBA(image.getPixelColor(0, 0));

    const isBg = (r, g, b) => Math.abs(r - bgC.r) < 15 && Math.abs(g - bgC.g) < 15 && Math.abs(b - bgC.b) < 15;

    let left = w, right = 0, top = h, bottom = 0;

    // Search the top-left quadrant (x < w/2, y < h/2) for the icon bounding box.
    for (let y = 0; y < h / 2; y++) {
        for (let x = 0; x < w / 2; x++) {
            const c = Jimp.intToRGBA(image.getPixelColor(x, y));
            if (!isBg(c.r, c.g, c.b)) {
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }
    }

    console.log(`Icon Bounding Box: left=${left}, right=${right}, top=${top}, bottom=${bottom}`);

    if (left >= right || top >= bottom) {
        console.log("Could not find icon bounding box.");
        return;
    }

    // Crop the icon
    image.crop(left, top, right - left, bottom - top);

    // The icon might have rounded corners with presentation background or shadows.
    // Let's sample the center of the icon background to get the pure light blue.
    const cx = image.bitmap.width / 2; // Math.floor(w/2);
    const cy = image.bitmap.height / 2; // Math.floor(h/2);
    // Center is the dark blue map. We find the background sampling near the top-center edge.
    const sampleC = Jimp.intToRGBA(image.getPixelColor(Math.floor(cx), 10));
    console.log(`Sampled icon background color: R=${sampleC.r}, G=${sampleC.g}, B=${sampleC.b}`);

    // Fill the outer corners and shadows with this background color to make it a perfect square
    // We'll replace all pixels whose color is closer to presentation bgC than to the sampleC.
    // Or simply replace anything that is not similar to sampleC or not dark blue (the map) with sampleC.
    const isMap = (r, g, b) => Math.max(r, g, b) < 130;
    const isTargetBg = (r, g, b) => Math.abs(r - sampleC.r) < 30 && Math.abs(g - sampleC.g) < 30 && Math.abs(b - sampleC.b) < 30;

    for (let y = 0; y < image.bitmap.height; y++) {
        for (let x = 0; x < image.bitmap.width; x++) {
            const c = Jimp.intToRGBA(image.getPixelColor(x, y));
            if (!isMap(c.r, c.g, c.b) && !isTargetBg(c.r, c.g, c.b)) {
                image.setPixelColor(Jimp.rgbaToInt(sampleC.r, sampleC.g, sampleC.b, 255), x, y);
            }
        }
    }

    // Save the result
    if (!fs.existsSync('./assets')) fs.mkdirSync('./assets');
    await image.writeAsync('./assets/icon.png');
    await image.writeAsync('./assets/splash.png');
    console.log('Successfully cropped mockup and cleaned corners!');
}

run().catch(console.error);
