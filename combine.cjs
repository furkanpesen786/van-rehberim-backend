const Jimp = require('jimp');
async function run() {
    const icon = await Jimp.read('./assets/icon.png');
    // Solid E6F4FD background
    const bg = await new Jimp(icon.bitmap.width, icon.bitmap.height, 0xE6F4FDFF);
    bg.composite(icon, 0, 0);
    await bg.writeAsync('./assets/icon.png'); // Overwrite with solid background
}
run();
