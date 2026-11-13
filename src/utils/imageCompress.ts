// M29: DealsView fotoğraf yükleme düzeltmesi. Önceden ham dosya base64'e
// okunuyordu (500KB-5MB) ve sunucudaki MAX_FIELD_LENGTH=5000 görseli keserek
// bozuyordu. Artık görsel tarayıcıda (canvas) yeniden boyutlandırılıp JPEG
// olarak sıkıştırılır; çıktı daima MAX_DATAURL_CHARS sınırının altındadır.
//
// Bu, Firebase Storage yerine bilinçli seçilmiş hafif bir çözümdür: yeni
// altyapı (Storage kuralı, upload akışı) gerektirmez ve Firestore'un 1MB
// doküman sınırının da altında kalır (5 fotoğraf × ~150K karakter).

/** Sunucunun kabul ettiği tek görsel üst sınırı (base64 karakter sayısı). */
export const MAX_IMAGE_DATAURL_CHARS = 150_000;

/** Sıkıştırma hedefi: en uzun kenar (piksel). */
const MAX_DIMENSION = 1024;

interface CompressStep {
  maxDim: number;
  quality: number;
}

// Aşamalı sıkıştırma: ilk adım çoğu fotoğrafı yakalar; büyük fotoğraflarda
// kalite/boyut kademesi düşürülerek sınırın altına inilir.
const COMPRESS_STEPS: CompressStep[] = [
  { maxDim: MAX_DIMENSION, quality: 0.72 },
  { maxDim: 900, quality: 0.55 },
  { maxDim: 720, quality: 0.4 },
];

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  // Eski WebView fallback: <img> ile yükle
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Fotoğraf okunamadı.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawToDataUrl(
  source: ImageBitmap | HTMLImageElement,
  maxDim: number,
  quality: number
): string {
  const srcW = 'width' in source ? source.width : 0;
  const srcH = 'height' in source ? source.height : 0;
  if (!srcW || !srcH) throw new Error('Fotoğraf boyutları okunamadı.');

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Görsel işlenemedi (canvas desteklenmiyor).');
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Fotoğraf dosyasını sıkıştırılmış JPEG data-URL'ine çevirir.
 * Tüm sıkıştırma adımları sınırın üstünde kalırsa hata fırlatır —
 * çağıran taraf kullanıcıyı bilgilendirir.
 */
export async function compressImageFile(file: File): Promise<string> {
  const bitmap = await loadBitmap(file);
  try {
    let lastDataUrl = '';
    for (const step of COMPRESS_STEPS) {
      lastDataUrl = drawToDataUrl(bitmap, step.maxDim, step.quality);
      if (lastDataUrl.length <= MAX_IMAGE_DATAURL_CHARS) {
        return lastDataUrl;
      }
    }
    throw new Error(
      'Fotoğraf çok büyük. Lütfen daha küçük bir fotoğraf seçiniz.'
    );
  } finally {
    if ('close' in bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
}
