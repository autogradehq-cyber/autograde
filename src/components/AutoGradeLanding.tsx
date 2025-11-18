// src/components/AutoGradeLanding.tsx
import React, { useState, FormEvent } from "react";
import Link from "next/link";

// Simple GA4 event helper
const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (typeof window.gtag !== "function") return;
  // @ts-ignore
  window.gtag("event", eventName, params || {});
};

const AutoGradeLanding: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleHeroClick = () => {
    trackEvent("cta_click", {
      form_type: "compatibility",
      location: "hero_primary",
    });
  };

  const handlePriceAlertSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage("");

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage("Please enter your email.");
      setStatus("error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) throw new Error("Request failed");

      trackEvent("price_alert_interest", {
        form_type: "price_alert",
        location: "landing_price_alert_strip",
      });

      setStatus("success");
      setEmail("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* HERO */}
      <section className="flex-1">
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-10 sm:pt-20 sm:pb-16 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            {/* Left: main copy */}
            <div>
              <p className="inline-flex items-center rounded-full bg-slate-900/90 border border-cyan-500/40 px-3 py-1 text-[11px] font-medium text-cyan-300 mb-4">
                AutoGradeHQ · Upgrade decisions that actually fit
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-50 mb-3">
                Upgrade smarter.
                <br />
                <span className="text-cyan-300">Know what fits your vehicle.</span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base mb-6 max-w-md">
                Instant compatibility checks and data-backed recommendations for
                wheels, suspension, exhaust, lighting, and more.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Link
                  href="/compatibility"
                  onClick={handleHeroClick}
                  className="inline-flex items-center justify-center rounded-md bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-colors"
                >
                  Check upgrade compatibility
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-md border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/80 transition-colors"
                >
                  See how it works
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
                <span>✔ Reduce bad fitment & returns</span>
                <span className="hidden sm:inline-block">•</span>
                <span>✔ Built for real enthusiasts</span>
                <span className="hidden sm:inline-block">•</span>
                <span>✔ Free to start</span>
              </div>
            </div>

            {/* Right: tool-style preview card */}
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full -z-10" />
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-2xl shadow-slate-950/80">
                <p className="text-xs font-semibold text-slate-300 mb-3">
                  Quick preview · Compatibility check
                </p>

                <div className="space-y-3 text-[11px] sm:text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Year</label>
                      <div className="h-8 rounded-md bg-slate-950/70 border border-slate-700 flex items-center px-2 text-slate-500">
                        2019
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Make</label>
                      <div className="h-8 rounded-md bg-slate-950/70 border border-slate-700 flex items-center px-2 text-slate-500">
                        Toyota
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Model</label>
                      <div className="h-8 rounded-md bg-slate-950/70 border border-slate-700 flex items-center px-2 text-slate-500">
                        Tacoma
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Trim</label>
                      <div className="h-8 rounded-md bg-slate-950/70 border border-slate-700 flex items-center px-2 text-slate-500">
                        TRD Off-Road
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Upgrade type
                    </label>
                    <div className="h-8 rounded-md bg-slate-950/70 border border-slate-700 flex items-center px-2 text-slate-500">
                      2&quot; lift · All-terrain tires
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-200">
                        AutoGrade score
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Strong fit · 8.7/10
                      </span>
                    </div>
                    <ul className="text-[11px] text-slate-400 space-y-1">
                      <li>• Clears at full lock with minor trimming.</li>
                      <li>• Daily drivability remains comfortable.</li>
                      <li>• Pricing is fair vs similar setups.</li>
                    </ul>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2">
                    This is a visual example. Run your actual vehicle and
                    upgrade combo on the compatibility tool.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-t border-slate-900 bg-slate-950/95">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid gap-4 sm:grid-cols-3 text-[11px] sm:text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-300">✔</span>
              <div>
                <p className="font-semibold text-slate-100 mb-0.5">
                  Built for real owners
                </p>
                <p>Not generic fitment tables—real-world use cases.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-300">✔</span>
              <div>
                <p className="font-semibold text-slate-100 mb-0.5">
                  Data-backed picks
                </p>
                <p>Weighs price, reliability, and performance together.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-300">✔</span>
              <div>
                <p className="font-semibold text-slate-100 mb-0.5">
                  Reduce returns & rework
                </p>
                <p>Know what fits before you click &quot;buy&quot;.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="border-t border-slate-900 bg-slate-950"
      >
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
              How AutoGrade works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              A simple flow that checks compatibility first, then grades value and
              performance so you can buy with confidence.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-sm font-semibold mb-3">
                1
              </div>
              <p className="text-sm font-semibold text-slate-100 mb-1">
                Enter your vehicle
              </p>
              <p className="text-xs text-slate-400">
                Year, make, model, and trim—so we match parts to your exact
                setup, not just &quot;close enough&quot;.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-sm font-semibold mb-3">
                2
              </div>
              <p className="text-sm font-semibold text-slate-100 mb-1">
                Choose your upgrade
              </p>
              <p className="text-xs text-slate-400">
                Wheels, tires, suspension, exhaust, lighting, and more—AutoGrade
                checks fitment and potential issues.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-sm font-semibold mb-3">
                3
              </div>
              <p className="text-sm font-semibold text-slate-100 mb-1">
                Review your AutoGrade
              </p>
              <p className="text-xs text-slate-400">
                See a clear go / caution / avoid signal with notes on rubbing,
                ride quality, reliability, and pricing vs alternatives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICE ALERT STRIP */}
      <section className="border-t border-slate-900 bg-slate-950/95">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-6 sm:px-6 sm:py-7 flex flex-col md:flex-row gap-5 md:items-center md:justify-between">
            <div className="max-w-md">
              <h3 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                Get price alerts on high-value upgrades
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Drop your email and we&apos;ll notify you when we spot strong deals on
                well-rated parts that fit your vehicle.
              </p>
            </div>

            <form
              onSubmit={handlePriceAlertSubmit}
              className="w-full md:max-w-sm space-y-2"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-md bg-cyan-400 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Adding..." : "Notify me"}
                </button>
              </div>

              {status === "success" && (
                <p className="text-[11px] text-emerald-400">
                  You&apos;re on the list. We&apos;ll only email for legit value, not spam.
                </p>
              )}

              {status === "error" && errorMessage && (
                <p className="text-[11px] text-red-400">{errorMessage}</p>
              )}

              <p className="text-[10px] text-slate-500">
                No spam. Unsubscribe with one click.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} AutoGradeHQ. All rights reserved.</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500">
            AutoGrade doesn&apos;t sell parts. We help you choose smarter upgrades
            through data-driven guidance and affiliate partners.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default AutoGradeLanding;
