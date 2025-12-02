// src/pages/best-upgrades.tsx
import React, { useState, FormEvent } from "react";
import type { NextPage } from "next";
import type { BestUpgradeCategory } from "./api/bestupgrades";

// ---- GA4 helper ----
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

// ---- Affiliate helpers (same style as compatibility.tsx) ----
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

  // Lifts / suspension / shocks → Amazon
  if (t.includes("lift") || t.includes("suspension") || t.includes("shock")) {
    return "amazon";
  }

  // Default fallback
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

const BestUpgradesPage: NextPage = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [categories, setCategories] = useState<BestUpgradeCategory[] | null>(
    null
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAffiliateClick = (
    ideaLabel: string,
    vendor: AffiliateVendor,
    priceBand: "budget" | "midrange" | "premium"
  ) => {
    const estimatedValue = estimateValueFromPriceBand(priceBand);

    trackEvent("affiliate_click", {
      page_type: "best_upgrades",
      upgrade_type: ideaLabel,
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
    setCategories(null);

    const { year, make, model } = form;

    if (!year || !make || !model) {
      setStatus("error");
      setMessage("Please fill in year, make, and model.");
      return;
    }

    trackEvent("best_upgrades_lookup", {
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

      if (!res.ok) {
        throw new Error("Best upgrades request failed");
      }

      const data = (await res.json()) as {
        ok: boolean;
        categories?: BestUpgradeCategory[];
        error?: string;
      };

      if (!data.ok || !data.categories) {
        setStatus("error");
        setMessage(
          data.error || "We couldn’t generate upgrades. Please try again."
        );
      } else {
        setCategories(data.categories);
        setStatus("success");
      }
    } catch (err) {
      console.error("[best-upgrades] Error:", err);
      setStatus("error");
      setMessage(
        "Something went wrong generating upgrades. Please try again in a moment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehicleLabel = [form.year, form.make, form.model]
    .filter(Boolean)
    .join(" ");

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
            the highest-impact upgrades first, with fitment notes, tradeoffs,
            and links to shop from retailers that specialize in each type of
            part.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[3fr,2fr] items-start">
          {/* LEFT: Vehicle + preferences form */}
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

              <p className="mt-3 text-[11px] text-slate-500">
                We&apos;ll suggest a sensible order to upgrade in, plus fitment
                notes and tradeoffs. Always double-check exact part numbers
                using the retailer&apos;s fitment tool before you buy.
              </p>
            </form>
          </section>

          {/* RIGHT: Upgrade categories & cards */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                Best upgrades for {vehicleLabel || "your vehicle"}
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                We&apos;ll prioritize the upgrades that usually make the biggest
                difference first. Click into a card to see why it matters and
                where to shop.
              </p>

              {isSubmitting && (
                <p className="text-xs text-cyan-300">
                  Analyzing your vehicle and pulling upgrade directions…
                </p>
              )}

              {!isSubmitting && !categories && status === "idle" && (
                <p className="text-xs text-slate-500">
                  Enter your vehicle details on the left to see AutoGrade&apos;s
                  recommended upgrade order here.
                </p>
              )}

              {!isSubmitting && categories && categories.length === 0 && (
                <p className="text-xs text-slate-500">
                  We couldn&apos;t confidently recommend upgrades for this
                  setup. Try adjusting driving style or priorities.
                </p>
              )}

              {!isSubmitting && categories && categories.length > 0 && (
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="rounded-xl bg-slate-950/70 border border-slate-800 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Priority {cat.priorityRank}
                          </p>
                          <h3 className="text-sm font-semibold text-slate-50">
                            {cat.label}
                          </h3>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                            Budget: {cat.recommendedBudgetBand}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                            Risk: {cat.riskLevel}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 mb-2">
                        {cat.rationale}
                      </p>

                      {cat.ideas?.length > 0 && (
                        <div className="space-y-3 mt-2">
                          {cat.ideas.map((idea, idx) => {
                            const vendor = chooseVendor(idea.type || idea.name);
                            const priceBand = idea.priceBand || "midrange";
                            const keywords = `${form.year} ${form.make} ${form.model} ${idea.type} ${idea.name}`.trim();
                            const href = buildAffiliateUrl(
                              vendor,
                              keywords || idea.name
                            );

                            return (
                              <div
                                key={idx}
                                className="rounded-lg bg-slate-950 border border-slate-800 p-3"
                              >
                                <p className="text-xs font-semibold text-slate-100">
                                  {idea.name}
                                </p>
                                <p className="text-[11px] text-slate-400 mb-1">
                                  {idea.summary}
                                </p>
                                <p className="text-[11px] text-slate-500 mb-1">
                                  Best for:{" "}
                                  <span className="text-slate-200">
                                    {idea.bestFor}
                                  </span>
                                </p>
                                <p className="text-[11px] text-slate-500 mb-1">
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

                                {idea.potentialIssues?.length ? (
                                  <div className="mb-2">
                                    <p className="text-[10px] font-semibold text-slate-400 mb-0.5">
                                      Things to watch for:
                                    </p>
                                    <ul className="text-[10px] text-slate-500 list-disc list-inside space-y-0.5">
                                      {idea.potentialIssues.map(
                                        (issue, issueIdx) => (
                                          <li key={issueIdx}>{issue}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                ) : null}

                                <div className="flex flex-wrap gap-2 mt-2">
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() =>
                                      handleAffiliateClick(
                                        `${cat.label} - ${idea.name}`,
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
                                  <a
                                    href="/compatibility"
                                    className="inline-flex items-center rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800/80 transition-colors"
                                  >
                                    Check detailed fitment first
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {cat.overallNote && (
                        <p className="mt-3 text-[11px] text-slate-400">
                          {cat.overallNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {status === "error" && (
                <p className="mt-3 text-xs text-red-400">{message}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default BestUpgradesPage;
