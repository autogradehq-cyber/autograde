// src/pages/compatibility.tsx
import React, { useMemo, useState, FormEvent } from "react";
import type { NextPage } from "next";
import type { UpgradeRecommendation } from "./api/recommendations";

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

  if (t.includes("lift") || t.includes("suspension") || t.includes("shock")) {
    return "amazon";
  }

  return "amazon";
};

const buildAffiliateUrl = (vendor: AffiliateVendor, keywords: string): string => {
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
  upgrade: string;
  email: string; // OPTIONAL now
  drivingStyle: string;
  budgetLevel: string;
  priorities: string;
};

const initialForm: FormState = {
  year: "",
  make: "",
  model: "",
  trim: "",
  upgrade: "",
  email: "",
  drivingStyle: "",
  budgetLevel: "",
  priorities: "",
};

const estimateValueFromPriceBand = (priceBand: "budget" | "midrange" | "premium") => {
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

// ---- Confidence helpers ----
type Confidence = "VERIFIED" | "CONDITIONAL" | "UNKNOWN";

const deriveConfidenceFromScore = (score: number | null | undefined): Confidence => {
  if (typeof score !== "number" || Number.isNaN(score)) return "UNKNOWN";
  if (score >= 80) return "VERIFIED";
  if (score >= 50) return "CONDITIONAL";
  return "UNKNOWN";
};

const confidenceBadgeClasses = (c: Confidence) =>
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold " +
  (c === "VERIFIED"
    ? "bg-emerald-100 text-emerald-800"
    : c === "CONDITIONAL"
    ? "bg-amber-100 text-amber-800"
    : "bg-slate-100 text-slate-700");

const confidenceLabel = (c: Confidence) =>
  c === "VERIFIED" ? "Verified" : c === "CONDITIONAL" ? "Conditional" : "Unknown";

const confidenceInterpretation = (c: Confidence) =>
  c === "VERIFIED"
    ? "Verified fitment confidence for this upgrade direction based on the info provided."
    : c === "CONDITIONAL"
    ? "Likely fit, but verify requirements (clearance, trimming, lift/offset, alignment) before purchase."
    : "Unknown fitment confidence—use caution and verify before purchasing.";

const clean = (v: unknown) => String(v ?? "").trim();

const QUICK_PICKS: string[] = [
  "Headlights",
  "Windshield wipers",
  "Brake pads",
  "Tires",
  "Lift kit",
  "Shocks/struts",
  "Air intake",
  "Exhaust",
  "Tonneau cover",
  "Running boards",
];

const CompatibilityPage: NextPage = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<UpgradeRecommendation | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const canSubmit = useMemo(() => {
    return !!(clean(form.year) && clean(form.make) && clean(form.model) && clean(form.upgrade));
  }, [form.year, form.make, form.model, form.upgrade]);

  const handleAffiliateClick = (
    ideaType: string,
    vendor: AffiliateVendor,
    priceBand: "budget" | "midrange" | "premium",
    confidence: Confidence
  ) => {
    const estimatedValue = estimateValueFromPriceBand(priceBand);

    trackEvent("affiliate_click", {
      upgrade_type: clean(form.upgrade) || ideaType,
      vehicle_year: clean(form.year),
      vehicle_make: clean(form.make),
      vehicle_model: clean(form.model),
      vehicle_trim: clean(form.trim),
      vendor,
      price_band: priceBand,
      confidence,
      affiliate_value: estimatedValue,
      value: estimatedValue,
      currency: "USD",
    });
  };

  const setUpgradeQuick = (value: string) => {
    setForm((prev) => ({ ...prev, upgrade: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");
    setAiRecommendation(null);

    // Trim once up front (prevents “spaces only” input issues)
    const year = clean(form.year);
    const make = clean(form.make);
    const model = clean(form.model);
    const trim = clean(form.trim);
    const upgrade = clean(form.upgrade);
    const email = clean(form.email);
    const drivingStyle = clean(form.drivingStyle);
    const budgetLevel = clean(form.budgetLevel);
    const priorities = clean(form.priorities);

    if (!year || !make || !model || !upgrade) {
      setStatus("error");
      setMessage("Please fill in year, make, model, and the upgrade you’re considering.");
      return;
    }

    trackEvent("form_start", {
      form_type: "compatibility",
      upgrade_type: upgrade,
      vehicle_year: year,
      vehicle_make: make,
      vehicle_model: model,
      vehicle_trim: trim,
    });

    setIsSubmitting(true);
    setAiLoading(true);

    let recommendation: UpgradeRecommendation | null = null;

    try {
      // 1) Get AI recommendation so we can show it immediately (and optionally email it)
      try {
        const aiRes = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year,
            make,
            model,
            trim,
            upgradeType: upgrade,
            drivingStyle,
            budgetLevel,
            priorities,
            email, // included for context only
          }),
        });

        const aiData = await aiRes.json().catch(() => null);

        if (aiRes.ok && aiData?.ok && aiData?.recommendation) {
          recommendation = aiData.recommendation as UpgradeRecommendation;
          setAiRecommendation(recommendation);
        } else {
          console.warn("[compatibility] AI response missing recommendation", aiRes.status, aiData);
        }
      } catch (err) {
        console.error("[compatibility] Error calling AI recommendation API:", err);
      } finally {
        setAiLoading(false);
      }

      // 2) Send compatibility payload (email optional) and include full recommendation for email/options
      const compatPayload: any = {
        year,
        make,
        model,
        trim,
        upgrade,
        email: email || "", // optional
        drivingStyle,
        budgetLevel,
        topPriority: priorities,
        recommendation: recommendation ?? null,
      };

      const compatRes = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compatPayload),
      });

      const compatData = await compatRes.json().catch(() => null);

      // If the API returned ok:true, we can optionally message about email status.
      // If it failed, we STILL do not block showing results.
      if (compatRes.ok && compatData?.ok) {
        const emailAttempted = !!compatData?.emailAttempted;
        const emailSent = !!compatData?.emailSent;

        setStatus("success");
        setMessage(
          emailAttempted
            ? emailSent
              ? "Results are ready below — and we emailed your breakdown."
              : "Results are ready below. Email delivery failed, but you can still shop from the recommendations here."
            : "Results are ready below."
        );

        // Only track a lead when the compatibility endpoint succeeded
        trackEvent("generate_lead", {
          form_type: "compatibility",
          upgrade_type: upgrade,
          vehicle_year: year,
          vehicle_make: make,
          vehicle_model: model,
          vehicle_trim: trim,
        });
      } else {
        // Do NOT throw — keep on-screen results visible from /api/recommendations
        console.warn("[compatibility] compatibility/email failed:", compatData?.error);

        setStatus("success");
        setMessage(
          "Results are ready below. Email delivery is temporarily unavailable, but you can still shop from the recommendations here."
        );
      }
    } catch (err) {
      console.error("[compatibility] Error submitting form:", err);
      setStatus("error");
      setMessage("Something went wrong submitting your request. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived values for affiliate CTA
  const vehicleString = `${clean(form.year)} ${clean(form.make)} ${clean(form.model)} ${clean(
    form.trim || ""
  )}`.trim();

  const ideaTypeForAffiliate = clean(form.upgrade) || aiRecommendation?.overview || "recommended upgrade";

  const affiliateVendor = chooseVendor(ideaTypeForAffiliate);
  const affiliatePriceBand =
    ((aiRecommendation as any)?.priceBand as "budget" | "midrange" | "premium") || "midrange";

  const affiliateUrl = buildAffiliateUrl(
    affiliateVendor,
    `${vehicleString} ${ideaTypeForAffiliate}`.trim()
  );

  const confidence: Confidence = deriveConfidenceFromScore((aiRecommendation as any)?.fitmentConfidence);

  // Conversion-first: allow CTA as long as we have a recommendation
  const canShowAffiliateCta = !aiLoading && !!aiRecommendation;

  const vendorLabel =
    affiliateVendor === "tirerack" ? "Tire Rack" : affiliateVendor === "realtruck" ? "RealTruck" : "Amazon";

  const mainCtaLabel =
    confidence === "VERIFIED"
      ? `View options on ${vendorLabel}`
      : confidence === "CONDITIONAL"
      ? `View options (verify fitment) on ${vendorLabel}`
      : `View options (verify fitment) on ${vendorLabel}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <header className="mb-10">
          <p className="text-xs font-semibold text-cyan-300 mb-2">AutoGrade Compatibility Check</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 mb-2">
            Check if your upgrade actually fits — before you buy.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
            Tell us about your vehicle and the upgrade you&apos;re considering. We&apos;ll generate an AutoGrade
            recommendation you can act on immediately. Email is optional if you want a copy.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[3fr,2fr] items-start">
          {/* FORM SECTION */}
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="year" className="block text-xs font-medium text-slate-300 mb-1">
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
                  <label htmlFor="make" className="block text-xs font-medium text-slate-300 mb-1">
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
                  <label htmlFor="model" className="block text-xs font-medium text-slate-300 mb-1">
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
                  <label htmlFor="trim" className="block text-xs font-medium text-slate-300 mb-1">
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

              {/* UPGRADE INPUT: make this the star of the page */}
              <div>
                <div className="flex items-end justify-between gap-3">
                  <label htmlFor="upgrade" className="block text-sm font-semibold text-slate-100">
                    What are you upgrading?*
                  </label>
                  <span className="text-[11px] text-slate-400">Example: “headlights” or “windshield wipers”</span>
                </div>

                <input
                  id="upgrade"
                  name="upgrade"
                  type="text"
                  value={form.upgrade}
                  onChange={handleChange}
                  placeholder='Try: "headlights", "windshield wipers", "brake pads", "2&quot; lift kit"'
                  className="mt-2 w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                />

                <div className="mt-2 text-[11px] text-slate-400">
                  Type anything — we tailor recommendations to your exact vehicle.
                </div>

                {/* QUICK PICKS (fewer clicks) */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_PICKS.map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setUpgradeQuick(x)}
                      className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-900"
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="drivingStyle" className="block text-xs font-medium text-slate-300 mb-1">
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
                  <label htmlFor="budgetLevel" className="block text-xs font-medium text-slate-300 mb-1">
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
                  <label htmlFor="priorities" className="block text-xs font-medium text-slate-300 mb-1">
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

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1">
                  Email (optional — send me a copy)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !canSubmit}
                className="w-full inline-flex items-center justify-center rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting your details..." : "Run compatibility check"}
              </button>

              {!canSubmit && (
                <p className="text-[11px] text-slate-400">
                  Required: year, make, model, and what you’re upgrading.
                </p>
              )}

              {status === "success" && <p className="text-xs text-emerald-400">{message}</p>}
              {status === "error" && <p className="text-xs text-red-400">{message}</p>}

              <p className="text-[11px] text-slate-500">
                We&apos;ll never sell your data. Email is optional and only used to send your breakdown.
              </p>
            </form>
          </section>

          {/* AI RECOMMENDATION */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">AutoGrade recommendation</h2>
              <p className="text-xs text-slate-400 mb-3">
                Submit details to generate an on-page recommendation and clickable options.
              </p>

              {aiLoading && (
                <p className="text-xs text-cyan-300">
                  Crunching the numbers for your setup… this usually takes a few seconds.
                </p>
              )}

              {!aiLoading && !aiRecommendation && (
                <p className="text-xs text-slate-500">
                  Submit your vehicle and upgrade details to see recommendations here.
                </p>
              )}

              {!aiLoading && aiRecommendation && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={confidenceBadgeClasses(confidence)}>{confidenceLabel(confidence)}</span>
                      <span className="text-[11px] text-slate-400">
                        Fitment score:{" "}
                        <span className="font-semibold text-slate-100">{aiRecommendation.fitmentConfidence}/100</span>
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-100">{confidenceInterpretation(confidence)}</p>
                    <p className="text-[11px] text-slate-500">Always confirm fitment with the vendor or installer before purchase.</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1">Overview</p>
                    <p className="text-xs text-slate-300">{aiRecommendation.overview}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                      <p className="text-slate-400 mb-0.5">Fitment</p>
                      <p className="text-slate-50 font-semibold">{aiRecommendation.fitmentConfidence}/100</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                      <p className="text-slate-400 mb-0.5">Value</p>
                      <p className="text-slate-50 font-semibold">{aiRecommendation.valueScore}/100</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                      <p className="text-slate-400 mb-0.5">Performance</p>
                      <p className="text-slate-50 font-semibold">{aiRecommendation.performanceImpact}/100</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={!canShowAffiliateCta}
                      onClick={() => {
                        if (!canShowAffiliateCta) return;
                        handleAffiliateClick(ideaTypeForAffiliate, affiliateVendor, affiliatePriceBand, confidence);
                        if (typeof window !== "undefined") {
                          window.location.href = affiliateUrl;
                        }
                      }}
                      className={
                        "w-full rounded-lg text-xs font-semibold py-2 mt-1 transition " +
                        (canShowAffiliateCta
                          ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                          : "bg-slate-800 text-slate-400 cursor-not-allowed")
                      }
                    >
                      {mainCtaLabel}
                    </button>

                    <p className="mt-2 text-[11px] text-slate-500">
                      Use this as a starting point—verify exact fitment before purchase.
                    </p>
                  </div>

                  {aiRecommendation.recommendedUpgradeIdeas?.length ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-1">Suggested options (click to shop)</p>

                      {aiRecommendation.recommendedUpgradeIdeas.map((idea, idx) => {
                        const vendor = chooseVendor(`${idea.type || ""} ${idea.name || ""}`);
                        const keywords = `${vehicleString} ${idea.type} ${idea.name}`.trim();
                        const href = buildAffiliateUrl(vendor, keywords || clean(form.upgrade) || "auto upgrade");
                        const priceBand = (idea.priceBand as "budget" | "midrange" | "premium") || "midrange";

                        return (
                          <div key={idx} className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 mb-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold text-slate-100">{idea.name}</p>
                              <span className={confidenceBadgeClasses(confidence)}>{confidenceLabel(confidence)}</span>
                            </div>

                            <p className="text-[11px] text-slate-400 mb-1">{idea.summary}</p>

                            <p className="text-[11px] text-slate-500">
                              Price band: <span className="text-slate-200">{idea.priceBand}</span>
                            </p>

                            <p className="text-[11px] text-slate-500">
                              Example approach: <span className="text-slate-200">{idea.examplePartHint}</span>
                            </p>

                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                handleAffiliateClick(idea.type || idea.name, vendor, priceBand, confidence);
                              }}
                              className="mt-2 inline-flex items-center rounded-md px-3 py-1.5 text-[11px] font-semibold border border-cyan-400/70 text-cyan-300 hover:bg-cyan-400/10 transition-colors"
                            >
                              {vendor === "amazon" ? "View on Amazon" : vendor === "tirerack" ? "View on Tire Rack" : "View on RealTruck"}
                            </a>

                            <p className="mt-2 text-[11px] text-slate-500">
                              Always confirm fitment with the vendor or installer before purchase.
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No options were generated. Re-submit, or try a more specific upgrade description.
                    </p>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1">In plain language</p>
                    <p className="text-xs text-slate-300">{aiRecommendation.shortExplanation}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default CompatibilityPage;
