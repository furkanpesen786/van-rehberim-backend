// listingService.ts — Ücretli ilanları backend üzerinden yayınlama (M5).
//
// Ödeme sonrası ilan artık doğrudan istemciden Firestore'a YAZILMAZ: veri +
// Firebase ID token backend'e gönderilir; backend RevenueCat doğrulaması yapıp
// Admin SDK ile yazar. Böylece ödemeyi atlatıp ilan yayımlamak mümkün olmaz.

import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://van-rehberim-api.onrender.com';

export type ListingType = 'job' | 'deal' | 'taxi';

export interface SubmitListingResult {
  ok: boolean;
  id: string;
  durationDays: number;
}

/**
 * Satın alma tamamlandıktan sonra çağrılır. İlan verisini backend'e gönderir;
 * backend ödemeyi doğrular, süreyi/tarihleri kendisi hesaplar ve Firestore'a
 * yazar. Dönen `id` yeni Firestore dokümanının gerçek id'sidir.
 */
export async function submitPaidListing(
  type: ListingType,
  productId: string,
  data: Record<string, unknown>,
): Promise<SubmitListingResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('İlan yayınlamak için giriş yapmalısınız.');
  }

  const idToken = await user.getIdToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE}/api/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ type, productId, data }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (body as { error?: string })?.error
        || 'İlan yayımlanamadı. Lütfen tekrar deneyiniz.';
      throw new Error(message);
    }
    return body as SubmitListingResult;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Sunucuya ulaşılamadı (zaman aşımı). İnternet bağlantınızı kontrol edip tekrar deneyiniz.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
