import { describe, it, expect, vi } from 'vitest';

// deleteAllUserData (M13 KVKK) gerçek Firestore'a dokunmaz — firestore modülü
// mock'lanır; firebase.ts'in modül düzeyinde import ettiği HER şey sağlanır.
const { deleteDocMock, getDocsMock } = vi.hoisted(() => ({
  deleteDocMock: vi.fn(),
  getDocsMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  initializeFirestore: () => ({}),
  doc: (_db: unknown, coll: string, id: string) => ({ path: `${coll}/${id}` }),
  collection: (_db: unknown, coll: string) => ({ path: coll }),
  query: (ref: unknown) => ref,
  where: () => ({}),
  getDocs: getDocsMock,
  deleteDoc: deleteDocMock,
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: { now: () => ({}) },
}));

import { deleteAllUserData } from './firebase';

// M13 KVKK kritik yolu: Auth kaydı silinmeden ÖNCE kullanıcının TÜM verisi
// silinmeli. Bu test silme kapsamını (profil + favoriler + 3 ilan koleksiyonu)
// korur — buradaki bir regresyon doğrudan KVKK ihlalidir.
describe('deleteAllUserData', () => {
  it('profil dokümanını siler', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    await deleteAllUserData('uid-1');
    expect(deleteDocMock).toHaveBeenCalledWith({ path: 'users/uid-1' });
  });

  it('favoriler dokümanını siler', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    await deleteAllUserData('uid-1');
    expect(deleteDocMock).toHaveBeenCalledWith({ path: 'userFavorites/uid-1' });
  });

  it('üç ilan koleksiyonunda da userId eşleşmeli sorgu çalıştırır', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    await deleteAllUserData('uid-1');
    expect(getDocsMock).toHaveBeenCalledTimes(3);
  });

  it('kullanıcının ilanlarını (userId eşleşen dokümanları) siler', async () => {
    getDocsMock.mockResolvedValue({
      docs: [{ ref: { path: 'is_ilanlari/listing-1' } }],
    });
    await deleteAllUserData('uid-2');
    // 2 sabit doküman (profil + favoriler) + koleksiyon başına 1 ilan × 3
    expect(deleteDocMock).toHaveBeenCalledTimes(5);
    expect(deleteDocMock).toHaveBeenCalledWith({ path: 'is_ilanlari/listing-1' });
  });

  it('koleksiyonlardan hiç doküman dönmezse yalnızca profil + favoriler silinir', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    await deleteAllUserData('uid-3');
    expect(deleteDocMock).toHaveBeenCalledTimes(2);
  });
});
