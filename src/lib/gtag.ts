// src/lib/gtag.ts

// Your GA4 Measurement ID (set via NEXT_PUBLIC_GA_ID in Vercel)
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

// Track a page view
export const pageview = (url: string) => {
  if (!GA_TRACKING_ID) return;
  if (typeof window === "undefined") return;
  // @ts-ignore - gtag is injected by GA script
  if (typeof window.gtag !== "function") return;

  // @ts-ignore
  window.gtag("config", GA_TRACKING_ID, {
    page_path: url,
  });
};

// Track an arbitrary event
export const event = (action: string, params: Record<string, any> = {}) => {
  if (!GA_TRACKING_ID) return;
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (typeof window.gtag !== "function") return;

  // @ts-ignore
  window.gtag("event", action, params);
};
