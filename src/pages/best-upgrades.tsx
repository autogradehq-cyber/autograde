// src/pages/best-upgrades.tsx
import React, { useState, FormEvent } from "react";
import type { NextPage } from "next";
import type { UpgradeRecommendation } from "./api/recommendations";

// ---- GA4 helper (same pattern as compatibility.tsx) ----
const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (typeof window.gtag !== "function") return;

  // Force debug_mode so events always show in DebugView
  // @ts-ignore
  window.gtag("event", eventName, {
    ...(params || {}),
    debug_mode: true,
  });
};

// ---- Affiliate helpers (reuse same logic as compatibility.tsx) ----
type AffiliateVendor = "amazon" | "tirerack" | "realtruck";

const chooseVendor = (ideaType: string): AffiliateVendor => {
  const t = (ideaType || "").toLowerCase();

  // Tires / wheels → Tire Rack
  if (t.includes("tire") || t.includes("wheel")) return "tirerack";

  // Truck accessories → RealTruck (once Sovrn approves)
  if (
    t.includes("tonneau") ||
    t.includes("bed cover") ||
    t.includes("running board") ||
    t.includes("nerf bar") ||
    t.includes("step")
  ) {
    return "realtruck";
  }

  // Lifts / suspension → Amazon for now
  if (t.includes("lift") || t.includes("suspension") || t.includes("shock")) {
    return "amazon";
  }

  // Default fallback → Amazon
  return "amazon";
};

const buildAffiliateUrl = (
  vendor: AffiliateVendor,
  keywords: string
): string => {
  const params = new URLSearchParams();
  params.set("vendor", vendor);
  params.set("q", keywords || "auto upgrade");
  return `/api/out?${params.toString()}`;
};

// ---- Form state ----
type FormState = {
  year: string;
  make: string;
  model: string;
  trim: string;
  drivingStyle: string;
  budgetLevel: string;
  priorities: string;
};

const initialForm: FormState = {
  year: "",
  make: "",
  model: "",
  trim: "",
  drivingStyle: "",
  budgetLevel: "",
  priorities: "",
};

// Rough cart value bands for revenue modeling
const estimateValueFromPriceBand = (
  priceBand: "budget" | "midrange" | "premium"
) => {
  switch (priceBand) {
    case "budget":
      return 150;
    case "midrange":
      return 500;
    case "premium":
      return 1200;
    default:
      return 300;
  }
};

// Best Upgrades page
const BestUpgradesPage: NextPage = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] =
    useState<UpgradeRecommendation | null>(null);

  // Optional: which “upgrade category” the user is browsing
  const [upgradeCategory, setUpgradeCategory] = useState<string>("tires");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAffiliateClick = (
    ideaType: string,
    vendor: AffiliateVendor,
    priceBand: "budget" | "midrange" | "premium"
  ) => {
    const estimatedValue = estimateValueFromPriceBand(priceBand);

    trackEvent("affiliate_click", {
      page_type: "best_upgrades",
      upgrade_type: ideaType,
      vehicle_year: form.year,
      vehicle_make: form.make,
      vehicle_model: form.model,
      vehicle_trim: form.trim,
      vendor,
      price_band: priceBand,
      affiliate_value: estimatedValue,
      value: estimatedValue,
      currency: "USD",
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");
    setAiRecommendation(null);

    const { year, make, model, trim } = form;

    if (!year || !make || !model) {
      setStatus("error");
      setMessage("Please fill in year, make, and model.");
      return;
    }

    // Track that a user started a “best upgrades” lookup
    trackEvent("form_start", {
      form_type: "best_upgrades",
      upgrade_category: upgradeCategory,
      vehicle_year: year,
      vehicle_make: make,
      vehicle_model: model,
      vehicle_trim: trim,
    });

    setIsSubmitting(true);
    setAiLoading(true);

    try {
      // Use your existing AI recommendations API.
      // We describe the upgrade as a “best X for this vehicle” query.
      const upgradeTypePrompt = (() => {
        switch (upgradeCategory) {
          case "tires":
            return "best all-terrain tires for this vehicle";
          case "wheels":
            return "best wheel and tire combo for this vehicle";
          case "suspension":
            return "best mild lift or leveling kit for this vehicle";
          case "brakes":
            return "best brake upgrade for this vehicle";
          case "lighting":
            return "best lighting upgrade for this vehicle (headlights or fogs)";
          default:
            return "best overall upgrade package for this vehicle";
        }
      })();

      const aiRes = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          make,
          model,
          trim,
          upgradeType: upgradeTypePrompt,
          drivingStyle: form.drivingStyle,
          budgetLevel: form.budgetLevel,
          priorities: form.priorities,
          // NOTE: no email required here – this page is for browsing.
          email: null,
          source: "best_upgrades_page",
        }),
      });

      if (!aiRes.ok) {
        throw new Error("AI recommendation request failed");
      }

      const data = (await aiRes.json()) as {
        ok: boolean;
        recommendation?: UpgradeRecommendation;
      };

      if (data.ok && data.recommendation) {
        setAiRecommendation(data.recommendation);
        setStatus("success");
        setMessage("");
      } else {
        setStatus("error");
        setMessage("We couldn’t generate a recommendation. Please try again.");
      }
    } catch (err) {
      console.error("[best-upgrades] Error calling AI recommendations:", err);
      setStatus("error");
      setMessage(
        "Something went wrong generating upgrades. Please try again in a moment."
      );
    } finally {
      setIsSubmitting(false);
      setAiLoading(false);
    }
  };

  // Derived values for main CTA
  const ideaTypeForAffiliate =
    aiRecommendation?.overview ||
    `${upgradeCategory} upgrade for ${form.year} ${form.make} ${form.model}`;
  const affiliateVendor = chooseVendor(ideaTypeForAffiliate);
  const affiliatePriceBand =
    ((aiRecommendation as any)?.priceBand as
      | "budget"
      | "midrange"
      | "premium") || "midrange";
  const affiliateUrl = buildAffiliateUrl(affiliateVendor, ideaTypeForAffiliate);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <header className="mb-10">
          <p className="text-xs font-semibold text-cyan-300 mb-2">
            AutoGrade Best Upgrades
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 mb-2">
            See the best upgrades for your vehicle, backed by real-world data.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
            Choose your vehicle and an upgrade category. We&apos;ll analyze
            fitment confidence, real-world feedback, and value to surface the
            best upgrade directions, then send you straight to vetted options.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[3fr,2fr] items-start">
          {/* LEFT: Vehicle + category form */}
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="year"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Year*
                  </label>
                  <input
                    id="year"
                    name="year"
                    type="text"
                    value={form.year}
                    onChange={handleChange}
                    placeholder="e.g. 2019"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>

                <div>
                  <label
                    htmlFor="make"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Make*
                  </label>
                  <input
                    id="make"
                    name="make"
                    type="text"
                    value={form.make}
                    onChange={handleChange}
                    placeholder="e.g. Toyota"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>

                <div>
                  <label
                    htmlFor="model"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Model*
                  </label>
                  <input
                    id="model"
                    name="model"
                    type="text"
                    value={form.model}
                    onChange={handleChange}
                    placeholder="e.g. Tacoma"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>

                <div>
                  <label
                    htmlFor="trim"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Trim (optional)
                  </label>
                  <input
                    id="trim"
                    name="trim"
                    type="text"
                    value={form.trim}
                    onChange={handleChange}
                    placeholder="e.g. TRD Off-Road"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>
              </div>

              {/* Upgrade category pills */}
              <div>
                <p className="block text-xs font-medium text-slate-300 mb-1">
                  Upgrade category
                </p>
                <div className="flex flex-wrap gap-2">
                  {["tires", "wheels", "suspension", "brakes", "lighting"].map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setUpgradeCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-[11px] border ${
                          upgradeCategory === cat
                            ? "bg-cyan-500 text-slate-950 border-cyan-400"
                            : "bg-slate-950/60 text-slate-300 border-slate-700 hover:border-cyan-400/60"
                        }`}
                      >
                        {cat[0].toUpperCase() + cat.slice(1)}
                      </button>
                    )
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  We will generate the best upgrade direction in this category
                  for your specific vehicle.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="drivingStyle"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Driving style (optional)
                  </label>
                  <input
                    id="drivingStyle"
                    name="drivingStyle"
                    type="text"
                    value={form.drivingStyle}
                    onChange={handleChange}
                    placeholder="e.g. daily, light off-road"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>

                <div>
                  <label
                    htmlFor="budgetLevel"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Budget level (optional)
                  </label>
                  <input
                    id="budgetLevel"
                    name="budgetLevel"
                    type="text"
                    value={form.budgetLevel}
                    onChange={handleChange}
                    placeholder="e.g. budget, midrange, premium"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>

                <div>
                  <label
                    htmlFor="priorities"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Top priority (optional)
                  </label>
                  <input
                    id="priorities"
                    name="priorities"
                    type="text"
                    value={form.priorities}
                    onChange={handleChange}
                    placeholder="e.g. comfort, towing, mpg"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Finding the best upgrades..."
                  : "Show best upgrades for my vehicle"}
              </button>

              {status === "error" && (
                <p className="text-xs text-red-400">{message}</p>
              )}
            </form>

            <p className="mt-3 text-[11px] text-slate-500">
              Fitment confidence is based on patterns from similar vehicles,
              reported real-world installs, and vendor data where available.
              Always double-check exact part numbers before you buy.
            </p>
          </section>

          {/* RIGHT: AI recommendation & upgrade ideas */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                Best upgrades for your {form.year || "vehicle"}
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Once you run the search, we&apos;ll show an upgrade direction
                and shopping links tuned for your specific vehicle.
              </p>

              {aiLoading && (
                <p className="text-xs text-cyan-300">
                  Crunching the data for your setup… this usually takes a few
                  seconds.
                </p>
              )}

              {!aiLoading && !aiRecommendation && (
                <p className="text-xs text-slate-500">
                  Enter your vehicle and choose an upgrade category to see
                  AutoGrade&apos;s best picks here.
                </p>
              )}

              {!aiLoading && aiRecommendation && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1">
                      Overview
                    </p>
                    <p className="text-xs text-slate-300">
                      {aiRecommendation.overview}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                      <p className="text-slate-400 mb-0.5">Fitment</p>
                      <p className="text-slate-50 font-semibold">
                        {aiRecommendation.fitmentConfidence}/100
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                      <p className="text-slate-400 mb-0.5">Value</p>
                      <p className="text-slate-50 font-semibold">
                        {aiRecommendation.valueScore}/100
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                      <p className="text-slate-400 mb-0.5">Performance</p>
                      <p className="text-slate-50 font-semibold">
                        {aiRecommendation.performanceImpact}/100
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1">
                      Risk &amp; decision
                    </p>
                    <p className="text-[11px] text-slate-400 mb-1">
                      Risk level:{" "}
                      <span className="font-semibold text-slate-100">
                        {aiRecommendation.riskLevel}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-300">
                      {(aiRecommendation as any).decisionSummary ??
                        (aiRecommendation as any).decision ??
                        ""}
                    </p>
                  </div>

                  {/* Main affiliate CTA */}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        handleAffiliateClick(
                          ideaTypeForAffiliate,
                          affiliateVendor,
                          affiliatePriceBand
                        );
                        if (typeof window !== "undefined") {
                          window.location.href = affiliateUrl;
                        }
                      }}
                      className="w-full rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold py-2 mt-1 hover:bg-cyan-400 transition"
                    >
                      View this upgrade direction on{" "}
                      {affiliateVendor === "tirerack"
                        ? "Tire Rack"
                        : affiliateVendor === "realtruck"
                        ? "RealTruck"
                        : "Amazon"}
                    </button>
                  </div>

                  {/* Suggested upgrade ideas as cards */}
                  {aiRecommendation.recommendedUpgradeIdeas?.length ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-1">
                        Suggested upgrade ideas
                      </p>
                      <ul className="space-y-2">
                        {aiRecommendation.recommendedUpgradeIdeas.map(
                          (idea, idx) => {
                            const vendor = chooseVendor(idea.type || "");
                            const priceBand =
                              (idea.priceBand as
                                | "budget"
                                | "midrange"
                                | "premium") || "midrange";
                            const keywords = `${form.year} ${form.make} ${form.model} ${idea.type} ${idea.name}`.trim();
                            const href = buildAffiliateUrl(
                              vendor,
                              keywords || idea.name
                            );

                            return (
                              <li
                                key={idx}
                                className="rounded-lg bg-slate-950/60 border border-slate-800 p-3"
                              >
                                <p className="text-xs font-semibold text-slate-100">
                                  {idea.name}
                                </p>
                                <p className="text-[11px] text-slate-400 mb-1">
                                  {idea.summary}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Price band:{" "}
                                  <span className="text-slate-200">
                                    {idea.priceBand}
                                  </span>
                                </p>
                                <p className="text-[11px] text-slate-500 mb-2">
                                  Example approach:{" "}
                                  <span className="text-slate-200">
                                    {idea.examplePartHint}
                                  </span>
                                </p>

                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() =>
                                    handleAffiliateClick(
                                      idea.type || idea.name,
                                      vendor,
                                      priceBand
                                    )
                                  }
                                  className="inline-flex items-center rounded-md border border-cyan-400/70 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/10 transition-colors"
                                >
                                  {vendor === "amazon" &&
                                    "Shop this idea on Amazon"}
                                  {vendor === "tirerack" &&
                                    "Shop this idea on Tire Rack"}
                                  {vendor === "realtruck" &&
                                    "Shop this idea on RealTruck"}
                                </a>
                              </li>
                            );
                          }
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default BestUpgradesPage;
