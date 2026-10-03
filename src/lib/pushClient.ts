const DEFAULT_VAPID_PUBLIC_KEY =
  'BIdO5BNM7SzkETjiTVS7-ZaxRAL93A9uAD8mDJDK6PQqvdQmeJen49sziz7x4917PY2S8-Fl1OWHnfet3iCkOMU';

/**
 * Utility for converting VAPID public key string to Uint8Array for browser PushManager.subscribe
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const cleanBase64 = (base64String || '').trim();
  const padding = '='.repeat((4 - (cleanBase64.length % 4)) % 4);
  const base64 = (cleanBase64 + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = typeof window !== 'undefined' ? window.atob(base64) : atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

/**
 * Checks whether Web Push and Service Workers are supported in the current environment
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Gets the current registration and push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.error('Error getting push subscription:', err);
    return null;
  }
}

/**
 * Registers the service worker located at /sw.js
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Subscribes the current browser to Web Push notifications using VAPID
 */
export async function subscribeToPushNotifications(user?: {
  id?: string;
  nama?: string;
  role?: string;
  sekolah_id?: string;
}): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Web Push tidak didukung pada browser/perangkat ini.' };
  }

  try {
    // 1. Request Notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Izin notifikasi tidak diberikan oleh pengguna.' };
    }

    // 2. Ensure Service Worker is registered
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'Gagal mengaktifkan Service Worker.' };
    }

    // 3. Get Public VAPID Key from API with fallback
    let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      try {
        const res = await fetch('/api/push/validate');
        if (res.ok) {
          const data = await res.json();
          publicKey = data.publicKey;
        }
      } catch (keyErr) {
        console.warn('[PushClient] Error fetching public VAPID key from API:', keyErr);
      }
    }

    if (!publicKey) {
      publicKey = DEFAULT_VAPID_PUBLIC_KEY;
    }

    // 4. Subscribe via PushManager
    let subscription = await registration.pushManager.getSubscription();
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // If a subscription already exists, verify its applicationServerKey matches the current VAPID key
    if (subscription && subscription.options?.applicationServerKey) {
      try {
        const existingKeyArr = new Uint8Array(subscription.options.applicationServerKey);
        const isMatch =
          existingKeyArr.length === convertedVapidKey.length &&
          existingKeyArr.every((byte, idx) => byte === convertedVapidKey[idx]);
        if (!isMatch) {
          console.warn('[PushClient] Existing subscription key differs from active VAPID key; renewing subscription...');
          await subscription.unsubscribe();
          subscription = null;
        }
      } catch (verifyErr) {
        console.warn('[PushClient] Could not verify existing key:', verifyErr);
      }
    }

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource
        });
      } catch (subErr) {
        // If subscribe failed due to existing mismatched key, unsubscribe first and retry
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey as unknown as BufferSource
          });
        } else {
          throw subErr;
        }
      }
    }

    // 5. Send subscription to backend
    const subJson = subscription.toJSON();
    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subJson,
        user_id: user?.id,
        user_nama: user?.nama,
        user_role: user?.role,
        sekolah_id: user?.sekolah_id
      })
    });

    const saveResult = await saveRes.json();
    if (!saveRes.ok || !saveResult.success) {
      return { success: false, error: saveResult.error || 'Gagal menyimpan subscription ke server.' };
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('Push subscription failed:', err);
    return { success: false, error: err.message || 'Terjadi kesalahan saat mengaktifkan notifikasi.' };
  }
}

/**
 * Unsubscribes the current device from Push Notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const sub = await getPushSubscription();
    if (sub) {
      await sub.unsubscribe();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to unsubscribe from push:', err);
    return false;
  }
}

/**
 * Sends a test push notification to the current device via /api/push/validate
 */
export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const sub = await getPushSubscription();
    if (!sub) {
      return { success: false, error: 'Perangkat belum terdaftar untuk menerima notifikasi.' };
    }

    const res = await fetch('/api/push/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        payload: {
          title: 'SIPJAM - Tes Push Notifikasi',
          body: 'Notifikasi VAPID berhasil diterima! Sistem siap mengirim notifikasi secara berkala.',
          url: '/'
        }
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Gagal mengirim pesan uji coba.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghubungi server uji coba.' };
  }
}
