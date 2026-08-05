const Jimp = require('jimp');
const fs = require('fs');

async function run() {
    const imgPath = 'C:/Users/FURKAN/.gemini/antigravity/brain/a2401070-70ab-4b2d-88f9-c508a5374938/uploaded_image_1785786273076.png';
    const image = await Jimp.read(imgPath);
    const w = image.bitmap.width;
    const h = image.bitmap.height;

    // 1. Initial Mask (Dark pixels)
    // Let's use lightness: (max(R,G,B) + min(R,G,B))/2
    const isDark = (r, g, b) => {
        return Math.max(r, g, b) < 130; // 130 is quite dark. 
    };

    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = Jimp.intToRGBA(image.getPixelColor(x, y));
            if (c.a > 100 && isDark(c.r, c.g, c.b)) {
                mask[y * w + x] = 1;
            }
        }
    }

    // 2. Find Largest Component (The Lake)
    const labels = new Int32Array(w * h);
    let currentLabel = 1;
    const compSizes = {};

    for (let i = 0; i < w * h; i++) {
        if (mask[i] === 1 && labels[i] === 0) {
            const q = [i];
            labels[i] = currentLabel;
            let size = 1;
            let head = 0;
            while (head < q.length) {
                const curr = q[head++];
                const cx = curr % w;
                const cy = Math.floor(curr / w);
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
                for (let d of dirs) {
                    const nx = cx + d[0], ny = cy + d[1];
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const nidx = ny * w + nx;
                        if (mask[nidx] === 1 && labels[nidx] === 0) {
                            labels[nidx] = currentLabel;
                            q.push(nidx);
                            size++;
                        }
                    }
                }
            }
            compSizes[currentLabel] = size;
            currentLabel++;
        }
    }

    let largestLabel = -1;
    let maxSize = 0;
    for (let lbl in compSizes) {
        if (compSizes[lbl] > maxSize) {
            maxSize = compSizes[lbl];
            largestLabel = parseInt(lbl);
        }
    }

    // 3. Compute Lake Color L
    let sumLR = 0, sumLG = 0, sumLB = 0, countL = 0;
    let top = h, bottom = 0, left = w, right = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (labels[idx] === largestLabel) {
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;

                // Only sample color if firmly inside (check neighbors to erode by 1)
                let isFirm = true;
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (let d of dirs) {
                    const nx = x + d[0], ny = y + d[1];
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h && labels[ny * w + nx] !== largestLabel) {
                        isFirm = false; break;
                    }
                }
                if (isFirm) {
                    const c = Jimp.intToRGBA(image.getPixelColor(x, y));
                    sumLR += c.r; sumLG += c.g; sumLB += c.b; countL++;
                }
            }
        }
    }

    const L = {
        r: sumLR / countL,
        g: sumLG / countL,
        b: sumLB / countL
    };

    // Add padding to bounding box
    const pad = 10;
    top = Math.max(0, top - pad);
    bottom = Math.min(h - 1, bottom + pad);
    left = Math.max(0, left - pad);
    right = Math.min(w - 1, right + pad);

    // 4. Compute Background color B right outside the lake bounding box in the original image.
    // Actually, we can just use the provided ferah color: E6F4FD (230, 244, 253)
    // Because the background is a gradient, local background color might be slightly different.
    // To avoid halo, let's use the local background.
    let sumBR = 0, sumBG = 0, sumBB = 0, countB = 0;
    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            if (labels[y * w + x] !== largestLabel) {
                // Is it near the edge? dilate mask by 3
                let distToLake = 999;
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h && labels[ny * w + nx] === largestLabel) {
                            const d = Math.sqrt(dx * dx + dy * dy);
                            if (d < distToLake) distToLake = d;
                        }
                    }
                }
                // Sample background at distance 3
                if (distToLake >= 2 && distToLake <= 5) {
                    const c = Jimp.intToRGBA(image.getPixelColor(x, y));
                    sumBR += c.r; sumBG += c.g; sumBB += c.b; countB++;
                }
            }
        }
    }

    const B = {
        r: countB > 0 ? sumBR / countB : 230,
        g: countB > 0 ? sumBG / countB : 244,
        b: countB > 0 ? sumBB / countB : 253
    };

    // 5. Alpha Matting for Anti-aliasing
    const outW = right - left + 1;
    const outH = bottom - top + 1;

    // We want the icon to be a square!
    const finalSize = Math.max(outW, outH) + 20;
    const offX = Math.floor((finalSize - outW) / 2);
    const offY = Math.floor((finalSize - outH) / 2);

    const finalImg = await new Jimp(finalSize, finalSize, 0x00000000);

    const getDist = (c1, c2) => Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
    const maxDist = getDist(L, B);

    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            const idx = y * w + x;
            let alpha = 0;

            let isNear = false;
            if (labels[idx] === largestLabel) isNear = true;
            else {
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h && labels[ny * w + nx] === largestLabel) {
                            isNear = true; break;
                        }
                    }
                    if (isNear) break;
                }
            }

            if (isNear) {
                if (labels[idx] === largestLabel) {
                    alpha = 1;
                    // Slightly soften the inside firm pixels if they deviate towards background?
                    // No, firm inside pixels are alpha=1.
                } else {
                    const c = Jimp.intToRGBA(image.getPixelColor(x, y));
                    // Distance from Background
                    const distB = getDist(c, B);
                    alpha = distB / maxDist;
                    if (alpha > 1) alpha = 1;
                    if (alpha < 0) alpha = 0;
                    // Apply a steep ramp for crisp antialiasing
                    alpha = Math.pow(alpha, 1.5);
                }
            }

            if (alpha > 0) {
                // Output purely Lake color, with calculated alpha
                const outColor = Jimp.rgbaToInt(Math.round(L.r), Math.round(L.g), Math.round(L.b), Math.round(alpha * 255));
                finalImg.setPixelColor(outColor, x - left + offX, y - top + offY);
            }
        }
    }

    if (!fs.existsSync('./assets')) fs.mkdirSync('./assets');
    await finalImg.writeAsync('./assets/icon.png');
    await finalImg.writeAsync('./assets/splash.png');
    console.log('SUCCESS_EXTRACTION');
}

run().catch(console.error);
