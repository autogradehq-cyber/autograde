// src/pages/best-upgrades.tsx
import { useState, FormEvent, FocusEvent } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import * as gtag from "../lib/gtag";

const BestUpgradesPage: NextPage = () => {
  const router = useRouter();

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [primaryUse, setPrimaryUse] = useState("daily");
  const [budgetLevel, setBudgetLevel] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [drivingStyle, setDrivingStyle] = useState<"comfort" | "balanced" | "sporty">(
    "balanced"
  );
  const [priority, setPriority] = useState<"safety" | "performance" | "comfort">(
    "safety"
  );
  const [formStarted, setFormStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormStart = (e: FocusEvent<HTMLFormElement>) => {
    if (!formStarted) {
      setFormStarted(true);
      gtag.event?.("form_start", {
        form_type: "best_upgrades",
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedYear = year.trim();
    const trimmedMake = make.trim();
    const trimmedModel = model.trim();

    if (!trimmedYear || !trimmedMake || !trimmedModel) {
      setError("Please fill in year, make, and model to continue.");
      return;
    }

    const yearNum = Number(trimmedYear);
    if (Number.isNaN(yearNum) || yearNum < 1980 || yearNum > new Date().getFullYear() + 1) {
      setError("Please enter a realistic model year (1980 or newer).");
      return;
    }

    gtag.event?.("best_upgrades_submit", {
      vehicle_year: trimmedYear,
      vehicle_make: trimmedMake,
      vehicle_model: trimmedModel,
      vehicle_use: primaryUse,
      driving_style: drivingStyle,
      budget_level: budgetLevel,
      priority,
    });

    const safeMake = encodeURIComponent(trimmedMake.toLowerCase());
    const safeModel = encodeURIComponent(trimmedModel.toLowerCase());

    router.push({
      pathname: `/best-upgrades/${trimmedYear}/${safeMake}/${safeModel}`,
      query: {
        use: primaryUse,
        budget: budgetLevel,
        drivingStyle,
        priority,
      },
    });
  };

  return (
    <>
      <Head>
        <title>Best Upgrades Planner – AutoGradeHQ</title>
        <meta
          name="description"
          content="Tell AutoGrade about your vehicle, budget, and driving style. Get a prioritized list of upgrades that actually make sense for your build."
        />
      </Head>

      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
          <header className="mb-8 sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300 mb-2">
              Best Upgrades Planner
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-50 mb-3 leading-tight">
              Tell us about your vehicle. We&apos;ll rank the upgrades that
              actually move the needle.
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              This isn&apos;t a generic “top 10 mods” list. We look at how you
              use the vehicle, your budget, and risk tolerance, then prioritize
              tires, suspension, brakes, lighting, and protection accordingly.
            </p>
          </header>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 shadow-[0_24px_60px_rgba(15,23,42,0.9)]">
            <form
              onSubmit={handleSubmit}
              onFocus={handleFormStart}
              className="space-y-6"
            >
              {/* Vehicle basics */}
              <div className="grid gap-4 sm:grid-cols-[1fr,1fr,1fr]">
                <div>
                  <label
                    htmlFor="year"
                    className="block text-xs font-semibold text-slate-200 mb-1.5"
                  >
                    Model year
                  </label>
                  <input
                    id="year"
                    type="number"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="2020"
                  />
                </div>
                <div>
                  <label
                    htmlFor="make"
                    className="block text-xs font-semibold text-slate-200 mb-1.5"
                  >
                    Make
                  </label>
                  <input
                    id="make"
                    type="text"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="Toyota, Ford, Subaru…"
                  />
                </div>
                <div>
                  <label
                    htmlFor="model"
                    className="block text-xs font-semibold text-slate-200 mb-1.5"
                  >
                    Model
                  </label>
                  <input
                    id="model"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="Tacoma, Outback, F-150…"
                  />
                </div>
              </div>

              {/* Primary use */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    How do you primarily use this vehicle?
                  </label>
                  <select
                    value={primaryUse}
                    onChange={(e) =>
                      setPrimaryUse(e.target.value as typeof primaryUse)
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="daily">Daily driving / commuting</option>
                    <option value="towing">Towing / hauling</option>
                    <option value="offroad">
                      Trails / light off-road / overlanding
                    </option>
                    <option value="performance">
                      Spirited driving / canyon runs
                    </option>
                    <option value="mixed">Mixed use</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    What&apos;s your budget level?
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { value: "low", label: "Tight" },
                      { value: "medium", label: "Flexible" },
                      { value: "high", label: "Premium" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setBudgetLevel(opt.value as typeof budgetLevel)
                        }
                        className={[
                          "rounded-md border px-2.5 py-1.5 font-semibold transition-colors",
                          budgetLevel === opt.value
                            ? "border-cyan-400 bg-cyan-500/15 text-cyan-200"
                            : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Driving style & priority */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Driving feel you care about most
                  </label>
                  <select
                    value={drivingStyle}
                    onChange={(e) =>
                      setDrivingStyle(e.target.value as typeof drivingStyle)
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="comfort">Comfort / quiet</option>
                    <option value="balanced">Balanced</option>
                    <option value="sporty">Sporty / response</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    If we had to bias the plan toward one thing…
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as typeof priority)
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="safety">Safety / control</option>
                    <option value="performance">Performance feel</option>
                    <option value="comfort">Ride quality</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-300 bg-rose-900/40 border border-rose-700/60 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 hover:bg-cyan-300 transition-colors"
                >
                  See prioritized upgrade plan
                </button>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  We&apos;ll build a simple prioritized plan for this specific
                  vehicle and show where each upgrade makes the most difference
                  for how you actually drive.
                </p>
              </div>
            </form>
          </section>

          <footer className="mt-6 text-[11px] text-slate-500">
            Already know your exact tire size change?{" "}
            <Link
              href="/fitment"
              className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
            >
              Jump straight to the fitment checker
            </Link>
            .
          </footer>
        </div>
      </main>
    </>
  );
};

export default BestUpgradesPage;
