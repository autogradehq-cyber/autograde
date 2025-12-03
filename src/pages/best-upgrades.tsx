// src/pages/best-upgrades.tsx
import React, { useState, FormEvent } from "react";
import type { NextPage } from "next";

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

// ---- Affiliate helpers ----
type AffiliateVendor = "amazon" | "tirerack" | "realtruck";

const chooseVendor = (ideaType: string): AffiliateVendor => {
  const t = (ideaType || "").toLowerCase();

  if (t.includes("tire") || t.includes("wheel")) return "tirerack";

  if (
    t.includes("tonneau") ||
    t.includes("bed cover") ||
    t.includes("running board") ||
    t.includes("nerf bar") ||
    t.includes("step")
  ) {
    return "realtruck";
  }

  return "amazon";
};

const buildAffiliateUrl = (vendor: AffiliateVendor, keywords: string): string => {
  const params = new URLSearchParams();
  params.set("vendor", vendor);
  params.set("q", keywords || "auto upgrade");
  return `/api/out?${params.toString()}`;
};

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

// ---- Types matching API shape ----
type BestUpgradeIdea = {
  name: string;
  type: string;
  summary: string;
  priceBand: "budget" | "midrange" | "premium";
  examplePartHint: string;
  bestFor: string;
  potentialIssues: string[];
  // optional fitment score if API ever sends it
  fitmentConfidence?: number;
};

type BestUpgradeCategory = {
  id: string;
  label: string;
  priorityRank: number;
  rationale: string;
  recommendedBudgetBand: "budget" | "midrange" | "premium";
  riskLevel: "low" | "medium" | "high";
  ideas: BestUpgradeIdea[];
  overallNote: string;
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

// ---- Fitment confidence + risk visual helpers ----
const computeFitmentConfidence = (
  idea: BestUpgradeIdea,
  category: BestUpgradeCategory
) => {
  if (typeof idea.fitmentConfidence === "number") {
    const clamped = Math.max(60, Math.min(99, idea.fitmentConfidence));
    return clamped;
  }

  switch (category.riskLevel) {
    case "low":
      return 92;
    case "medium":
      return 82;
    case "high":
      return 72;
    default:
      return 80;
  }
};

const riskPillClasses = (risk: BestUpgradeCategory["riskLevel"]) => {
  switch (risk) {
    case "low":
      return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40";
    case "medium":
      return "bg-amber-500/10 text-amber-300 border border-amber-500/40";
    case "high":
      return "bg-red-500/10 text-red-300 border border-red-500/40";
    default:
      return "bg-slate-700/60 text-slate-200 border border-slate-500/40";
  }
};

const fitmentPillClasses = (score: number) => {
  if (score >= 90) return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40";
  if (score >= 80) return "bg-amber-500/10 text-amber-300 border border-amber-500/40";
  return "bg-red-500/10 text-red-300 border border-red-500/40";
};

// ---- Heuristic recommended products per idea (for affiliate links) ----
type RecommendedProduct = {
  name: string;
  vendor: AffiliateVendor;
  keywords: string;
  note: string;
};

const getRecommendedProducts = (
  idea: BestUpgradeIdea,
  category: BestUpgradeCategory,
  vehicleLabel: string
): RecommendedProduct[] => {
  const t = `${idea.type} ${idea.name} ${category.label}`.toLowerCase();

  // Tires / wheels
  if (t.includes("tire") || t.includes("all-terrain") || t.includes("wheel")) {
    const vendor: AffiliateVendor = "tirerack";
    return [
      {
        name: "Falken Wildpeak A/T3W",
        vendor,
        keywords: `${vehicleLabel} Falken Wildpeak A/T3W all-terrain tires`,
        note: "Balanced all-terrain tire often praised for wet and snow traction.",
      },
      {
        name: "Yokohama Geolandar A/T G015",
        vendor,
        keywords: `${vehicleLabel} Yokohama Geolandar G015 all-terrain tires`,
        note: "Mild A/T with good road manners and all-weather grip.",
      },
      {
        name: "Michelin Defender LTX M/S",
        vendor,
        keywords: `${vehicleLabel} Michelin Defender LTX highway all-season`,
        note: "High-end highway tire with strong longevity and comfort.",
      },
    ];
  }

  // Suspension
  if (
    t.includes("shock") ||
    t.includes("strut") ||
    t.includes("suspension") ||
    t.includes("lift") ||
    t.includes("level")
  ) {
    const vendor: AffiliateVendor = "amazon";
    return [
      {
        name: "Bilstein 5100 ride-height adjustable shocks",
        vendor,
        keywords: `${vehicleLabel} Bilstein 5100 shocks`,
        note: "Popular choice for trucks/SUVs wanting better control and mild leveling.",
      },
      {
        name: "KYB Excel-G or Gas-a-Just",
        vendor,
        keywords: `${vehicleLabel} KYB shocks struts Excel-G`,
        note: "OE-style replacement that restores control without going too firm.",
      },
    ];
  }

  // Brakes
  if (t.includes("brake") || t.includes("rotor") || t.includes("pad")) {
    const vendor: AffiliateVendor = "amazon";
    return [
      {
        name: "PowerStop Z36 Truck & Tow kit",
        vendor,
        keywords: `${vehicleLabel} PowerStop Z36 brake kit`,
        note: "Often used on trucks/SUVs that tow or run larger tires.",
      },
      {
        name: "OEM-equivalent ceramic pad + rotor kit",
        vendor,
        keywords: `${vehicleLabel} ceramic brake pads rotors kit`,
        note: "Quiet, low-dust option for daily driving.",
      },
    ];
  }

  // Default generic examples via Amazon
  const vendor: AffiliateVendor = "amazon";
  return [
    {
      name: `${idea.name} for ${vehicleLabel}`,
      vendor,
      keywords: `${vehicleLabel} ${idea.name} ${idea.type}`,
      note: "Search results tailored around this upgrade direction.",
    },
  ];
};

// ---- Page component ----
const BestUpgradesPage: NextPage = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");
  const [categories, setCategories] = useState<BestUpgradeCategory[] | null>(null);

  // track which idea cards are expanded
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const vehicleLabel = [form.year, form.make, form.model, form.trim]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const handleAffiliateClick = (
    idea: BestUpgradeIdea,
    vendor: AffiliateVendor
  ) => {
    const estimatedValue = estimateValueFromPriceBand(idea.priceBand);

    trackEvent("affiliate_click", {
      upgrade_type: idea.type || idea.name,
      vehicle_year: form.year,
      vehicle_make: form.make,
      vehicle_model: form.model,
      vehicle_trim: form.trim,
      vendor,
      price_band: idea.priceBand,
      affiliate_value: estimatedValue,
      value: estimatedValue,
      currency: "USD",
      source_page: "best_upgrades",
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    setCategories(null);

    const { year, make, model } = form;
    if (!year || !make || !model) {
      setStatus("error");
      setMessage("Please enter at least year, make, and model.");
      return;
    }

    trackEvent("best_upgrades_submit", {
      vehicle_year: year,
      vehicle_make: make,
      vehicle_model: model,
      vehicle_trim: form.trim,
      driving_style: form.drivingStyle,
      budget_level: form.budgetLevel,
      priorities: form.priorities,
    });

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bestupgrades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await res.json()) as {
        ok: boolean;
        categories?: BestUpgradeCategory[];
        error?: string;
      };

      if (!res.ok || !data.ok || !data.categories) {
        setStatus("error");
        setMessage(
          data.error || "We couldn’t generate upgrades. Please try again."
        );
      } else {
        setCategories(data.categories);
        setStatus("success");
        setMessage(
          "Here’s how we’d prioritize upgrades for your setup. Start at Priority 1 and work down."
        );

        // auto-open first idea of each category
        const nextOpen: Record<string, boolean> = {};
        data.categories.forEach((cat) => {
          if (cat.ideas && cat.ideas.length > 0) {
            const key = `${cat.id}-${0}`;
            nextOpen[key] = true;
          }
        });
        setOpenCards(nextOpen);
      }
    } catch (err) {
      console.error("[best-upgrades] submit error:", err);
      setStatus("error");
      setMessage(
        "Something went wrong. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCard = (catId: string, idx: number) => {
    const key = `${catId}-${idx}`;
    setOpenCards((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <header className="mb-10">
          <p className="text-xs font-semibold text-cyan-300 mb-2">
            AutoGrade Best Upgrades
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 mb-2">
            See the best upgrades for your vehicle — before you spend the money.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
            Enter your vehicle and a bit about how you drive. We&apos;ll suggest
            the highest-impact upgrades first, with fitment notes, tradeoffs, and
            links to shop from retailers that specialize in each type of part.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[3fr,2fr] items-start">
          {/* LEFT: FORM */}
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
                    placeholder="e.g. 2020"
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
                    placeholder="e.g. highway commute, mild trails"
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
                  ? "Crunching the best upgrade order..."
                  : "Show best upgrades for my vehicle"}
              </button>

              {status === "success" && (
                <p className="text-xs text-emerald-400">{message}</p>
              )}
              {status === "error" && (
                <p className="text-xs text-red-400">{message}</p>
              )}

              <p className="text-[11px] text-slate-500">
                We don&apos;t claim live pricing or inventory. Always double-check
                final part numbers with a retailer fitment tool before you buy.
              </p>
            </form>
          </section>

          {/* RIGHT: RESULTS */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              {categories && categories.length > 0 ? (
                <>
                  <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                    Best upgrades for {vehicleLabel || "your vehicle"}
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    We&apos;ll prioritize the upgrades that usually make the biggest
                    difference first. Click into a card to see why it matters and
                    where to shop.
                  </p>

                  <div className="space-y-5">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <p className="text-[11px] font-semibold text-cyan-300">
                            PRIORITY {cat.priorityRank}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold bg-slate-800 text-slate-200 border border-slate-600">
                              Budget: {cat.recommendedBudgetBand}
                            </span>
                            <span
                              className={
                                "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold " +
                                riskPillClasses(cat.riskLevel)
                              }
                            >
                              Risk: {cat.riskLevel}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                          {cat.label}
                        </h3>
                        <p className="text-xs text-slate-300 mb-3">
                          {cat.rationale}
                        </p>

                        <div className="space-y-3">
                          {cat.ideas.map((idea, idx) => {
                            const key = `${cat.id}-${idx}`;
                            const open = openCards[key] ?? idx === 0;
                            const fitmentScore = computeFitmentConfidence(
                              idea,
                              cat
                            );

                            const products = getRecommendedProducts(
                              idea,
                              cat,
                              vehicleLabel || "this vehicle"
                            );

                            const vendorForIdea = chooseVendor(idea.type || idea.name);

                            const baseKeywords = `${form.year} ${form.make} ${form.model} ${idea.type} ${idea.name}`.trim();
                            const affiliateHref = buildAffiliateUrl(
                              vendorForIdea,
                              baseKeywords
                            );

                            return (
                              <div
                                key={key}
                                className="rounded-lg bg-slate-900/80 border border-slate-800"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleCard(cat.id, idx)}
                                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                                >
                                  <div>
                                    <p className="text-xs font-semibold text-slate-100">
                                      {idea.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 line-clamp-1">
                                      {idea.summary}
                                    </p>
                                  </div>
                                  <div className="ml-3 flex flex-col items-end gap-1">
                                    <span
                                      className={
                                        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold " +
                                        fitmentPillClasses(fitmentScore)
                                      }
                                    >
                                      Fitment: {fitmentScore}%
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {open ? "Hide details" : "Show details"}
                                    </span>
                                  </div>
                                </button>

                                {open && (
                                  <div className="px-3 pb-3 pt-1 border-t border-slate-800 text-[11px] text-slate-300 space-y-2">
                                    <p>{idea.summary}</p>

                                    <p>
                                      <span className="font-semibold text-slate-200">
                                        Best for:
                                      </span>{" "}
                                      {idea.bestFor}
                                    </p>

                                    <p>
                                      <span className="font-semibold text-slate-200">
                                        Price band:
                                      </span>{" "}
                                      {idea.priceBand}
                                    </p>

                                    <p>
                                      <span className="font-semibold text-slate-200">
                                        Example approach:
                                      </span>{" "}
                                      {idea.examplePartHint}
                                    </p>

                                    {idea.potentialIssues &&
                                      idea.potentialIssues.length > 0 && (
                                        <div>
                                          <p className="font-semibold text-slate-200 mb-0.5">
                                            Things to watch for:
                                          </p>
                                          <ul className="list-disc list-inside space-y-0.5">
                                            {idea.potentialIssues.map(
                                              (issue, iidx) => (
                                                <li key={iidx}>{issue}</li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                      )}

                                    {products && products.length > 0 && (
                                      <div>
                                        <p className="font-semibold text-slate-200 mb-0.5">
                                          Recommended examples:
                                        </p>
                                        <ul className="space-y-0.5">
                                          {products.map((p, pIdx) => {
                                            const href = buildAffiliateUrl(
                                              p.vendor,
                                              p.keywords
                                            );
                                            return (
                                              <li key={pIdx}>
                                                <a
                                                  href={href}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  onClick={() =>
                                                    handleAffiliateClick(
                                                      idea,
                                                      p.vendor
                                                    )
                                                  }
                                                  className="underline decoration-cyan-400/60 text-cyan-300 hover:text-cyan-200"
                                                >
                                                  {p.name}
                                                </a>
                                                {p.note && (
                                                  <span className="text-slate-400">
                                                    {" "}
                                                    – {p.note}
                                                  </span>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}

                                    <div className="pt-2 flex flex-wrap gap-2">
                                      <a
                                        href={affiliateHref}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={() =>
                                          handleAffiliateClick(
                                            idea,
                                            vendorForIdea
                                          )
                                        }
                                        className="inline-flex items-center rounded-md border border-cyan-400/70 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/10 transition-colors"
                                      >
                                        {vendorForIdea === "tirerack" &&
                                          "Shop this idea on Tire Rack"}
                                        {vendorForIdea === "realtruck" &&
                                          "Shop this idea on RealTruck"}
                                        {vendorForIdea === "amazon" &&
                                          "Shop this idea on Amazon"}
                                      </a>

                                      <a
                                        href="/compatibility"
                                        className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors"
                                      >
                                        Check detailed fitment first
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400">
                          {cat.overallNote}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : status === "loading" ? (
                <p className="text-xs text-cyan-300">
                  Crunching upgrade options for your vehicle…
                </p>
              ) : (
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                    AutoGrade best upgrades
                  </h2>
                  <p className="text-xs text-slate-400">
                    Fill in your vehicle on the left and we&apos;ll rank upgrade
                    categories by impact, show fitment confidence, and give example
                    products to start your research.
                  </p>
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
