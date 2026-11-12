// scripts/firestore-schema-audit.ts — 15/17 (Firestore şema normalizasyonu) ADIM 1
//
// SALT OKUNUR denetim: üç ilan koleksiyonundaki dokümanların alan adlarını
// sayar ve canonical şemadan (server/listings.ts LISTING_TYPES) sapmaları
// raporlar. Hiçbir şey YAZMAZ.
//
// Çalıştırma:
//   npx tsx scripts/firestore-schema-audit.ts
//
// Service account dosyası (varsayılan):
//   C:\Users\FURKAN\Desktop\yeni klasör\vanrehberim-f181b-firebase-adminsdk-fbsvc-52bdf3b806.json
//   (FIREBASE_SERVICE_ACCOUNT_FILE ortam değişkeniyle değiştirilebilir)

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_FILE =
  process.env.FIREBASE_SERVICE_ACCOUNT_FILE ||
  'C:/Users/FURKAN/Desktop/yeni klasör/vanrehberim-f181b-firebase-adminsdk-fbsvc-52bdf3b806.json';

// Canonical alanlar — server/listings.ts'teki LISTING_TYPES + sunucunun kendi
// hesapladığı alanlar. Bu listelerdeki adler "doğru" kabul edilir.
const CANONICAL: Record<string, { fields: string[]; serverFields: string[]; variants: string[] }> = {
  is_ilanlari: {
    fields: [
      'title', 'providerName', 'category', 'district', 'address', 'phone',
      'description', 'photo', 'experienceYears', 'pricePaid',
    ],
    serverFields: [
      'userId', 'userEmail', 'productId', 'durationDays', 'isFeatured',
      'createdAt', 'createdAtTimestamp', 'bitisTarihi',
    ],
    variants: [], // JobsView eşlemesiz okuduğu için varyant listesi audit ile çıkar
  },
  indirim_ilanlari: {
    fields: [
      'isletmeAdi', 'kategori', 'indirimKodu', 'indirimDegeri', 'image',
      'locationName', 'description', 'pricePaid',
    ],
    serverFields: [
      'userId', 'userEmail', 'productId', 'durationDays', 'isFeatured',
      'createdAt', 'createdAtTimestamp', 'bitisTarihi', 'startDate', 'endDate',
    ],
    variants: [
      'storeName', 'name', 'title', 'dealTitle', 'baslik', 'discountRate',
      'indirimMiktari', 'oran', 'category', 'images', 'photoUrl', 'district',
      'ilce', 'konum', 'aciklama', 'detay', 'address',
    ],
  },
  taksiler: {
    fields: [
      'name', 'driverName', 'phone', 'plate', 'operatingRegions', 'district',
      'subscriptionPlan', 'monthlyFee', 'pricePaid',
    ],
    serverFields: [
      'userId', 'userEmail', 'productId', 'durationDays', 'isFeatured',
      'createdAt', 'createdAtTimestamp', 'bitisTarihi',
    ],
    variants: [
      'isim', 'soforAdi', 'telefon', 'tel', 'plaka', 'taxiPlate',
      'calismaBolgeleri', 'bolgeler', 'regions', 'mahalle', 'aylikUcret', 'fee',
    ],
  },
};

async function main(): Promise<void> {
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_FILE, 'utf-8'));
  const app = initializeApp({ credential: cert(serviceAccount) }, 'schema-audit');
  const db = getFirestore(app);

  for (const [collectionName, config] of Object.entries(CANONICAL)) {
    console.log(`\n=== ${collectionName} ===`);
    const snapshot = await db.collection(collectionName).get();
    console.log(`Toplam doküman: ${snapshot.size}`);
    if (snapshot.size === 0) continue;

    // Alan adı histogramı: alan → kaç dokümanda var
    const histogram = new Map<string, number>();
    // Varyant kullanan dokümanlar: id → hangi varyantlar
    const variantUsers: { id: string; variants: string[]; missingCanonical: string[] }[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      for (const key of Object.keys(data)) {
        histogram.set(key, (histogram.get(key) || 0) + 1);
      }
      const docVariants = Object.keys(data).filter((k) =>
        config.variants.includes(k) && data[k] !== undefined && data[k] !== null && data[k] !== ''
      );
      if (docVariants.length > 0) {
        variantUsers.push({
          id: doc.id,
          variants: docVariants,
          missingCanonical: docVariants.map((v) => `${v} → ?`),
        });
      }
    }

    console.log('\nAlan histogramı (alan: doküman sayısı):');
    const sorted = [...histogram.entries()].sort((a, b) => b[1] - a[1]);
    for (const [field, count] of sorted) {
      const tag = config.fields.includes(field)
        ? ' [canonical]'
        : config.serverFields.includes(field)
          ? ' [sunucu]'
          : config.variants.includes(field)
            ? ' [VARYANT]'
            : ' [bilinmeyen]';
      console.log(`  ${field}: ${count}${tag}`);
    }

    if (variantUsers.length > 0) {
      console.log(`\nVaryant alan taşıyan dokümanlar (${variantUsers.length}):`);
      for (const v of variantUsers) {
        console.log(`  ${v.id}: ${v.variants.join(', ')}`);
      }
    } else {
      console.log('\nVaryant alan taşıyan doküman yok.');
    }
  }

  console.log('\nDENETİM TAMAM (salt okunur — hiçbir şey yazılmadı).');
  process.exit(0);
}

main().catch((err) => {
  console.error('Denetim başarısız:', err);
  process.exit(1);
});
