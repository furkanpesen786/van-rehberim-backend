// accountService.ts — Hesap silmeyi backend üzerinden yapar (M35).
//
// M34 teşhisi: Android'de CapacitorHttp, Firestore web SDK'nın yazma
// çağrılarını (deleteDoc) asla sonuçlandırmıyor — istemci tarafı silme
// "İşleniyor" spinner'ında sonsuza kadar takılıyordu. Artık istemci yalnızca
// kendi ID token'ını gönderir; Firestore'daki veriyi ve Auth kaydını
// sunucudaki Admin SDK siler (POST /api/account/delete).
//
// listingService.ts ile aynı desen: 30 sn timeout, backend hatası Türkçe
// mesajla yükseltilir.

const API_BASE = import.meta.env.VITE_API_URL || 'https://van-rehberim-api.onrender.com';

/**
 * Giriş yapmış kullanıcının hesabını sunucuda siler. çağıran taraf ID
 * token'ını önceden almış olmalı (adım adım tanı için ayrı bir adımdır).
 * Başarı durumunda Auth kaydı dahil her şey silinmiş ve tüm oturum
 * tokenları iptal edilmiş olur.
 */
export async function deleteAccountRemotely(idToken: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE}/api/account/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (body as { error?: string })?.error
        || 'Hesabınız silinirken bir sunucu hatası oluştu. Lütfen tekrar deneyiniz.';
      throw new Error(message);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Sunucuya ulaşılamadı (zaman aşımı). İnternet bağlantınızı kontrol edip tekrar deneyiniz.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
