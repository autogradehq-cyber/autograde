
// FILE: src/components/AutoGradeLanding.tsx
// Main marketing/landing page for AutoGradeHQ
// NOTE: This page MUST NOT fire `generate_lead`. That event only lives on /compatibility.

import { useRouter } from "next/router";
import { useCallback } from "react";

function sendGaEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (!w.gtag) return;

  w.gtag("event", name, params);
}

export default function AutoGradeLanding() {
  const router = useRouter();

  const handlePrimaryCta = useCallback(() => {
    sendGaEvent("cta_click", {
      location: "hero",
      label: "check_compatibility",
      destination: "/compatibility",
    });
    router.push("/compatibility");
  }, [router]);

  const handleSecondaryCta = useCallback(() => {
    sendGaEvent("cta_click", {
      location: "hero",
      label: "learn_how_it_works",
      destination: "#how-it-works",
    });
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handlePriceAlertInterest = useCallback(() => {
    // Soft intent – does NOT count as a lead
    sendGaEvent("price_alert_interest", {
      location: "price-alert-card",
      label: "notify_me_when_live",
    });
    alert(
      "Price alerts will be available soon. For now, use the compatibility check to get upgrade advice."
    );
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16">
        <header className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-indigo-300">
            AutoGradeHQ
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-black tracking-tight">
            Get the <span className="text-indigo-400">right upgrade</span>{" "}
            for your vehicle the first time.
          </h1>
          <p className="mt-4 text-sm md:text-base text-neutral-300">
            AutoGradeHQ checks your planned upgrades against real fitment data,
            return patterns, and install history so you avoid bad fits, wasted
            weekends, and costly returns.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePrimaryCta}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Check my upgrade compatibility
            </button>
            <button
              type="button"
              onClick={handleSecondaryCta}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-100 hover:bg-neutral-900"
            >
              See how AutoGrade works
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            Start with your daily driver or truck. No account required.
          </p>
        </header>

        {/* Quick trust row */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-neutral-400">
          <div>
            <div className="text-sm font-semibold text-neutral-100">
              Fitment-first
            </div>
            <p>Built to reduce returns and wrong-fit installs.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-100">
              Upgrade insight
            </div>
            <p>Headlights, wheels, suspension, tuning, and more.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-100">
              Data-informed
            </div>
            <p>Powered by real-world upgrade and return patterns.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-100">
              You stay in control
            </div>
            <p>No spam. We only email you compatibility results.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-6 pb-16 border-t border-neutral-900 pt-10"
      >
        <h2 className="text-lg md:text-xl font-semibold">
          How AutoGradeHQ works
        </h2>
        <p className="mt-2 text-sm text-neutral-300 max-w-2xl">
          We&apos;re building a fitment engine designed to help you choose
          upgrades with confidence, starting with high-intent compatibility
          checks instead of endless browsing.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
            <div className="text-xs font-semibold uppercase text-indigo-300">
              Step 1
            </div>
            <h3 className="mt-1 font-semibold text-neutral-50">
              Tell us your vehicle & upgrade
            </h3>
            <p className="mt-2 text-neutral-300">
              Share your year, make, model, trim, and the upgrade you&apos;re
              considering (e.g., headlights, wheels, leveling kit, exhaust).
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
            <div className="text-xs font-semibold uppercase text-indigo-300">
              Step 2
            </div>
            <h3 className="mt-1 font-semibold text-neutral-50">
              AutoGrade checks compatibility
            </h3>
            <p className="mt-2 text-neutral-300">
              We compare your vehicle and upgrade against curated fitment data,
              install patterns, and known problem combos.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
            <div className="text-xs font-semibold uppercase text-indigo-300">
              Step 3
            </div>
            <h3 className="mt-1 font-semibold text-neutral-50">
              You get a clear recommendation
            </h3>
            <p className="mt-2 text-neutral-300">
              We email you a simple breakdown: what fits, what doesn&apos;t,
              and which options offer the best value for your build.
            </p>
          </div>
        </div>
      </section>

      {/* Soft-intent / future features */}
      <section className="mx-auto max-w-6xl px-6 pb-20 border-t border-neutral-900 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <h3 className="text-sm font-semibold text-neutral-50">
              Coming soon: price alerts & bundle recommendations
            </h3>
            <p className="mt-2 text-sm text-neutral-300">
              We&apos;re working on tracking price history and bundle discounts
              across popular retailers so we can tell you not just{" "}
              <em>what fits</em>, but also <em>when to buy</em>.
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              Tap the button below to register interest. This will not count as
              a lead in our system — it simply helps us understand demand.
            </p>

            <button
              type="button"
              onClick={handlePriceAlertInterest}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-amber-400/60 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
            >
              Notify me when price alerts go live
            </button>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-300">
            <h3 className="text-sm font-semibold text-neutral-50 mb-2">
              Why we don&apos;t guess on fitment
            </h3>
            <p>
              Most upgrade purchases break down at the fitment step: wrong
              headlight housings, wheels that rub, suspension that doesn&apos;t
              match the intended use. AutoGradeHQ is designed to reduce that
              friction, not add to it.
            </p>
            <p className="mt-2">
              That&apos;s why the only &quot;hard&quot; event we track as a
              lead is when you submit a full compatibility check. Everything
              else, like this interest button, is treated as soft engagement
              — useful for learning, but never counted as a lead.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
