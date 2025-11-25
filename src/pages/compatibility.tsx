// src/pages/compatibility.tsx
import React, { useState, FormEvent } from "react";
import type { NextPage } from "next";
import type { UpgradeRecommendation } from "./api/recommendations";

// ---- GA4 helper ----
const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (typeof window.gtag !== "function") return;
  // @ts-ignore
  window.gtag("event", eventName, params || {});
};
// ---- Affiliate helpers ----
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

  // Everything else (including lifts & suspension) → Amazon for now
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

// ---- Form state ----
type FormState = {
  year: string;
  make: string;
  model: string;
  trim: string;
  upgrade: string;
  email: string;
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

const estimateValueFromPriceBand = (
  priceBand: "budget" | "midrange" | "premium"
) => {
  switch (priceBand) {
    case "budget":
      return 150; // rough average cart
    case "midrange":
      return 500;
    case "premium":
      return 1200;
    default:
      return 300;
  }
};

const CompatibilityPage: NextPage = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] =
    useState<UpgradeRecommendation | null>(null);

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
      upgrade_type: form.upgrade || ideaType,
      vehicle_year: form.year,
      vehicle_make: form.make,
      vehicle_model: form.model,
      vehicle_trim: form.trim,
      vendor,
      price_band: priceBand,
      value: estimatedValue,
      currency: "USD",
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");
    setAiRecommendation(null);

    const { year, make, model, trim, upgrade, email } = form;

    if (!year || !make || !model || !upgrade || !email) {
      setStatus("error");
      setMessage("Please fill in year, make, model, upgrade, and email.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) Compatibility API (email + lead)
      const compatRes = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          make,
          model,
          trim,
          upgrade,
          email,
        }),
      });

      if (!compatRes.ok) {
        throw new Error("Compatibility request failed");
      }

      // Track generate_lead in GA4
      trackEvent("generate_lead", {
        form_type: "compatibility",
        upgrade_type: upgrade,
        vehicle_year: year,
        vehicle_make: make,
        vehicle_model: model,
        vehicle_trim: trim,
      });

      setStatus("success");
      setMessage(
        "Got it! We’ve received your info and emailed you a breakdown for this upgrade."
      );

      // 2) AI recommendations (non-blocking)
      setAiLoading(true);
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
            drivingStyle: form.drivingStyle,
            budgetLevel: form.budgetLevel,
            priorities: form.priorities,
            email,
          }),
        });

        if (aiRes.ok) {
          const data = (await aiRes.json()) as {
            ok: boolean;
            recommendation?: UpgradeRecommendation;
          };

          if (data.ok && data.recommendation) {
            setAiRecommendation(data.recommendation);
          } else {
            console.warn(
              "[compatibility] AI response did not include recommendation"
            );
          }
        } else {
          console.warn(
            "[compatibility] AI request failed with status",
            aiRes.status
          );
        }
      } catch (err) {
        console.error(
          "[compatibility] Error calling AI recommendation API:",
          err
        );
      } finally {
        setAiLoading(false);
      }

      // Reset key fields (but keep prefs)
      setForm((prev) => ({
        ...prev,
        year: "",
        make: "",
        model: "",
        trim: "",
        upgrade: "",
        email: "",
      }));
    } catch (err) {
      console.error("[compatibility] Error submitting form:", err);
      setStatus("error");
      setMessage(
        "Something went wrong submitting your request. Please try again in a moment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <header className="mb-10">
          <p className="text-xs font-semibold text-cyan-300 mb-2">
            AutoGrade Compatibility Check
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 mb-2">
            Check if your upgrade actually fits — before you buy.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
            Tell us about your vehicle and the upgrade you&apos;re considering.
            We&apos;ll email you a breakdown and generate an AutoGrade
            recommendation based on fitment, value, and real-world use.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[3fr,2fr] items-start">
          {/* FORM */}
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

              <div>
                <label
                  htmlFor="upgrade"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  What upgrade are you considering?*
                </label>
                <input
                  id="upgrade"
                  name="upgrade"
                  type="text"
                  value={form.upgrade}
                  onChange={handleChange}
                  placeholder='e.g. 2" lift and 285/70R17 all-terrain tires'
                  className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                />
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

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Email to send your breakdown to*
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
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Submitting your details..."
                  : "Run compatibility check"}
              </button>

              {status === "success" && (
                <p className="text-xs text-emerald-400">{message}</p>
              )}
              {status === "error" && (
                <p className="text-xs text-red-400">{message}</p>
              )}

              <p className="text-[11px] text-slate-500">
                We&apos;ll never sell your data. Your email is only used for
                sending this upgrade breakdown and optional follow-ups.
              </p>
            </form>
          </section>

          {/* AI RECOMMENDATION */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                AutoGrade recommendation
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                After you submit the form, we generate an AI-backed
                recommendation based on fitment confidence, value, and
                real-world use.
              </p>

              {aiLoading && (
                <p className="text-xs text-cyan-300">
                  Crunching the numbers for your setup… this usually takes a few
                  seconds.
                </p>
              )}

              {!aiLoading && !aiRecommendation && (
                <p className="text-xs text-slate-500">
                  Submit your vehicle and upgrade details to see an AutoGrade
                  score and recommendation here.
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
                    <p className="text-[11px] text-slate-400">
                      Recommendation:{" "}
                      <span className="font-semibold text-cyan-300">
                        {aiRecommendation.buyRecommendation === "buy_now"
                          ? "Good to move forward."
                          : aiRecommendation.buyRecommendation ===
                            "consider_alternatives"
                          ? "Worth considering, with a few caveats."
                          : "Not recommended in most cases."}
                      </span>
                    </p>
                  </div>

                  {aiRecommendation.keyBenefits?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-1">
                        Key benefits
                      </p>
                      <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1">
                        {aiRecommendation.keyBenefits.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiRecommendation.potentialIssues?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-1">
                        Potential issues
                      </p>
                      <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1">
                        {aiRecommendation.potentialIssues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiRecommendation.recommendedUpgradeIdeas?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-1">
                        Suggested upgrade direction
                      </p>
                      {aiRecommendation.recommendedUpgradeIdeas.map(
                        (idea, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 mb-2"
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
                            <p className="text-[11px] text-slate-500">
                              Example approach:{" "}
                              <span className="text-slate-200">
                                {idea.examplePartHint}
                              </span>
                            </p>

                            {/* Monetized CTA via affiliate router */}
                            {(() => {
                              const vendor = chooseVendor(idea.type || "");
                              const keywords = `${form.year} ${form.make} ${form.model} ${idea.type} ${idea.name}`.trim();
                              const href = buildAffiliateUrl(
                                vendor,
                                keywords || form.upgrade || "auto upgrade"
                              );

                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() =>
                                    handleAffiliateClick(
                                      idea.type,
                                      vendor,
                                      idea.priceBand
                                    )
                                  }
                                  className="mt-2 inline-flex items-center rounded-md border border-cyan-400/70 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/10 transition-colors"
                                >{vendor === "amazon" && "Shop this direction on Amazon"}
{vendor === "tirerack" && "Shop this direction on Tire Rack"}
{vendor === "realtruck" && "Shop this direction on RealTruck"}

                                 
                                </a>
                              );
                            })()}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1">
                      In plain language
                    </p>
                    <p className="text-xs text-slate-300">
                      {aiRecommendation.shortExplanation}
                    </p>
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
