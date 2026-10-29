import { getApp } from "firebase/app";
import { initializeAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import { firebaseConfig, firebaseFunctionsRegion } from "./firebaseConfig";

let analyticsPromise: Promise<Analytics | null> | undefined;

async function getBrowserAnalytics(): Promise<Analytics | null> {
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => supported
      ? initializeAnalytics(getApp(), { config: { send_page_view: false } })
      : null).catch(() => null);
  }
  return analyticsPromise;
}

export async function trackPageView(path: string, title: string): Promise<void> {
  if (typeof window === "undefined") return;
  let sessionId = "";
  try {
    sessionId = sessionStorage.getItem("blu-portal-analytics-session") || "";
    if (!sessionId) {
      sessionId = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("blu-portal-analytics-session", sessionId);
    }
  } catch {
    // Page totals are still recorded when session storage is unavailable.
  }
  const isLocalDevelopment = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (!isLocalDevelopment) {
    const endpoint = `https://${firebaseFunctionsRegion}-${firebaseConfig.projectId}.cloudfunctions.net/recordElectionPageView`;
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, sessionId }),
      keepalive: true,
    }).catch(() => undefined);
  }
  const analytics = await getBrowserAnalytics();
  if (!analytics) return;
  logEvent(analytics, "page_view", {
    page_title: title,
    page_location: new URL(path, window.location.origin).href,
    page_path: path,
  });
}
