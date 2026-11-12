// M27 (16/17): strict modda catch değişkenleri `unknown` tipinde gelir.
// Bu modül, bileşenlerdeki/services'teki catch bloklarının ortak
// `err.message || 'varsayılan'` desenini tip güvenli hale getirir.
// Ayrıca Firebase Auth (`err.code`) ve RevenueCat (iptal tespiti) için
// güvenli erişimciler sağlar.

/**
 * Bir hata nesnesinden insan tarafından okunabilir mesaj çıkarır.
 * - Error instance'ları → .message
 * - string → kendisi
 * - diğerleri → String(err)
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

/**
 * Firebase Auth / Firestore hatalarındaki `code` alanını güvenle okur
 * (ör. 'auth/popup-closed-by-user', 'auth/requires-recent-login').
 * Kod yoksa veya string değilse undefined döner.
 */
export function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

// RevenueCat PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR = "1"
// (SDK kendi tipini dışa açmadığı için değer burada sabitlenir;
// @revenuecat/purchases-typescript-internal-esm/dist/generated/error-codes.d.ts)
const RC_PURCHASE_CANCELLED_ERROR = '1';

/**
 * RevenueCat satın almasının kullanıcı iptaliyle mi sonuçlandığını söyler.
 * İki yol kontrol edilir: (1) SDK hatasının `code === PURCHASE_CANCELLED_ERROR`
 * olması (resmi öneri — `userCancelled` alanı deprecated), (2) web mock'ları ve
 * eski sürümler için `userCancelled === true`.
 */
export function isPurchaseCancelled(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; userCancelled?: unknown };
  return e.userCancelled === true || e.code === RC_PURCHASE_CANCELLED_ERROR;
}
