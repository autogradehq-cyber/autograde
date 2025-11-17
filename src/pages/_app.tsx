// FILE: src/pages/_app.tsx
// Next.js Pages Router + GA4 using next/script

import type { AppProps } from "next/app";
import Script from "next/script";
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* GA4: load the gtag library AFTER the app becomes interactive */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-W1BZMF7XNP"
        strategy="afterInteractive"
      />

      {/* GA4: initialize and enable debug_mode so DebugView sees you */}
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-W1BZMF7XNP', { debug_mode: true });
        `}
      </Script>

      {/* Render all pages */}
      <Component {...pageProps} />
    </>
  );
}
