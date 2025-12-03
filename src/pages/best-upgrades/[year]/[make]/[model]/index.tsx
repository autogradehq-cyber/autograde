// src/pages/best-upgrades/[year]/[make]/[model].tsx
import React from "react";
import type { NextPage, GetServerSideProps } from "next";
import Head from "next/head";

// ---- GA4 helper ----
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

// ---- Affiliate helpers (same logic as compatibility/best-upgrades) ----
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
  priceBand: "budget" | "midrange" | "premium" | string
) => {
  const band = (priceBand || "").toLowerCase();
  if (band.includes("budget")) return 150;
  if (band.includes("premium")) return 1200;
  return 500;
};

// ---- Types for the best-upgrades API response (loose on purpose) ----
type UpgradeIdea = {
  name?: string;
  summary?: string;
  priceBand?: "budget" | "midrange" | "premium" | string;
  examplePartHint?: string;
  type?: string;
};

type UpgradeCategory = {
  id?: string;
  priorityRank?: number;
  title?: string;
  description?: string;
  budgetBand?: string;
  riskLevel?: string;
  upgrades?: UpgradeIdea[];
};

type BestUpgradesData = {
  ok: boolean;
  vehicleSummary?: string;
  categories?: UpgradeCategory[];
};

type PageProps = {
  year: string;
  make: string;
  model: string;
  initialData: BestUpgradesData | null;
};

const BestUpgradesVehiclePage: NextPage<PageProps> = ({
  year,
  make,
  model,
  initialData,
}) => {
  const vehicleLabel = `${year} ${make} ${model}`.trim();
  const data = initialData;

  const handleAffiliateClick = (
    idea: UpgradeIdea,
    vendor: AffiliateVendor,
    priceBand: string
  ) => {
    const estimatedValue = estimateValueFromPriceBand(priceBand);

    trackEvent("affiliate_click", {
      upgrade_type: idea.type || idea.name || "",
      vehicle_year: year,
      vehicle_make: make,
      vehicle_model: model,
      vendor,
      price_band: priceBand,
      affiliate_value: estimatedValue,
      value: estimatedValue,
      currency: "USD",
      source: "best_upgrades_vehicle_page",
    });
  };

  const title = `Best upgrades for ${vehicleLabel} | AutoGrade`;
  const metaDescription =
    data?.vehicleSummary ||
    `See the highest-impact upgrades for your ${vehicleLabel} before you spend the money. Tires, suspension, accessories, and more — with fitment notes and tradeoffs.`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={metaDescription} />
      </Head>
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          {/* HERO / MAGAZINE INTRO */}
          <header className="mb-10">
            <p className="text-xs font-semibold text-cyan-300 mb-2">
              AutoGrade Best Upgrades
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 mb-3">
              Best upgrades for {vehicleLabel} — before you spend the money.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mb-3">
              We prioritize the upgrades that usually make the biggest
              difference first. This isn&apos;t a random mod list — it&apos;s a
              structured look at where you tend to feel the most improvement for
              each dollar you spend on a {vehicleLabel}.
            </p>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              Use this as a game plan, not a shopping cart. Start with the
              high-impact upgrades, sanity-check fitment with our Fitment Check,
              and only then pull the trigger on parts. We&apos;ll also link out
              to retailers that specialize in each type of upgrade.
            </p>
          </header>

          {!data || !data.ok || !data.categories?.length ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-2">
                We couldn&apos;t generate a full upgrade plan yet.
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Try running the interactive Best Upgrades search tool first to
                build a baseline:
              </p>
              <a
                href="/best-upgrades"
                className="inline-flex items-center rounded-md bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 transition-colors"
              >
                Open interactive Best Upgrades tool
              </a>
            </section>
          ) : (
            <section className="space-y-6">
              {/* Optional one-paragraph vehicle summary at top */}
              {data.vehicleSummary && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-2">
                    How this {vehicleLabel} usually behaves stock
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300">
                    {data.vehicleSummary}
                  </p>
                </div>
              )}

              {/* CATEGORY SECTIONS (magazine style + interactive cards) */}
              {data.categories!
                .slice()
                .sort(
                  (a, b) =>
                    (a.priorityRank ?? 999) - (b.priorityRank ?? 999)
                )
                .map((cat, idx) => {
                  const priorityLabel = cat.priorityRank ?? idx + 1;
                  const budgetBand = cat.budgetBand || "mixed budget";
                  const riskLabel = (cat.riskLevel || "medium").toLowerCase();

                  const riskColor =
                    riskLabel === "low"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                      : riskLabel === "high"
                      ? "bg-red-500/10 text-red-300 border border-red-500/40"
                      : "bg-amber-500/10 text-amber-300 border border-amber-500/40";

                  return (
                    <article
                      key={cat.id || idx}
                      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div>
                          <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                            Priority {priorityLabel}
                          </p>
                          <h2 className="text-sm sm:text-base font-semibold text-slate-50">
                            {cat.title || "High-impact upgrade category"}
                          </h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-950/70 border border-slate-700 px-3 py-1 text-[10px] font-semibold text-slate-300">
                            Budget focus: {budgetBand}
                          </span>
                          <span
                            className={
                              "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold " +
                              riskColor
                            }
                          >
                            Typical risk: {riskLabel}
                          </span>
                        </div>
                      </div>

                      {cat.description && (
                        <p className="text-xs sm:text-sm text-slate-300 mb-4">
                          {cat.description}
                        </p>
                      )}

                      {/* Upgrade ideas inside this category */}
                      {cat.upgrades && cat.upgrades.length > 0 && (
                        <div className="space-y-3">
                          {cat.upgrades.map((idea, ideaIdx) => {
                            const vendor = chooseVendor(idea.type || idea.name || cat.title || "");
                            const priceBand = idea.priceBand || cat.budgetBand || "midrange";
                            const keywords = `${year} ${make} ${model} ${idea.type || ""} ${idea.name || ""}`.trim();
                            const href = buildAffiliateUrl(
                              vendor,
                              keywords || `${year} ${make} ${model} upgrade`
                            );

                            return (
                              <div
                                key={ideaIdx}
                                className="rounded-lg bg-slate-950/70 border border-slate-800 p-3 sm:p-4"
                              >
                                <h3 className="text-xs sm:text-sm font-semibold text-slate-50 mb-1">
                                  {idea.name || "Recommended upgrade idea"}
                                </h3>
                                {idea.summary && (
                                  <p className="text-[11px] sm:text-xs text-slate-300 mb-1.5">
                                    {idea.summary}
                                  </p>
                                )}

                                <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mb-2">
                                  {priceBand && (
                                    <span>
                                      Price band:{" "}
                                      <span className="text-slate-200">
                                        {priceBand}
                                      </span>
                                    </span>
                                  )}
                                  {idea.examplePartHint && (
                                    <span>
                                      Example approach:{" "}
                                      <span className="text-slate-200">
                                        {idea.examplePartHint}
                                      </span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() =>
                                      handleAffiliateClick(
                                        idea,
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
                                    href="/fitment"
                                    className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800/60 transition-colors"
                                  >
                                    Run fitment sanity check
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                })}
            </section>
          )}

          {/* Small footer call-to-action to use the interactive tool */}
          <section className="mt-10 border-t border-slate-800 pt-6">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-200 mb-1">
              Want to tweak the plan?
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-3">
              Use the interactive Best Upgrades tool to refine this plan based
              on how you drive, your budget, and your priorities. We&apos;ll
              email you a summary and keep improving this page as more data
              comes in.
            </p>
            <a
              href="/best-upgrades"
              className="inline-flex items-center rounded-md bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 transition-colors"
            >
              Open interactive Best Upgrades tool
            </a>
          </section>
        </div>
      </main>
    </>
  );
};

export default BestUpgradesVehiclePage;

// ---- Server-side data fetch for SEO ----
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  context
) => {
  const { year, make, model } = context.params as {
    year: string;
    make: string;
    model: string;
  };

  const host = context.req.headers.host || "autogradehq.com";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const url = `${protocol}://${host}/api/bestupgrades`;

  let initialData: BestUpgradesData | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        make,
        model,
        // You can add more knobs later (driving style, budget, etc.)
      }),
    });

    if (res.ok) {
      initialData = (await res.json()) as BestUpgradesData;
    } else {
      console.error(
        "[best-upgrades vehicle] API returned status",
        res.status
      );
    }
  } catch (err) {
    console.error("[best-upgrades vehicle] Error calling API:", err);
  }

  return {
    props: {
      year,
      make,
      model,
      initialData,
    },
  };
};
