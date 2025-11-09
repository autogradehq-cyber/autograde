// src/lib/gtag.ts

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-W1BZMF7XNP";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function trackEvent(
  action: string,
  params: Record<string, any> = {}
): void {
  if (typeof window === "undefined") return;
  if (!window.gtag || !GA_ID) return;

  window.gtag("event", action, params);
}
