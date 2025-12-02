// src/pages/compatibility.tsx
import React, { useState, FormEvent } from "react";
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
      return 150;
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

    const { year, make, model, trim, upgrade, email } = form;

    if (!year || !make || !model || !upgrade || !email) {
      setStatus("error");
      setMessage("Please fill in year, make, model, upgrade, and email.");
      return;
    }

    // Track form_start in GA4
    trackEvent("form_start", {
      form_type: "compatibility",
      upgrade_type: upgrade,
      vehicle_year: year,
      vehicle_make: make,
      vehicle_model: model,
      vehicle_trim: trim,
    });

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

  // Derived values for affiliate CTA
  const ideaTypeForAffiliate =
    form.upgrade || aiRecommendation?.overview || "recommended upgrade";
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
          {/* FORM SECTION */}
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6">
            {/* form omitted for brevity – keep exactly what you already have here */}
            {/* ... */}
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
                  {/* overview, scores, risk, CTAs, etc. */}
                  {/* make sure every <div> has a matching </div> here */}
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
