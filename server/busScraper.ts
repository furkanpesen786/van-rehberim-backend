// M33: van.bel.tr otobüs kazıyıcı — server.ts'ten ayrıldı. Hem canlı
// yenileme (server.ts /api/bus-schedules) hem yerel anlık görüntü
// güncellemesi (scripts/update-bus-fallback.ts → npm run scrape:bus)
// aynı kodu kullanır. Native ESM: göreli import'larda .ts uzantısı şart.
//
// Site yapısı (15.11.2026 doğrulandı): liste sayfası hat LİNKLERİDİR
// (her hat https://van.bel.tr/OtobusSaatDetay/{id} detayına gider);
// saatler ve durak zinciri detay sayfasındadır.

import type { BusRouteData } from '../src/data/busSnapshot.ts';

export const BUS_LISTING_URL = 'https://van.bel.tr/Syf/Otobus-Hareket-Saatleri.html';
export const BUS_FETCH_TIMEOUT_MS = 10000;
export const BUS_DETAIL_TIMEOUT_MS = 10000;
export const BUS_DETAIL_CONCURRENCY = 6;

const BUS_UA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
} as const;

export interface BusListingEntry {
  detailId: string;
  lineNo: string;
  title: string;
}

export interface BusDetailData {
  title: string;
  route: string;
  departureTimes: string[];
  returnTimes: string[];
  stops: string[];
}

function decodeBasicHtml(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&apos;|&#0?39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Bazı van.bel.tr detay sayfaları içeriği HTML-escape edilmiş teslim eder
// (&lt;li ...&gt;). Etiket regex'leri eşleşsin diye önce kaçış dizileri
// çözülür; normal sayfalarda yapısal değişiklik yaratmaz.
function unescapeHtmlEntities(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&');
}

async function fetchVanBelTrPage(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: BUS_UA_HEADERS });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Liste sayfası: her hat <a href=".../OtobusSaatDetay/{id}"> içinde
// <strong>HATNO - </strong>GÜZERGÂH biçiminde listelenir.
export function parseBusListing(rawHtml: string): BusListingEntry[] {
  const html = unescapeHtmlEntities(rawHtml);
  const entries: BusListingEntry[] = [];
  const seen = new Set<string>();
  const anchorRe = /<a\s+href="(?:https:\/\/van\.bel\.tr)?\/OtobusSaatDetay\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const detailId = match[1];
    if (seen.has(detailId)) continue;
    seen.add(detailId);

    const plain = decodeBasicHtml(match[2].replace(/<[^>]+>/g, ' '));
    const strongMatch = /<strong>([\s\S]*?)<\/strong>/i.exec(match[2]);
    const lineNo = strongMatch
      ? decodeBasicHtml(strongMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s*-\s*$/, ''))
      : plain.split(/\s+/)[0] || `Hat ${detailId}`;
    const title = strongMatch
      ? decodeBasicHtml(match[2].replace(/<strong>[\s\S]*?<\/strong>/i, '').replace(/<[^>]+>/g, ' '))
      : plain;

    if (lineNo && title) entries.push({ detailId, lineNo, title });
  }
  return entries;
}

// Detay sayfası: iki <ul class="list-group"> sütunu (gidiş / dönüş) +
// route-note içinde "Durak1-Durak2-..." güzergâh zinciri. Satır biçimi
// "HH:MM" veya "HH:MM KALKIŞ NOKTASI (ARIZALI vb.)" olabilir — ek metin
// bilgi amaçlı korunur (M31 dürüstlük: kalkış noktası/arıza notu gerçek).
export function parseBusDetail(rawHtml: string): BusDetailData {
  const html = unescapeHtmlEntities(rawHtml);
  const h1Match = /<h1[^>]*class="page-title"[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const title = h1Match ? decodeBasicHtml(h1Match[1].replace(/<[^>]+>/g, ' ')) : '';

  const columns = (html.match(/<ul class="list-group">[\s\S]*?<\/ul>/gi) || []).map((ul) => {
    const times: string[] = [];
    const liRe = /<li class="list-group-item">([\s\S]*?)<\/li>/gi;
    let liMatch: RegExpExecArray | null;
    while ((liMatch = liRe.exec(ul)) !== null) {
      const text = decodeBasicHtml(liMatch[1].replace(/<[^>]+>/g, ' '));
      // Saat satırı: "07:00", "07:00 ESENLER MAH", "13:45 MERKEZ (ARIZALI)"
      if (/^[0-2]?\d:[0-5]\d(\s|$)/.test(text)) times.push(text);
    }
    const noteMatch = /route-note[\s\S]*?<b>([\s\S]*?)<\/b>/i.exec(ul);
    const note = noteMatch ? decodeBasicHtml(noteMatch[1].replace(/<[^>]+>/g, ' ')) : '';
    return { times, note };
  });

  const route = columns[0]?.note ?? columns[1]?.note ?? '';
  return {
    title,
    route,
    departureTimes: columns[0]?.times ?? [],
    returnTimes: columns[1]?.times ?? [],
    stops: route ? route.split('-').map((s) => s.trim()).filter(Boolean) : [],
  };
}

export function buildLiveBusRoute(entry: BusListingEntry, detail: BusDetailData): BusRouteData {
  // Saat girdileri "HH:MM" veya "HH:MM kalkış-notu" biçiminde; çalışma
  // aralığı/sıklık saf saat kısmından hesaplanır.
  const pureTimes = detail.departureTimes
    .map((t) => t.match(/^([0-2]?\d:[0-5]\d)/)?.[1])
    .filter((t): t is string => Boolean(t));
  const first = pureTimes[0];
  const last = pureTimes[pureTimes.length - 1];
  return {
    id: `v-live-${entry.detailId}`,
    lineNo: entry.lineNo,
    title: detail.title || entry.title,
    route: detail.route || entry.title,
    departureTimes: detail.departureTimes,
    returnTimes: detail.returnTimes,
    stops: detail.stops,
    frequency:
      pureTimes.length > 0 ? `Günde ${pureTimes.length} sefer` : 'Program van.bel.tr detayında',
    status: 'Aktif',
    // Tarife bilgisi van.bel.tr'de yayımlanmıyor — boş bırakılır (M31 dürüstlük).
    tariff: '',
    operatingHours: first && last ? `${first} - ${last}` : '',
  };
}

// Tüm hatları çeker: liste sayfası + her hattın detayı (6'şarlı gruplar).
// Detayı alınamayan hat listede kalır (saatler boş); çağıran tarafın eşik
// denetimine girer. van.bel.tr'ye erişilemeyen ortamlarda (ör. Render
// veri merkezi IP engeli) hata fırlatır.
export async function fetchLiveBusRoutes(): Promise<BusRouteData[]> {
  const listingHtml = await fetchVanBelTrPage(BUS_LISTING_URL, BUS_FETCH_TIMEOUT_MS);
  const listing = parseBusListing(listingHtml);
  if (listing.length === 0) throw new Error('van.bel.tr liste sayfasında otobüs hattı bulunamadı');

  const routes: BusRouteData[] = [];
  for (let i = 0; i < listing.length; i += BUS_DETAIL_CONCURRENCY) {
    const chunk = listing.slice(i, i + BUS_DETAIL_CONCURRENCY);
    const parsed = await Promise.all(
      chunk.map(async (entry) => {
        try {
          const html = await fetchVanBelTrPage(
            `https://van.bel.tr/OtobusSaatDetay/${entry.detailId}`,
            BUS_DETAIL_TIMEOUT_MS,
          );
          return buildLiveBusRoute(entry, parseBusDetail(html));
        } catch {
          return buildLiveBusRoute(entry, {
            title: entry.title,
            route: entry.title,
            departureTimes: [],
            returnTimes: [],
            stops: [],
          });
        }
      }),
    );
    routes.push(...parsed);
  }
  return routes;
}
