// src/pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Script from "next/script";
import * as gtag from "../lib/gtag";
import Layout from "../components/Layout"; // <-- new import

// Try common exported names from lib/gtag or the env var; cast to any to avoid a TS error if the exact name differs
const GA_ID: string =
  (gtag as any).GA_MEASUREMENT_ID ??
  (gtag as any).GA_TRACKING_ID ??
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS ??
  "";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    if (!GA_ID) return;

    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };

    // Fire once on first load
    gtag.pageview(window.location.pathname + window.location.search);

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      {/* GA4 Scripts */}
      {GA_ID && (
        <>
          <Script
            id="ga4-gtag"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  send_page_view: false
                });
              `,
            }}
          />
        </>
      )}

      {/* WRAP ALL PAGES IN THE NEW NAV + LOGO LAYOUT */}
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp;
