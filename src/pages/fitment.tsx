// src/pages/fitment.tsx
import React, { useState, FormEvent } from "react";
import type { NextPage } from "next";
import type { FitmentResult } from "../lib/fitment";

// GA4 helper (same pattern as other pages)
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

const riskColorClasses = (risk: "low" | "medium" | "high") => {
  switch (risk) {
    case "low":
      return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40";
    case "medium":
      return "bg-amber-500/10 text-amber-300 border border-amber-500/40";
    case "high":
    default:
      return "bg-red-500/10 text-red-300 border border-red-500/40";
  }
};

type FormState = {
  year: string;
  make: string;
  model: string;
  trim: string;
  stockTire: string;
  newTire: string;
  liftAmountIn: string;
  wheelOffsetChangeMm: string;
};

const initialForm: FormState = {
  year: "",
  make: "",
  model: "",
  trim: "",
  stockTire: "",
  newTire: "",
  liftAmountIn: "",
  wheelOffsetChangeMm: "",
};

const FitmentPage: NextPage = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<FitmentResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const vehicleLabel = [form.year, form.make, form.model, form.trim]
    .filter(Boolean)
    .join(" ")
    .trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    setResult(null);
    setIsSubmitting(true);

    if (!form.newTire) {
      setStatus("error");
      setMessage("Please enter at least the new tire size (e.g. 285/70R17).");
      setIsSubmitting(false);
      return;
    }

    trackEvent("fitment_check", {
      vehicle_year: form.year,
      vehicle_make: form.make,
      vehicle_model: form.model,
      vehicle_trim: form.trim,
      stock_tire: form.stockTire,
      new_tire: form.newTire,
    });

    try {
      const res = await fetch("/api/fitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: form.year,
          make: form.make,
          model: form.model,
          trim: form.trim,
          stockTire: form.stockTire,
          newTire: form.newTire,
          liftAmountIn: form.liftAmountIn
            ? parseFloat(form.liftAmountIn)
            : undefined,
          wheelOffsetChangeMm: form.wheelOffsetChangeMm
            ? parseFloat(form.wheelOffsetChangeMm)
            : undefined,
        }),
      });

      const data = (await res.json()) as FitmentResult;

      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Fitment check failed. Please try again.");
      } else {
        setResult(data);
        setStatus("success");
        setMessage(
          "Here’s a quick-fitment sanity check. Always combine this with a detailed fitment guide and test fit on the vehicle."
        );
      }
    } catch (err) {
      console.error("[fitment] error:", err);
      setStatus("error");
      setMessage("Something went wrong. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <header className="mb-10">
          <p className="text-xs font-semibold text-cyan-300 mb-2">
            AutoGrade Fitment Check
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 mb-2">
            See if that tire size actually fits — before you order.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
            Plug in your stock and new tire sizes, plus any lift or wheel offset
            changes. We&apos;ll estimate diameter change, speedometer error, and rub
            risk so you can sanity-check your plan before buying parts.
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
                    Year (optional)
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
                    Make (optional)
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
                    Model (optional)
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="stockTire"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Stock tire size (recommended)
                  </label>
                  <input
                    id="stockTire"
                    name="stockTire"
                    type="text"
                    value={form.stockTire}
                    onChange={handleChange}
                    placeholder="e.g. 265/65R17"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    If you don&apos;t know it, you can leave this blank and we&apos;ll
                    give general guidance.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="newTire"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    New tire size you&apos;re considering*
                  </label>
                  <input
                    id="newTire"
                    name="newTire"
                    type="text"
                    value={form.newTire}
                    onChange={handleChange}
                    placeholder="e.g. 285/70R17"
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="liftAmountIn"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Lift / level amount in inches (optional)
                  </label>
                  <input
                    id="liftAmountIn"
                    name="liftAmountIn"
                    type="text"
                    value={form.liftAmountIn}
                    onChange={handleChange}
                    placeholder='e.g. 0, 1, 2 — "2" for a 2" level'
                    className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
                  />
                </div>

                <div>
                  <label
                    htmlFor="wheelOffsetChangeMm"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Wheel offset change in mm (optional)
                  </label>
                  <input
                    id="wheelOffsetChangeMm"
                    name="wheelOffsetChangeMm"
                    type="text"
                    value={form.wheelOffsetChangeMm}
                    onChange={handleChange}
                    placeholder='e.g. -12 if going from +15 to +3'
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
                  ? "Checking fitment..."
                  : "Run quick fitment sanity check"}
              </button>

              {status === "success" && (
                <p className="text-xs text-emerald-400">{message}</p>
              )}
              {status === "error" && (
                <p className="text-xs text-red-400">{message}</p>
              )}

              <p className="text-[11px] text-slate-500">
                This tool is a sanity-check, not a replacement for hands-on
                test-fitting. Always use a trusted fitment guide and a good
                installer before committing to a tire/wheel setup.
              </p>
            </form>
          </section>

          {/* RIGHT: RESULT */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              {result && result.ok ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm sm:text-base font-semibold text-slate-50">
                      Quick fitment check
                      {vehicleLabel ? ` for ${vehicleLabel}` : ""}
                    </h2>
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold " +
                        riskColorClasses(result.rubRisk)
                      }
                    >
                      Rub risk: {result.rubRisk}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-3">{result.summary}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                      <p className="text-slate-400 mb-0.5">New tire size</p>
                      <p className="text-slate-50 font-semibold">
                        {form.newTire || "—"}
                      </p>
                      <p className="mt-1 text-slate-400">
                        Diameter:{" "}
                        <span className="text-slate-100">
                          {result.newDiameterIn.toFixed(2)}"
                        </span>
                      </p>
                    </div>
                    {result.stockDiameterIn && (
                      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                        <p className="text-slate-400 mb-0.5">Stock tire size</p>
                        <p className="text-slate-50 font-semibold">
                          {form.stockTire || "—"}
                        </p>
                        <p className="mt-1 text-slate-400">
                          Diameter:{" "}
                          <span className="text-slate-100">
                            {result.stockDiameterIn.toFixed(2)}"
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {result.diameterChangePercent !== null && (
                    <div className="mt-3 rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-[11px] text-slate-300">
                      <p>
                        Diameter change:{" "}
                        <span className="text-slate-100">
                          {result.diameterChangeIn?.toFixed(2)}" (
                          {result.diameterChangePercent?.toFixed(2)}%)
                        </span>
                      </p>
                      {result.speedometerErrorPercent !== null && (
                        <p>
                          Approximate speedometer error matches the diameter
                          change percentage. Larger tires make the speedometer
                          read slower than actual.
                        {result.widthChangeIn != null && (
  <p className="text-[11px] text-slate-300">
    Width change vs. stock:{" "}
    <span className="text-slate-100">
      {result.widthChangeIn > 0 ? "+" : ""}
      {result.widthChangeIn.toFixed(2)}"
    </span>
  </p>
)}

                        </p>
                      )}
                    </div>
                  )}

                  {result.detailedNotes && result.detailedNotes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold text-slate-200 mb-1">
                        Things to keep in mind:
                      </p>
                      <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                        {result.detailedNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="mt-3 text-[11px] text-slate-500">
                    For big tire jumps or off-road builds, we still recommend
                    checking real-world build threads, fitment galleries, and
                    your installer&apos;s experience on this exact platform.
                  </p>
                </>
              ) : status === "loading" ? (
                <p className="text-xs text-cyan-300">
                  Crunching the numbers for your setup…
                </p>
              ) : (
                <>
                  <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                    Quick, math-based fitment sanity check
                  </h2>
                  <p className="text-xs text-slate-400">
                    This tool won&apos;t replace a full fitment database, but it will
                    catch most of the obvious &quot;that size is probably too big&quot;
                    cases before you spend money. Use it alongside the Best
                    Upgrades page and the Compatibility Check.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default FitmentPage;
