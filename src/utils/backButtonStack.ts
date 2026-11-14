// M32: Android geri tuşu için global modal yığını (LIFO).
//
// Sorun: App.tsx'teki backButton dinleyicisi yalnızca sekmeleri biliyordu —
// bir modal açıkken geri tuşu modal yerine sekmeyi değiştiriyordu (kullanıcı
// form doldururken anasayfaya fırlıyordu).
//
// Çözüm: her açık modal `useBackButtonClose` ile kendini yığına kaydeder;
// backButton dinleyicisi önce `closeTopModal()` dener — yığın boşsa eski
// davranış (sekme → home, home'da çıkış) devreye girer. İç içe modaller
// (favoriler → işletme detayı gibi) LIFO sırayla kapanır.
//
// Modal, kapanış düğmesi/overlay tıklaması gibi başka bir yolla kapanırsa
// effect cleanup girdiyi yığından düşer — yığın asla bayat kapatıcı taşımaz.

import { useEffect, useRef } from 'react';

type Closer = () => void;
const stack: Closer[] = [];

// En üstteki modali kapatır. Bir modal kapatıldıysa true, yığın boşsa false.
export function closeTopModal(): boolean {
  const closer = stack.pop();
  if (closer) {
    closer();
    return true;
  }
  return false;
}

// Bir modalın açık olduğu sürece geri tuşuyla kapanabilmesini sağlar.
// `isOpen` false→true geçişinde kayıt, true→false'ta (veya unmount'ta) kayıt
// silinir. `onClose` referansı her render'da güncellenir ama effect
// yeniden çalışmaz (yalnızca isOpen bağımlılığı).
export function useBackButtonClose(isOpen: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const closer = () => onCloseRef.current();
    stack.push(closer);
    return () => {
      const idx = stack.indexOf(closer);
      if (idx !== -1) stack.splice(idx, 1);
    };
  }, [isOpen]);
}
