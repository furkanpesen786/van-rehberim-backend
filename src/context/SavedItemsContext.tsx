import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  loadSavedIds,
  saveSavedIds,
  SAVED_DEALS_KEY,
  SAVED_PLACES_KEY,
  DEFAULT_SAVED_DEAL_IDS,
  DEFAULT_SAVED_PLACE_IDS,
} from '../utils/savedItemsStorage';

// M28 (17/17): favori ilan/yer state'inin tek sahibi. Önceden her bileşen
// kendi useState'iyle localStorage okuyor, `van_saved_deals_changed` özel
// window event'iyle (isimsiz olarak yerleri bile senkronluyordu) ve
// sekmeler arası `storage` dinleyicileriyle ayak uydurmaya çalışıyordu.
// Artık: state provider'da, kalıcılık utils/savedItemsStorage'da,
// sekme senkronu buradaki TEK `storage` dinleyicisinde. localStorage
// anahtarları değişmedi — mevcut kullanıcı favorileri aynen taşınır.

interface SavedItemsContextType {
  /** Favoriye eklenmiş ilan ID'leri */
  savedDealIds: string[];
  /** Favoriye eklenmiş gezilecek yer ID'leri */
  savedPlaceIds: string[];
  isDealSaved: (id: string) => boolean;
  isPlaceSaved: (id: string) => boolean;
  toggleSaveDeal: (id: string) => void;
  toggleSavePlace: (id: string) => void;
  /** Doğrudan liste atar (SettingsView "örnek işletmeler ekle" akışı). */
  setSavedDeals: (ids: string[]) => void;
}

const SavedItemsContext = createContext<SavedItemsContextType | null>(null);

export function SavedItemsProvider({ children }: { children: React.ReactNode }) {
  const [savedDealIds, setSavedDealIds] = useState<string[]>(() =>
    loadSavedIds(SAVED_DEALS_KEY, DEFAULT_SAVED_DEAL_IDS)
  );
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>(() =>
    loadSavedIds(SAVED_PLACES_KEY, DEFAULT_SAVED_PLACE_IDS)
  );

  // Kalıcılık: state değişince depoya yaz (provider mount'unda varsayılanlar
  // da yazılır — eski DealsView davranışıyla aynı).
  useEffect(() => {
    saveSavedIds(SAVED_DEALS_KEY, savedDealIds);
  }, [savedDealIds]);

  useEffect(() => {
    saveSavedIds(SAVED_PLACES_KEY, savedPlaceIds);
  }, [savedPlaceIds]);

  // Sekmeler arası senkronizasyon: başka bir sekme localStorage'ı
  // değiştirdiğinde `storage` event'i tetiklenir — tek noktada dinlenir.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_DEALS_KEY) {
        setSavedDealIds(loadSavedIds(SAVED_DEALS_KEY, DEFAULT_SAVED_DEAL_IDS));
      } else if (e.key === SAVED_PLACES_KEY) {
        setSavedPlaceIds(loadSavedIds(SAVED_PLACES_KEY, DEFAULT_SAVED_PLACE_IDS));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleSaveDeal = useCallback((id: string) => {
    setSavedDealIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSavePlace = useCallback((id: string) => {
    setSavedPlaceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const isDealSaved = useCallback(
    (id: string) => savedDealIds.includes(id),
    [savedDealIds]
  );

  const isPlaceSaved = useCallback(
    (id: string) => savedPlaceIds.includes(id),
    [savedPlaceIds]
  );

  const value: SavedItemsContextType = {
    savedDealIds,
    savedPlaceIds,
    isDealSaved,
    isPlaceSaved,
    toggleSaveDeal,
    toggleSavePlace,
    setSavedDeals: setSavedDealIds,
  };

  return <SavedItemsContext.Provider value={value}>{children}</SavedItemsContext.Provider>;
}

export function useSavedItems(): SavedItemsContextType {
  const ctx = useContext(SavedItemsContext);
  if (!ctx) {
    throw new Error('useSavedItems yalnızca SavedItemsProvider içinde kullanılabilir.');
  }
  return ctx;
}
