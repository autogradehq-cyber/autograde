// src/pages/best-upgrades/[year]/[make]/[model]/index.tsx
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

// ---- Affiliate helpers ----
type AffiliateVendor = "amazon" | "tirerack" | "realtruck";

const chooseVendor = (ideaType: string): AffiliateVendor => {
  const t = (ideaType || "").toLowerCase();

  // Tires / wheels -> Tire Rack
  if (t.includes("tire") || t.includes("wheel")) return "tirerack";

  // Truck accessories -> RealTruck (once Sovrn is live)
  if (
    t.includes("tonneau") ||
    t.includes("bed cover") ||
    t.includes("running board") ||
    t.includes("nerf bar") ||
    t.includes("step")
  ) {
    return "realtruck";
  }

  // Lifts/suspension -> Amazon for now
  if (t.includes("lift") || t.includes("suspension") || t.includes("shock")) {
    return "amazon";
  }

  // Fallback
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

const estimateValueFromPriceBand = (priceBand: string | undefined) => {
  const band = (priceBand || "").toLowerCase();
  if (band.includes("budget")) return 150;
  if (band.includes("premium")) return 1200;
  return 500; // midrange default
};

// ---- VERY FLEXIBLE TYPES (to match whatever /api/bestupgrades returns) ----
type AnyRecord = Record<string, any>;

type PageProps = {
  year: string;
  make: string;
  model: string;
  initialData: AnyRecord | null;
};

// ---- Structured data for SEO (JSON-LD) ----
const buildStructuredData = (
  year: string,
  make: string,
  model: string,
  data: AnyRecord | null
) => {
  const vehicleName = `${year} ${make} ${model}`.trim();
  const categories: AnyRecord[] = Array.isArray(data?.categories)
    ? data!.categories
    : [];

  const items: AnyRecord[] = [];

  categories.forEach((cat) => {
    const upgrades: AnyRecord[] = Array.isArray(cat.upgrades)
      ? cat.upgrades
      : Array.isArray(cat.items)
      ? cat.items
      : Array.isArray(cat.ideas)
      ? cat.ideas
      : [];

    upgrades.forEach((idea) => {
      const ideaName: string =
        idea.name || idea.title || idea.label || "Upgrade idea";

      const ideaSummary: string =
        idea.summary || idea.description || idea.details || "";

      items.push({
        "@type": "ListItem",
        position: items.length + 1,
        name: ideaName,
        description: ideaSummary || undefined,
      });
    });
  });

  const itemList =
    items.length > 0
      ? {
          "@type": "ItemList",
          name: `Recommended upgrades for ${vehicleName}`,
          itemListElement: items,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Best upgrades for ${vehicleName}`,
    description: data?.vehicleSummary
      ? String(data.vehicleSummary)
      : `Structured plan for upgrading a ${vehicleName} with tires, suspension, and other parts.`,
    about: {
      "@type": "Product",
      name: vehicleName,
      brand: make,
      additionalType: "Car",
    },
    mainEntity: itemList,
  };
};

const BestUpgradesVehiclePage: NextPage<PageProps> = ({
  year,
  make,
  model,
  initialData,
}) => {
  const vehicleLabel = `${year} ${make} ${model}`.trim();
  const data = initialData || {};

  const categories: AnyRecord[] = Array.isArray(data.categories)
    ? data.categories
    : [];

  const vehicleSummary: string =
    data.vehicleSummary || data.summary || data.metaSummary || "";

  const handleAffiliateClick = (
    idea: AnyRecord,
    vendor: AffiliateVendor,
    priceBand: string
  ) => {
    const estimatedValue = estimateValueFromPriceBand(priceBand);

    trackEvent("affiliate_click", {
      upgrade_type: idea.type || idea.name || idea.label || "",
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
    vehicleSummary ||
    `See the highest-impact upgrades for your ${vehicleLabel} before you spend the money. Tires, suspension, accessories, and more — with fitment notes and tradeoffs.`;

  const structuredData = buildStructuredData(year, make, model, data);

  // Sort categories by any of the common priority fields
  const sortedCategories = [...categories].sort((a, b) => {
    const pa =
      a.priorityRank ??
      a.priority ??
      a.order ??
      a.rank ??
      Number.MAX_SAFE_INTEGER;
    const pb =
      b.priorityRank ??
      b.priority ??
      b.order ??
      b.rank ??
      Number.MAX_SAFE_INTEGER;
    return pa - pb;
  });

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={metaDescription} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </Head>
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          {/* HERO / INTRO */}
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

          {/* VEHICLE SUMMARY, IF AVAILABLE */}
          {vehicleSummary && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 mb-6">
              <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-2">
                How this {vehicleLabel} usually behaves stock
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {vehicleSummary}
              </p>
            </section>
          )}

          {/* NO DATA → FALLBACK MESSAGE */}
          {!sortedCategories.length && (
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
          )}

          {/* CATEGORY SECTIONS */}
          {sortedCategories.length > 0 && (
            <section className="space-y-6">
              {sortedCategories.map((cat, idx) => {
                const priorityLabel =
                  cat.priorityRank ??
                  cat.priority ??
                  cat.order ??
                  cat.rank ??
                  idx + 1;

                const catTitle: string =
                  cat.title ||
                  cat.label ||
                  cat.name ||
                  "High-impact upgrade category";

                const catDescription: string =
                  cat.description ||
                  cat.summary ||
                  cat.details ||
                  cat.reason ||
                  "";

                const budgetBand: string =
                  cat.budgetBand ||
                  cat.budget ||
                  cat.priceBand ||
                  "mixed budget";

                const riskLabelRaw: string =
                  cat.riskLevel || cat.risk || "medium";
                const riskLabel = riskLabelRaw.toLowerCase();

                const riskColor =
                  riskLabel === "low"
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                    : riskLabel === "high"
                    ? "bg-red-500/10 text-red-300 border border-red-500/40"
                    : "bg-amber-500/10 text-amber-300 border border-amber-500/40";

                const upgrades: AnyRecord[] = Array.isArray(cat.upgrades)
                  ? cat.upgrades
                  : Array.isArray(cat.items)
                  ? cat.items
                  : Array.isArray(cat.ideas)
                  ? cat.ideas
                  : [];

                return (
                  <article
                    key={cat.id || `${idx}-${catTitle}`}
                    className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                          Priority {priorityLabel}
                        </p>
                        <h2 className="text-sm sm:text-base font-semibold text-slate-50">
                          {catTitle}
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

                    {catDescription && (
                      <p className="text-xs sm:text-sm text-slate-300 mb-4">
                        {catDescription}
                      </p>
                    )}

                    {/* UPGRADE IDEAS INSIDE THIS CATEGORY */}
                    {upgrades.length > 0 ? (
                      <div className="space-y-3">
                        {upgrades.map((idea, ideaIdx) => {
                          const ideaName: string =
                            idea.name ||
                            idea.title ||
                            idea.label ||
                            "Recommended upgrade idea";

                          const ideaSummary: string =
                            idea.summary ||
                            idea.description ||
                            idea.details ||
                            "";

                          const ideaPriceBand: string =
                            idea.priceBand ||
                            idea.budgetBand ||
                            cat.budgetBand ||
                            cat.budget ||
                            "midrange";

                          const exampleHint: string =
                            idea.examplePartHint ||
                            idea.example ||
                            idea.hint ||
                            "";

                          const ideaType: string =
                            idea.type || idea.category || cat.type || catTitle;

                          const vendor: AffiliateVendor =
                            chooseVendor(ideaType);

                          const keywords = `${year} ${make} ${model} ${
                            ideaType || ""
                          } ${ideaName}`.trim();

                          const href = buildAffiliateUrl(
                            vendor,
                            keywords ||
                              `${year} ${make} ${model} upgrade idea`
                          );

                          return (
                            <div
                              key={ideaIdx}
                              className="rounded-lg bg-slate-950/70 border border-slate-800 p-3 sm:p-4"
                            >
                              <h3 className="text-xs sm:text-sm font-semibold text-slate-50 mb-1">
                                {ideaName}
                              </h3>
                              {ideaSummary && (
                                <p className="text-[11px] sm:text-xs text-slate-300 mb-1.5">
                                  {ideaSummary}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mb-2">
                                {ideaPriceBand && (
                                  <span>
                                    Price band:{" "}
                                    <span className="text-slate-200">
                                      {ideaPriceBand}
                                    </span>
                                  </span>
                                )}
                                {exampleHint && (
                                  <span>
                                    Example approach:{" "}
                                    <span className="text-slate-200">
                                      {exampleHint}
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
                                      ideaPriceBand
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
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        We&apos;re still tuning upgrade suggestions for this
                        category. Use the interactive tool to generate a more
                        detailed plan for your exact setup.
                      </p>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {/* FOOTER CTA */}
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

  let initialData: AnyRecord | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        make,
        model,
        // later: drivingStyle, budgetLevel, priorities, etc.
      }),
    });

    if (res.ok) {
      initialData = (await res.json()) as AnyRecord;
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
