// src/pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { useRouter } from "next/router";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const isActive = (href: string) => {
    // Highlight for exact match or nested routes (like /best-upgrades/2020/...)
    return router.pathname === href || router.pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Global header with logo + nav */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo / brand */}
          <Link href="/" className="flex items-center gap-2">
            {/* If you have a real logo file in /public (e.g. /autograde-logo.svg),
                replace this square with an <img> or <Image> */}
            <span className="inline-flex items-center gap-2 cursor-pointer">
              <span className="h-7 w-7 rounded-md bg-cyan-400/10 border border-cyan-400/40 flex items-center justify-center text-[10px] font-black text-cyan-300">
                AG
              </span>
              <span className="text-sm sm:text-base font-semibold text-slate-50">
                AutoGrade
              </span>
            </span>
          </Link>

          {/* Main navigation – only 2 flows for users */}
          <nav className="flex items-center gap-3 text-xs sm:text-sm">
            <Link
              href="/best-upgrades"
              className={
                "px-3 py-1.5 rounded-md font-medium " +
                (isActive("/best-upgrades")
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-50")
              }
            >
              Best upgrades &amp; compatibility
            </Link>

            <Link
              href="/fitment"
              className={
                "px-3 py-1.5 rounded-md font-medium " +
                (isActive("/fitment")
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-50")
              }
            >
              Fitment check
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
