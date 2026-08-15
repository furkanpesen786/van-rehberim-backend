const Jimp = require('jimp');

async function processIcon() {
    const inputPath = 'C:/Users/FURKAN/.gemini/antigravity/brain/fc7da6b4-be6a-401b-918a-999e50e41c26/uploaded_image_1786612662694.png';
    const outputPathAssets = 'assets/icon.png';
    const outputPathResources = 'resources/icon.png';

    console.log('Reading image...');
    const originalImage = await Jimp.read(inputPath);

    // We want a 1024x1024 white canvas
    const canvas = await new Jimp(1024, 1024, '#FFFFFF');

    // The safe zone for circular icons is approx 65-70%. We'll scale the original to fit in ~650x650
    // Keep aspect ratio
    originalImage.scaleToFit(650, 650);

    // Calculate center pos
    const x = Math.floor((1024 - originalImage.bitmap.width) / 2);
    const y = Math.floor((1024 - originalImage.bitmap.height) / 2);

    console.log('Compositing...');
    // Paste center
    canvas.composite(originalImage, x, y);

    console.log('Saving 1024x1024 padded icons...');
    await canvas.writeAsync(outputPathAssets);
    await canvas.writeAsync(outputPathResources);
    console.log('Done!');
}

processIcon().catch(console.error);
