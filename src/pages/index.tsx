// src/pages/index.tsx
import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

// Simple GA4 helper (same pattern as other pages)
const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (typeof window.gtag !== "function") return;

  // @ts-ignore
  window.gtag("event", eventName, {
    ...(params || {}),
    debug_mode: true,
  });
};

const HomePage: NextPage = () => {
  const handleCtaClick = (label: string, path: string) => {
    trackEvent("cta_click", {
      cta_label: label,
      destination: path,
      location: "home_hero",
    });
  };

  return (
    <>
      <Head>
        <title>AutoGradeHQ – Smarter vehicle upgrades before you buy</title>
        <meta
          name="description"
          content="Use AutoGrade to plan the best upgrades for your vehicle and sanity-check fitment before you spend the money."
        />
      </Head>

      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
          {/* Hero */}
          <section className="grid gap-10 lg:grid-cols-[3fr,2fr] items-center mb-16">
            <div>
              {/* Logo row – if you have a logo file, drop it in /public and update the src path */}
              <div className="flex items-center gap-2 mb-4">
                {/* If you already have a logo file like /autograde-logo.svg, uncomment this and update the path
                <Image
                  src="/autograde-logo.svg"
                  alt="AutoGrade logo"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
                */}
                <span className="inline-flex items-center rounded-md bg-slate-900/80 border border-slate-700 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
                  AutoGradeHQ
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-50 mb-3 leading-tight">
                Smarter vehicle upgrades — before you spend the money.
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl mb-5">
                AutoGrade helps you decide what to upgrade first, sanity-check
                fitment risk, and send you straight to trusted retailers for
                parts that actually make sense for your build.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <Link
                  href="/best-upgrades"
                  onClick={() =>
                    handleCtaClick("best_upgrades_primary", "/best-upgrades")
                  }
                  className="inline-flex items-center justify-center rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-colors"
                >
                  Plan the best upgrades
                </Link>

                <Link
                  href="/fitment"
                  onClick={() =>
                    handleCtaClick("fitment_secondary", "/fitment")
                  }
                  className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800/80 transition-colors"
                >
                  Quick fitment sanity check
                </Link>
              </div>

              <p className="text-[11px] text-slate-500">
                No spam and no random “mod list” fluff. Just a clear plan for
                your specific vehicle.
              </p>
            </div>

            {/* Side card: “How it works” */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <p className="text-xs font-semibold text-cyan-300 mb-2">
                How AutoGrade works
              </p>
              <ol className="space-y-3 text-xs text-slate-200">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300 text-[11px] font-semibold">
                    1
                  </span>
                  <div>
                    <p className="font-semibold mb-0.5">
                      Start with your vehicle & driving style
                    </p>
                    <p className="text-slate-400">
                      Year, make, model, plus how you actually use the vehicle
                      (daily, towing, trails, commute, etc.).
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300 text-[11px] font-semibold">
                    2
                  </span>
                  <div>
                    <p className="font-semibold mb-0.5">
                      We prioritize the upgrades that move the needle
                    </p>
                    <p className="text-slate-400">
                      Tires, suspension, and key upgrades are ranked by
                      real-world impact, risk, and budget level.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300 text-[11px] font-semibold">
                    3
                  </span>
                  <div>
                    <p className="font-semibold mb-0.5">
                      Sanity-check fitment and go straight to parts
                    </p>
                    <p className="text-slate-400">
                      Use the fitment tool to gauge rub risk, then follow our
                      links to Tire Rack, RealTruck, or Amazon to shop.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </section>

          {/* Section: Tools overview */}
          <section className="mb-16">
            <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-3">
              Two tools, one workflow
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                <p className="text-[11px] font-semibold text-cyan-300 mb-1">
                  Planner
                </p>
                <h3 className="text-sm font-semibold text-slate-50 mb-1">
                  Best Upgrades Planner
                </h3>
                <p className="text-xs text-slate-300 mb-3">
                  Get a prioritized list of upgrades for your specific vehicle,
                  with notes on budget, tradeoffs, and where to shop.
                </p>
                <ul className="text-[11px] text-slate-400 space-y-1 mb-3 list-disc list-inside">
                  <li>Ranks upgrades by impact vs. cost</li>
                  <li>Shows risk level and what to watch for</li>
                  <li>
                    Optionally emails a compatibility breakdown for a specific
                    upgrade
                  </li>
                </ul>
                <Link
                  href="/best-upgrades"
                  onClick={() =>
                    handleCtaClick("best_upgrades_card", "/best-upgrades")
                  }
                  className="inline-flex items-center rounded-md border border-cyan-400/70 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/10 transition-colors"
                >
                  Open Best Upgrades Planner
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                <p className="text-[11px] font-semibold text-amber-300 mb-1">
                  Checker
                </p>
                <h3 className="text-sm font-semibold text-slate-50 mb-1">
                  Quick Fitment Check
                </h3>
                <p className="text-xs text-slate-300 mb-3">
                  Compare your stock tire size to a new setup and get a rough
                  look at diameter change, speedometer error, and rub risk.
                </p>
                <ul className="text-[11px] text-slate-400 space-y-1 mb-3 list-disc list-inside">
                  <li>Shows diameter and width changes vs. stock</li>
                  <li>Highlights where rubbing and trimming are most likely</li>
                  <li>
                    Designed as a sanity-check before you dig into detailed
                    fitment guides
                  </li>
                </ul>
                <Link
                  href="/fitment"
                  onClick={() =>
                    handleCtaClick("fitment_card", "/fitment")
                  }
                  className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800/70 transition-colors"
                >
                  Open Fitment Check
                </Link>
              </div>
            </div>
          </section>

          {/* Trust / who it's for */}
          <section className="border-t border-slate-800 pt-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-2">
                  Who AutoGrade is for
                </h2>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Daily drivers who just want the “right” tires once</li>
                  <li>
                    Truck & SUV owners planning lifts, bigger tires, or towing
                    upgrades
                  </li>
                  <li>
                    People tired of scrolling forums and YouTube comments for
                    every single part
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-2">
                  How AutoGrade makes money
                </h2>
                <p className="text-xs text-slate-300 mb-1.5">
                  When you click through to retailers like Tire Rack, RealTruck,
                  or Amazon, they may pay a small commission if you end up
                  buying. That never changes your price.
                </p>
                <p className="text-xs text-slate-400">
                  The goal is simple: point you to parts that actually fit your
                  use-case so you don&apos;t waste money, time, or return
                  shipping.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default HomePage;
