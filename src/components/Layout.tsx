// src/components/Layout.tsx
import { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Logo from "./Logo";

type LayoutProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/best-upgrades", label: "Best Upgrades" },
  { href: "/compatibility", label: "Compatibility Check" },
  { href: "/fitment", label: "Fitment Tool" },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return router.pathname === "/";
    return router.pathname === href || router.pathname.startsWith(href);
  };

  const handleNavClick = () => {
    // Close mobile menu after navigation
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Sticky Brand Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-3.5">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-4 text-sm font-medium text-slate-300 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-full px-3 py-1.5 transition-colors",
                  isActive(item.href)
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                    : "hover:text-slate-50 hover:bg-slate-800/70",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 px-2.5 py-2 text-slate-200 hover:bg-slate-800 sm:hidden"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="sr-only">Toggle navigation</span>
            <div className="flex flex-col gap-1.5">
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition-transform ${
                  mobileOpen ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition-opacity ${
                  mobileOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition-transform ${
                  mobileOpen ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile nav dropdown */}
        <div
          className={`sm:hidden transition-[max-height,opacity] duration-200 ease-out ${
            mobileOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden border-t border-slate-800`}
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 text-sm font-medium text-slate-200">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={[
                  "rounded-lg px-3 py-2 transition-colors",
                  isActive(item.href)
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                    : "hover:bg-slate-800/80 hover:text-slate-50",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pt-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
