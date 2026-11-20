// M33: van.bel.tr'den tüm otobüs hatlarını çeker ve GERÇEK veriyi
// src/data/busSnapshot.ts anlık görüntüsü olarak yazar.
//
// Neden var: Render sunucusundan van.bel.tr'ye doğrudan erişim
// başarısız olabiliyor (veri merkezi IP engeli / yavaşlık). Bu script
// van.bel.tr'ye erişebilen bir makinede (ör. geliştirme bilgisayarı)
// çalıştırılır; çekilen gerçek veri commit edilip push'landığında
// Render her zaman gerçek hat/saat/durak bilgisi sunar.
//
// M38: anlık görüntü src/data/busSnapshot.ts'te — istemci de aynı veriyi
// Render uykudayken (soğuk başlangıç) offline fallback olarak kullanır.
//
// Kullanım: npm run scrape:bus
// Sonraki adım: git add src/data/busSnapshot.ts && git commit && git push

import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchLiveBusRoutes } from '../server/busScraper.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../src/data/busSnapshot.ts');

console.log('van.bel.tr otobüs hatları çekiliyor (liste + tüm detay sayfaları)...');
const routes = await fetchLiveBusRoutes();

const withTimes = routes.filter((r) => r.departureTimes.length > 0);
console.log(`Toplam ${routes.length} hat, ${withTimes.length} tanesi saatli.`);
if (withTimes.length < 10) {
  console.error('Az sayıda saatli hat — site yapısı değişmiş olabilir; dosya GÜNCELLENMEDİ.');
  process.exit(1);
}

const stamp = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
const body = routes.map((r) => `  ${JSON.stringify(r)},`).join('\n');

const file = `// M33/M38: van.bel.tr otobüs ANLIK GÖRÜNTÜSÜ — bu dosya scripts/update-bus-fallback.ts
// (npm run scrape:bus) tarafından ${stamp} tarihinde van.bel.tr'den çekilerek
// üretildi. İçindeki hat/saat/durak verisi GERÇEKTİR. İki yerde kullanılır:
//   1. Sunucu: Render'dan van.bel.tr'ye canlı erişim başarısız olduğunda
//      (veri merkezi IP engeli) /api/bus-schedules bu veriden döner.
//   2. İstemci (M38): Render uykudayken soğuk başlangıç istek zaman aşımına
//      düşer — busService bu anlık görüntüye düşer; böylece ilk açılışta da
//      87 gerçek hat görünür (önceden 7 hatlık KURGUSSAL mock'a düşüyordu).
//
// Yenilemek için (van.bel.tr'ye erişebilen bir makinede):
//   npm run scrape:bus && git add src/data/busSnapshot.ts && git commit -m "..." && git push

import type { BusRoute } from '../types';

export interface BusRouteData {
  id: string;
  lineNo: string;
  title: string;
  route: string;
  departureTimes: string[];
  returnTimes: string[];
  stops: string[];
  frequency: string;
  status: BusRoute['status'];
  tariff: string;
  operatingHours: string;
}

export const BUS_SNAPSHOT_LAST_UPDATED = '${stamp}';

export const BUS_SNAPSHOT_ROUTES: BusRouteData[] = [
${body}
];
`;

writeFileSync(target, file, 'utf8');
console.log(`OK: ${routes.length} hat yazıldı → ${target}`);
