import { LocalNotifications } from '@capacitor/local-notifications';
import { fetchLivePrayerTimes } from './prayerService';

export interface NotificationSettings {
    newsEnabled: boolean;
    prayerEnabled: boolean;
    vibrationEnabled: boolean;
}

const SETTINGS_KEY = 'app_notification_settings';

export class NotificationService {
    public static async requestPermissions(): Promise<boolean> {
        try {
            const result = await LocalNotifications.requestPermissions();
            return result.display === 'granted';
        } catch (e) {
            console.warn('Local Notifications permission request failed', e);
            return false;
        }
    }

    public static async initChannels(vibrationEnabled: boolean) {
        try {
            await LocalNotifications.createChannel({
                id: 'default_channel',
                name: 'Genel Bildirimler',
                description: 'Genel uygulama bildirimleri (Haberler vb.)',
                importance: 4,
                visibility: 1,
                vibration: vibrationEnabled,
            });

            await LocalNotifications.createChannel({
                id: 'prayer_channel',
                name: 'Namaz Vakitleri',
                description: 'Namaz vakitleri hatırlatmaları',
                importance: 4,
                visibility: 1,
                vibration: vibrationEnabled,
            });
        } catch (e) {
            console.warn('Channel creation failed', e);
        }
    }

    public static getSettings(): NotificationSettings {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch { }
        }
        return {
            newsEnabled: false,
            prayerEnabled: false,
            vibrationEnabled: true,
        };
    }

    public static async saveSettings(settings: NotificationSettings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        await this.applySettings(settings);
    }

    public static async applySettings(settings: NotificationSettings) {
        // 1. Re-init channels with the new vibration setup
        await this.initChannels(settings.vibrationEnabled);

        // M16: taziye (obituary) yarı-özelliği kaldırıldı — ayar alanı ve
        // legacy bildirim iptali silindi. Eski kullanıcılarda localStorage'da
        // kalan obituaryEnabled anahtarı zararsız (yok sayılır).

        // 2. News (Bildirim Al - 5 times a day)
        if (settings.newsEnabled) {
            await this.scheduleNews();
        } else {
            await this.cancelNews();
        }

        // 3. Prayer times
        if (settings.prayerEnabled) {
            await this.schedulePrayerTimes();
        } else {
            await this.cancelPrayerTimes();
        }
    }

    // --- NEWS ---
    private static async scheduleNews() {
        await this.cancelNews(); // Cancel old ones first

        // M17: önceden gün içinde RASTGELE 5 saate "Yeni Haberler Var"
        // bildirimi planlanıyordu — yeni haber kontrolü olmadan bu iddialı bir
        // bildirimdi. Artık sabit saatlerde (09:00, 18:00) dürüst bir "günün
        // haberlerine göz at" hatırlatması gönderiliyor. (Gerçek yeni-haber
        // bildirimi push altyapısı gerektirir — yol haritasında değil.)
        const now = new Date();
        const notificationHours = [9, 18];
        const notifications = notificationHours.map((hour, i) => {
            const scheduleDate = new Date(now);
            scheduleDate.setHours(hour, 0, 0, 0);
            // Saat geçtiyse yarına planla
            if (scheduleDate.getTime() <= now.getTime()) {
                scheduleDate.setDate(scheduleDate.getDate() + 1);
            }
            return {
                id: 101 + i,
                title: 'Van Rehberim — Günün Haberleri',
                body: 'Van\'da bugün neler olduğuna göz atmak ister misiniz?',
                channelId: 'default_channel',
                schedule: { at: scheduleDate, allowWhileIdle: true },
            };
        });

        await LocalNotifications.schedule({ notifications });
    }

    private static async cancelNews() {
        const ids = [101, 102];
        await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
    }

    // --- PRAYER TIMES ---
    private static async schedulePrayerTimes() {
        await this.cancelPrayerTimes();

        try {
            const result = await fetchLivePrayerTimes();
            if (!result || !result.success || !result.times) return;
            const times = result.times;

            const scheduleDateForTime = (timeStr: string) => {
                const [hours, mins] = timeStr.split(':').map(Number);
                const d = new Date();
                d.setHours(hours, mins, 0, 0);
                return d;
            };

            // M31: başlıklar API anahtarından (Imsak/Ogle/...) değil düzgün
            // Türkçe isimlerden geliyor; gövde metinleri tam cümle.
            const prayerMap: Record<string, { title: string; body: string }> = {
                Imsak: { title: 'İmsak', body: 'İmsak vakti girdi.' },
                Sabah: { title: 'Güneş', body: 'Güneş doğdu.' },
                Ogle: { title: 'Öğle', body: 'Öğle ezanı okundu.' },
                Ikindi: { title: 'İkindi', body: 'İkindi ezanı okundu.' },
                Aksam: { title: 'Akşam', body: 'Akşam ezanı okundu.' },
                Yatsi: { title: 'Yatsı', body: 'Yatsı ezanı okundu.' },
            };

            const notifications = [];
            let idCounter = 301;

            for (const [key, name] of Object.entries({
                Imsak: times.imsak,
                Sabah: times.sabah,
                Ogle: times.ogle,
                Ikindi: times.ikindi,
                Aksam: times.aksam,
                Yatsi: times.yatsi,
            })) {
                const ptime = scheduleDateForTime(name);

                // Schedule if it is in the future
                if (ptime.getTime() > new Date().getTime()) {
                    const meta = prayerMap[key];
                    notifications.push({
                        id: idCounter++,
                        title: meta ? meta.title : key,
                        body: meta ? meta.body : `${key} vakti girdi.`,
                        channelId: 'prayer_channel',
                        // M31: `on: { hour, minute }` GÜNLÜK tekrar planlar —
                        // vakitler her gün değiştiği için ertesi gün bayat
                        // saatte bildirim geliyordu. Tek atımlık `at:` kullan;
                        // uygulama her açılışta App.tsx üzerinden yeniden
                        // planlıyor (applySettings).
                        schedule: { at: ptime, allowWhileIdle: true },
                        sound: 'beep.caf', // Default available sound behavior
                    });
                }
            }

            if (notifications.length > 0) {
                await LocalNotifications.schedule({ notifications });
            }

        } catch (e) {
            console.warn("Failed to schedule prayer times", e);
        }
    }

    private static async cancelPrayerTimes() {
        const ids = [301, 302, 303, 304, 305, 306];
        await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
    }
}
