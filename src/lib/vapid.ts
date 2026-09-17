import webpush from 'web-push';

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BIdO5BNM7SzkETjiTVS7-ZaxRAL93A9uAD8mDJDK6PQqvdQmeJen49sziz7x4917PY2S8-Fl1OWHnfet3iCkOMU';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'LL-RDaeJwbB1-EP4M2r7MlT2cxK35_y997Q-uGgb4Bc';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  'mailto:admin@sipjam.sch.id';

let isConfigured = false;

export function configureWebPush() {
  if (!isConfigured) {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    isConfigured = true;
  }
}

export interface PushNotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, any>;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

/**
 * Sends a native Web Push notification to a subscription object
 */
export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: PushNotificationPayload
) {
  configureWebPush();
  return webpush.sendNotification(
    subscription,
    JSON.stringify(payload),
    {
      TTL: 60 * 60 * 24 // 24 hours
    }
  );
}

/**
 * Utility for converting VAPID public key string to Uint8Array for browser PushManager.subscribe
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
