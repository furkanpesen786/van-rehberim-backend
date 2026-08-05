const Jimp = require('jimp');

async function run() {
    const imgPath = './assets/icon.png'; // This is solid blue right now
    const image = await Jimp.read(imgPath);

    const sampleC = Jimp.intToRGBA(image.getPixelColor(10, 10)); // Top left is guaranteed light blue now

    const isTargetBg = (r, g, b) => Math.abs(r - sampleC.r) < 15 && Math.abs(g - sampleC.g) < 15 && Math.abs(b - sampleC.b) < 15;

    for (let y = 0; y < image.bitmap.height; y++) {
        for (let x = 0; x < image.bitmap.width; x++) {
            const c = Jimp.intToRGBA(image.getPixelColor(x, y));
            if (isTargetBg(c.r, c.g, c.b)) {
                // Set transparent
                image.setPixelColor(0x00000000, x, y);
            } else {
                // Keep the map silhouette un-antialiased or maybe slightly blend? 
                // Since we already did this, if it's not the background, it's the map.
            }
        }
    }

    // Save the result for the splash screen
    await image.writeAsync('./public/van-logo.png');
    console.log('Successfully made transparent logo for gradient splash screen!');
}

run().catch(console.error);
