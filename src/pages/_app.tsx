// src/pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import * as gtag from "../lib/gtag";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Highlight active nav link
  const isActive = (href: string) =>
    router.pathname === href || router.asPath.startsWith(href);

  // GA4 pageview tracking
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      {/* Load GA script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        strategy="afterInteractive"
      />

      {/* GA init */}
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
            debug_mode: true
          });
        `}
      </Script>

      {/* TOP NAV */}
      <nav className="bg-slate-950 border-b border-slate-800 text-slate-100 px-6 py-3 flex items-center gap-8">
        {/* Logo (text-based for now — we can add the graphic logo again next) */}
        <Link href="/" className="font-bold text-lg tracking-tight">
          AutoGrade
        </Link>

        <div className="flex gap-6 text-sm">
          <Link
            href="/compatibility"
            className={isActive("/compatibility") ? "text-cyan-400" : "text-slate-300 hover:text-white"}
          >
            Compatibility Check
          </Link>

          <Link
            href="/best-upgrades"
            className={isActive("/best-upgrades") ? "text-cyan-400" : "text-slate-300 hover:text-white"}
          >
            Best Upgrades
          </Link>

          <Link
            href="/fitment"
            className={isActive("/fitment") ? "text-cyan-400" : "text-slate-300 hover:text-white"}
          >
            Tire Fitment Tool
          </Link>
        </div>
      </nav>

      {/* Page Content */}
      <Component {...pageProps} />

      {/* FOOTER */}
      <footer className="text-center text-[13px] text-slate-600 py-10">
        AutoGrade © {new Date().getFullYear()}
      </footer>
    </>
  );
}
