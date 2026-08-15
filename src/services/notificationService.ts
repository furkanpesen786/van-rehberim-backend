import { LocalNotifications } from '@capacitor/local-notifications';
import { fetchLivePrayerTimes } from './prayerService';

export interface NotificationSettings {
    newsEnabled: boolean;
    obituaryEnabled: boolean;
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
            obituaryEnabled: false,
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

        // Cancel legacy obituary notification explicitly
        try {
            await LocalNotifications.cancel({ notifications: [{ id: 200 }] });
        } catch (e) { }

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

        // Schedule 5 random times between 09:00 and 21:00 for the current day.
        // In a real app, this should run periodically to schedule for the next days.
        const notifications = [];
        const now = new Date();

        // If we're past 21:00, schedule for tomorrow
        const baseDate = now.getHours() >= 21 ? new Date(now.getTime() + 86400000) : now;

        for (let i = 1; i <= 5; i++) {
            const hour = Math.floor(Math.random() * (21 - 9 + 1)) + 9;
            const minute = Math.floor(Math.random() * 60);

            const scheduleDate = new Date(baseDate);
            scheduleDate.setHours(hour, minute, 0, 0);

            // Only schedule if time is in the future
            if (scheduleDate.getTime() > new Date().getTime()) {
                notifications.push({
                    id: 100 + i,
                    title: 'Yeni Haberler Var',
                    body: 'Van Rehberim\'de güncel haberleri ve içerikleri keşfetmek için dokunun.',
                    channelId: 'default_channel',
                    schedule: { at: scheduleDate, allowWhileIdle: true },
                });
            }
        }

        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
        }
    }

    private static async cancelNews() {
        const ids = [101, 102, 103, 104, 105];
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

            const prayerMap: Record<string, string> = {
                Imsak: 'İmsak vakti geldi.',
                Sabah: 'Güneş doğdu.',
                Ogle: 'Öğle ezanı.',
                Ikindi: 'İkindi ezanı.',
                Aksam: 'Akşam ezanı.',
                Yatsi: 'Yatsı ezanı.',
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
                    notifications.push({
                        id: idCounter++,
                        title: key,
                        body: prayerMap[key] || `${key} vakti geldi.`,
                        channelId: 'prayer_channel',
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
