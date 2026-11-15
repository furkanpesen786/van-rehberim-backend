import { describe, it, expect, vi } from 'vitest';

// deleteAllUserDataAndAccount (M35 KVKK) gerçek Firebase'e dokunmaz —
// firebase-admin modülleri mock'lanır. Bu testler M13'ten devralınan
// silme kapsamını (profil + favoriler + 3 ilan koleksiyonu + Auth kaydı)
// korur — buradaki bir regresyon doğrudan KVKK ihlalidir.
const { docDeleteMock, queryGetMock, authDeleteUserMock } = vi.hoisted(() => {
  interface ListingDocRef {
    path: string;
    delete: () => Promise<undefined>;
  }
  type QuerySnapshot = { docs: Array<{ ref: ListingDocRef }> };
  return {
    // delete bir metot olarak çağrıldığı için ref sarmayla verilir:
    // delete: () => docDeleteMock({ path }) biçiminde sarmalanır
    docDeleteMock: vi.fn<(ref: { path: string }) => Promise<undefined>>(async () => undefined),
    // Sorgu mock'u koleksiyon adı + where koşullarını argüman alır; testler
    // hangi koleksiyonda hangi koşulla sorgu yapıldığını bunlarla doğrular
    queryGetMock: vi.fn<(name: string, field: string, op: string, value: string) => Promise<QuerySnapshot>>(
      async () => ({ docs: [] }),
    ),
    authDeleteUserMock: vi.fn<(uid: string) => Promise<undefined>>(async () => undefined),
  };
});

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: () => [],
  cert: vi.fn(),
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ deleteUser: authDeleteUserMock, verifyIdToken: vi.fn() }),
}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: (path: string) => ({ path, delete: () => docDeleteMock({ path }) }),
    collection: (name: string) => ({
      where: (field: string, op: string, value: string) => ({
        get: () => queryGetMock(name, field, op, value),
      }),
    }),
  }),
}));

import { deleteAllUserDataAndAccount } from './account';

describe('deleteAllUserDataAndAccount', () => {
  it('profil dokümanını siler', async () => {
    await deleteAllUserDataAndAccount({} as never, 'uid-1');
    expect(docDeleteMock).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/uid-1' }));
  });

  it('favoriler dokümanını siler', async () => {
    await deleteAllUserDataAndAccount({} as never, 'uid-1');
    expect(docDeleteMock).toHaveBeenCalledWith(expect.objectContaining({ path: 'userFavorites/uid-1' }));
  });

  it('üç ilan koleksiyonunda da userId eşleşmeli sorgu çalıştırır', async () => {
    await deleteAllUserDataAndAccount({} as never, 'uid-1');
    expect(queryGetMock).toHaveBeenCalledTimes(3);
    for (const coll of ['is_ilanlari', 'indirim_ilanlari', 'taksiler']) {
      expect(queryGetMock).toHaveBeenCalledWith(coll, 'userId', '==', 'uid-1');
    }
  });

  it('kullanıcının ilanlarını (userId eşleşen dokümanları) siler', async () => {
    queryGetMock.mockResolvedValueOnce({
      docs: [{ ref: { path: 'is_ilanlari/listing-1', delete: () => docDeleteMock({ path: 'is_ilanlari/listing-1' }) } }],
    });
    await deleteAllUserDataAndAccount({} as never, 'uid-2');
    // 2 sabit doküman (profil + favoriler) + koleksiyonlardan 1 ilan
    expect(docDeleteMock).toHaveBeenCalledTimes(3);
    expect(docDeleteMock).toHaveBeenCalledWith(expect.objectContaining({ path: 'is_ilanlari/listing-1' }));
  });

  it('koleksiyonlardan hiç doküman dönmezse yalnızca profil + favoriler silinir', async () => {
    await deleteAllUserDataAndAccount({} as never, 'uid-3');
    expect(docDeleteMock).toHaveBeenCalledTimes(2);
  });

  it('Auth kaydını en son siler (KVKK sırası: önce veri, sonra kimlik)', async () => {
    await deleteAllUserDataAndAccount({} as never, 'uid-4');
    expect(authDeleteUserMock).toHaveBeenCalledTimes(1);
    expect(authDeleteUserMock).toHaveBeenCalledWith('uid-4');
    // Auth silme çağrısı, tüm Firestore silmelerinden SONRA gelmelidir
    const authOrder = authDeleteUserMock.mock.invocationCallOrder[0];
    for (const order of docDeleteMock.mock.invocationCallOrder) {
      expect(authOrder).toBeGreaterThan(order);
    }
  });
});
