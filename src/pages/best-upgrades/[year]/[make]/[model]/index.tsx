// src/pages/best-upgrades/[year]/[make]/[model]/index.tsx
import { useMemo, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";

/**
 * Lightweight gtag shim to avoid compile-time module errors and safely forward events to window.gtag when available.
 * This matches the minimal surface used in this file (gtag.event).
 */
const gtag = {
  event: (action?: string, params?: Record<string, any>) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", action, params);
    }
  },
};

type BudgetLevel = "low" | "medium" | "high";
type Priority = "safety" | "performance" | "comfort";
type VehicleUse = "daily" | "towing" | "offroad" | "performance" | "mixed";

type UpgradeCategory =
  | "tires"
  | "wheels"
  | "suspension"
  | "brakes"
  | "lighting"
  | "protection"
  | "recovery";

type ImpactLevel = "very_high" | "high" | "medium" | "low";
type RiskLevel = "low" | "medium" | "high";

interface Upgrade {
  id: string;
  category: UpgradeCategory;
  title: string;
  impact: ImpactLevel;
  risk: RiskLevel;
  estCost: string;
  description: string;
  whyNow: string;
  pros: string[];
  cons: string[];
  recommendedFor: string;
}

interface BuildContext {
  year: string;
  make: string;
  model: string;
  use: VehicleUse;
  budget: BudgetLevel;
  drivingStyle: string;
  priority: Priority;
}

const impactLabel: Record<ImpactLevel, string> = {
  very_high: "Very high impact",
  high: "High impact",
  medium: "Moderate impact",
  low: "Lower impact",
};

const riskLabel: Record<RiskLevel, string> = {
  low: "Low fitment risk",
  medium: "Some fitment risk",
  high: "Higher fitment risk",
};

const impactColor: Record<ImpactLevel, string> = {
  very_high: "bg-emerald-500/15 text-emerald-300 border-emerald-400/50",
  high: "bg-cyan-500/15 text-cyan-300 border-cyan-400/50",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/50",
  low: "bg-slate-700/40 text-slate-200 border-slate-500/50",
};

const riskColor: Record<RiskLevel, string> = {
  low: "bg-emerald-500/10 text-emerald-300 border-emerald-400/50",
  medium: "bg-amber-500/10 text-amber-300 border-amber-400/50",
  high: "bg-rose-500/10 text-rose-300 border-rose-400/60",
};

function normalizeVehicleType(make: string, model: string): "truck_suv" | "car" {
  const lower = `${make} ${model}`.toLowerCase();
  if (
    lower.includes("tacoma") ||
    lower.includes("f-150") ||
    lower.includes("silverado") ||
    lower.includes("4runner") ||
    lower.includes("wrangler") ||
    lower.includes("ram") ||
    lower.includes("suv")
  ) {
    return "truck_suv";
  }
  return "car";
}

function buildUpgradePlan(ctx: BuildContext): Upgrade[] {
  const { use, budget, priority } = ctx;
  const vehicleType = normalizeVehicleType(ctx.make, ctx.model);

  const upgrades: Upgrade[] = [];

  // Core: tires
  upgrades.push({
    id: "tires-core",
    category: "tires",
    title:
      use === "offroad"
        ? "All-terrain tire upgrade"
        : use === "performance"
        ? "Max-performance or ultra-high-performance tire upgrade"
        : "High-quality all-season tire upgrade",
    impact: "very_high",
    risk: "low",
    estCost:
      budget === "low"
        ? "$600–$900"
        : budget === "medium"
        ? "$800–$1,200"
        : "$1,000–$1,600",
    description:
      "Tires are almost always the highest-impact upgrade for grip, confidence in bad weather, and overall feel. Matching the tire to your real-world use is more important than chasing the biggest size.",
    whyNow:
      "If you do nothing else, getting the right tire makes the biggest difference in safety, traction, and steering feel.",
    pros: [
      "Huge jump in real-world grip and confidence",
      "Noticeable difference in wet, snow, or dirt performance",
      "Can transform how the vehicle feels without changing anything else",
    ],
    cons: [
      "Higher-quality tires cost more up front",
      "Aggressive tread can add noise or small hit to MPG",
    ],
    recommendedFor:
      use === "offroad"
        ? "Truck/SUV owners who want more capability on trails and rough roads without going straight to a lift."
        : use === "towing"
        ? "Owners who want more stability and control when towing or carrying heavy loads."
        : "Anyone who wants the vehicle to feel more planted, predictable, and secure in everyday driving.",
  });

  // Suspension / damping
  if (use === "offroad" || use === "towing" || vehicleType === "truck_suv") {
    upgrades.push({
      id: "suspension-truck",
      category: "suspension",
      title:
        use === "offroad"
          ? "Mild suspension upgrade for control on rough roads"
          : "Upgraded shocks for stability under load",
      impact: "high",
      risk: "medium",
      estCost:
        budget === "low"
          ? "$400–$800"
          : budget === "medium"
          ? "$800–$1,500"
          : "$1,500–$3,000",
      description:
        "Better dampers (and in some cases a mild lift or leveling kit) can improve control, reduce bounce, and keep things more stable when the road turns rough or the vehicle is loaded.",
      whyNow:
        "If you regularly see rough roads, tow, or carry weight, the stock suspension can feel out of its depth. This focuses on control and stability rather than just stance.",
      pros: [
        "More control on rough roads or with a trailer",
        "Can reduce harsh bottoming and bouncing",
        "Properly chosen setups can improve comfort and stability",
      ],
      cons: [
        "Poorly chosen kits can create rubbing or odd handling",
        "Install and alignment add to total cost",
        "More aggressive lifts may require extra supporting parts",
      ],
      recommendedFor:
        "Drivers who actually use their truck or SUV for more than just commuting—towing, dirt roads, or long highway trips with weight.",
    });
  } else {
    upgrades.push({
      id: "suspension-car",
      category: "suspension",
      title:
        priority === "performance"
          ? "Mild handling-focused suspension upgrade"
          : "Refined shock/strut refresh with better damping",
      impact: "high",
      risk: "medium",
      estCost:
        budget === "low"
          ? "$600–$1,000"
          : budget === "medium"
          ? "$1,000–$1,800"
          : "$1,800–$3,000",
      description:
        "Upgraded shocks, struts, or a mild spring package can tighten up body control and make the vehicle feel more tied-down without going track-only stiff.",
      whyNow:
        "If the vehicle has miles on it or you care about precise, confident feel, fresh and slightly upgraded suspension hardware can be a major upgrade.",
      pros: [
        "Tighter, more confident handling",
        "Can make the car feel newer and more controlled",
        "Customizable toward comfort or performance",
      ],
      cons: [
        "Too aggressive a drop can cause rubbing or poor ride",
        "Alignment is required and can add cost",
      ],
      recommendedFor:
        "Drivers who notice float, roll, or imprecise feel and want a more confident, composed ride.",
    });
  }

  // Brakes
  upgrades.push({
    id: "brakes-core",
    category: "brakes",
    title:
      use === "performance"
        ? "Performance pad & high-temp fluid upgrade"
        : "Quality pad & rotor refresh tuned for real-world driving",
    impact: priority === "safety" ? "high" : "medium",
    risk: "low",
    estCost:
      budget === "low"
        ? "$400–$700"
        : budget === "medium"
        ? "$600–$1,000"
        : "$900–$1,500",
    description:
      "Better pads and rotors (and in some cases stainless lines and fluid) improve consistency, reduce fade, and give a more confident pedal feel.",
    whyNow:
      "Stopping is the one area that matters every single drive. If you don’t know the age or quality of the current parts, this is a high-value baseline upgrade.",
    pros: [
      "Shorter, more consistent stops in demanding conditions",
      "Can improve pedal feel and confidence",
      "Pairs well with tire and suspension upgrades",
    ],
    cons: [
      "Some performance pads create more dust or noise",
      "Heavy brake packages can add unsprung weight",
    ],
    recommendedFor:
      "Drivers who value confidence in hard braking, downhill sections, or when the vehicle is loaded.",
  });

  // Lighting
  upgrades.push({
    id: "lighting-core",
    category: "lighting",
    title:
      priority === "safety"
        ? "Headlight and auxiliary lighting upgrade for visibility"
        : "Modernized lighting for both looks and function",
    impact: "medium",
    risk: "low",
    estCost:
      budget === "low"
        ? "$150–$300"
        : budget === "medium"
        ? "$250–$600"
        : "$500–$1,200",
    description:
      "Thoughtful lighting upgrades can bring older vehicles closer to modern OEM visibility, especially in poor weather or on unlit roads.",
    whyNow:
      "If you often drive at night or in bad weather, seeing (and being seen) clearly is a safety upgrade as much as an aesthetic one.",
    pros: [
      "Better visibility and presence on the road",
      "Can modernize the look of the vehicle",
    ],
    cons: [
      "Cheap kits can create glare and poor beam patterns",
      "Some setups require careful aiming or extra wiring",
    ],
    recommendedFor:
      "Anyone who feels like their current headlights are weak, yellow, or not confidence-inspiring after dark.",
  });

  // Protection / recovery for trucks & SUVs
  if (vehicleType === "truck_suv" && (use === "offroad" || use === "mixed")) {
    upgrades.push({
      id: "protection-core",
      category: "protection",
      title: "Basic underbody and front-end protection",
      impact: "medium",
      risk: "low",
      estCost:
        budget === "low"
          ? "$300–$700"
          : budget === "medium"
          ? "$600–$1,200"
          : "$1,000–$2,000",
      description:
        "Skid plates, basic armor, and sensible front-end protection reduce the chance that one bad hit ends a trip or causes expensive damage.",
      whyNow:
        "If you’re starting to explore rougher terrain, protection can be the difference between a fun day and an expensive recovery bill.",
      pros: [
        "Helps protect critical components from impacts",
        "Peace of mind when the terrain turns rough",
      ],
      cons: [
        "Adds weight and can impact MPG slightly",
        "Improperly chosen parts can reduce clearance",
      ],
      recommendedFor:
        "Drivers taking trucks and SUVs off pavement or onto rougher unmaintained roads.",
    });

    upgrades.push({
      id: "recovery-core",
      category: "recovery",
      title: "Essential recovery kit matched to your vehicle weight",
      impact: "medium",
      risk: "low",
      estCost:
        budget === "low"
          ? "$200–$400"
          : budget === "medium"
          ? "$350–$700"
          : "$600–$1,200",
      description:
        "A sensible recovery setup (straps, shackles, boards, jack, and mounting where appropriate) keeps you less dependent on others when exploring.",
      whyNow:
        "If you’re going farther from pavement, assuming you won’t get stuck is optimistic. Recovery gear is cheaper than a tow bill and lost time.",
      pros: [
        "Improves self-sufficiency off-road",
        "Often cheaper than a single serious recovery service call",
      ],
      cons: [
        "Takes up space and requires proper storage",
        "Misuse can be dangerous—learn basic recovery safety",
      ],
      recommendedFor:
        "Off-road and overland drivers who don’t want one stuck situation to ruin a trip.",
    });
  }

  // Priority nudges: reorder slightly based on priority
  if (priority === "comfort") {
    upgrades.sort((a, b) => {
      const comfortScore = (u: Upgrade) =>
        u.category === "tires" || u.category === "suspension"
          ? 3
          : u.category === "protection"
          ? 1
          : 2;
      return comfortScore(b) - comfortScore(a);
    });
  } else if (priority === "performance") {
    upgrades.sort((a, b) => {
      const perfScore = (u: Upgrade) =>
        u.category === "tires" || u.category === "suspension" || u.category === "brakes"
          ? 3
          : 1;
      return perfScore(b) - perfScore(a);
    });
  } else {
    // safety: favor tires, brakes, lighting
    upgrades.sort((a, b) => {
      const safetyScore = (u: Upgrade) =>
        u.category === "tires" || u.category === "brakes"
          ? 3
          : u.category === "lighting"
          ? 2
          : 1;
      return safetyScore(b) - safetyScore(a);
    });
  }

  return upgrades;
}

const BestUpgradesResultPage: NextPage = () => {
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [emailMessage, setEmailMessage] = useState<string>("");

  const router = useRouter();
  const { year, make, model } = router.query;

  const use = (router.query.use as VehicleUse) || "daily";
  const budget = (router.query.budget as BudgetLevel) || "medium";
  const drivingStyle = (router.query.drivingStyle as string) || "balanced";
  const priority = (router.query.priority as Priority) || "safety";

  const ctx: BuildContext | null = useMemo(() => {
    if (!year || !make || !model) return null;
    return {
      year: String(year),
      make: decodeURIComponent(String(make)),
      model: decodeURIComponent(String(model)),
      use,
      budget,
      drivingStyle,
      priority,
    };
  }, [year, make, model, use, budget, drivingStyle, priority]);

  const upgrades = useMemo(() => (ctx ? buildUpgradePlan(ctx) : []), [ctx]);

  const vehicleLabel = ctx
    ? `${ctx.year} ${ctx.make} ${ctx.model}`.trim()
    : "Your vehicle";

  const planSummaryText = ctx
    ? `This plan focuses on ${
        ctx.priority === "safety"
          ? "safety and control"
          : ctx.priority === "performance"
          ? "performance feel"
          : "comfort and refinement"
      }, with ${
        ctx.budget === "low"
          ? "a tight budget in mind"
          : ctx.budget === "medium"
          ? "a flexible but sensible budget"
          : "room for higher-end parts"
      } for ${
        ctx.use === "daily"
          ? "daily driving"
          : ctx.use === "towing"
          ? "towing and hauling"
          : ctx.use === "offroad"
          ? "trails and light off-road"
          : ctx.use === "performance"
          ? "spirited driving"
          : "mixed use"
      }.`
    : "";

  const buildRetailLink = (category: UpgradeCategory, retailer: "amazon" | "tirerack") => {
    if (!ctx) return "#";
    const baseQuery = `${ctx.year} ${ctx.make} ${ctx.model} ${category}`;
    const q = encodeURIComponent(baseQuery);
    if (retailer === "amazon") {
      return `https://www.amazon.com/s?k=${q}`;
    }
    // simple Tire Rack search link
    return `https://www.tirerack.com/tires/TireSearchResults.jsp?frontWidth=0&frontRatio=0&frontDiameter=0&autoYear=${encodeURIComponent(
      ctx.year
    )}&autoMake=${encodeURIComponent(ctx.make)}&autoModel=${encodeURIComponent(
      ctx.model
    )}`;
  };

  const handleAffiliateClick = (
    retailer: "amazon" | "tirerack",
    category: UpgradeCategory
  ) => {
    if (!ctx) return;
    gtag.event?.("affiliate_click", {
      retailer,
      upgrade_category: category,
      vehicle_year: ctx.year,
      vehicle_make: ctx.make,
      vehicle_model: ctx.model,
      vehicle_use: ctx.use,
      budget_level: ctx.budget,
    });
  };

  async function sendPlanEmail(email: string) {
    if (!ctx) return;

    try {
      setEmailStatus("sending");
      setEmailMessage("");

      const payload = {
        year: ctx.year,
        make: ctx.make,
        model: ctx.model,
        trim: "",
        email,
        drivingStyle: ctx.drivingStyle,
        budgetLevel: ctx.budget,
        priorities: ctx.priority,
        planSummary: planSummaryText,
        upgrades: upgrades.map((u) => ({
          name: u.title,
          category: u.category,
          impactLabel: impactLabel[u.impact],
          // using estCost as a loose "price band" label for the email
          priceBand: u.estCost,
          notes: u.description,
        })),
      };

      const res = await fetch("/api/bestupgrades-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to send plan email");
      }

      setEmailStatus("sent");
      setEmailMessage("Plan emailed! Check your inbox for a copy of this upgrade plan.");
      gtag.event?.("best_upgrades_email_sent", {
        vehicle_year: ctx.year,
        vehicle_make: ctx.make,
        vehicle_model: ctx.model,
      });
    } catch (err) {
      console.error("[best-upgrades] Error sending plan email:", err);
      setEmailStatus("error");
      setEmailMessage(
        "We couldn’t send the email just now. Please try again in a few moments."
      );
    }
  }

  if (!ctx) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
          <p className="text-sm text-slate-300 mb-4">
            We couldn&apos;t read your vehicle info from the URL.
          </p>
          <Link
            href="/best-upgrades"
            className="inline-flex items-center rounded-md border border-cyan-400/70 px-3 py-1.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10 transition-colors"
          >
            Back to Best Upgrades Planner
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Best upgrades for {vehicleLabel} – AutoGradeHQ</title>
        <meta
          name="description"
          content={`A prioritized upgrade plan for your ${vehicleLabel}, based on how you drive and your budget.`}
        />
      </Head>

      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14 space-y-10">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">
              Upgrade plan generated
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 leading-tight">
              Best upgrade priorities for your {vehicleLabel}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Based on your answers, this plan focuses on{" "}
              <span className="font-semibold text-cyan-200">
                {priority === "safety"
                  ? "safety and control"
                  : priority === "performance"
                  ? "performance feel"
                  : "comfort and refinement"}
              </span>
              , with{" "}
              <span className="font-semibold text-cyan-200">
                {budget === "low"
                  ? "a tight budget in mind"
                  : budget === "medium"
                  ? "a flexible but sensible budget"
                  : "room for higher-end parts"}
              </span>{" "}
              and use-case leaning toward{" "}
              <span className="font-semibold text-cyan-200">
                {use === "daily"
                  ? "daily driving"
                  : use === "towing"
                  ? "towing and hauling"
                  : use === "offroad"
                  ? "trails and light off-road"
                  : use === "performance"
                  ? "spirited driving"
                  : "mixed use"}
              </span>
              .
            </p>
          </header>

          {/* Email plan card */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <p className="text-xs text-slate-300 mb-2">
              Want to keep this plan handy? Email yourself a copy with a recap and a link
              to shop the top upgrade.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = String(formData.get("planEmail") || "").trim();
                if (!email) return;
                sendPlanEmail(email);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                name="planEmail"
                type="email"
                required
                placeholder="you@example.com"
                className="flex-1 rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70"
              />
              <button
                type="submit"
                disabled={emailStatus === "sending"}
                className="inline-flex items-center justify-center rounded-md bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow shadow-cyan-500/25 hover:bg-cyan-300 transition disabled:opacity-60"
              >
                {emailStatus === "sending" ? "Sending..." : "Email me this plan"}
              </button>
            </form>
            {emailMessage && (
              <p
                className={`mt-2 text-[11px] ${
                  emailStatus === "error" ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {emailMessage}
              </p>
            )}
          </section>

          {/* Upgrade list */}
          <section className="space-y-5">
            {upgrades.map((upgrade, index) => (
              <article
                key={upgrade.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 shadow-[0_20px_50px_rgba(15,23,42,0.9)]"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 mb-1">
                      #{index + 1} — {upgrade.category.toUpperCase()}
                    </p>
                    <h2 className="text-lg font-semibold text-slate-50">
                      {upgrade.title}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold " +
                        impactColor[upgrade.impact]
                      }
                    >
                      {impactLabel[upgrade.impact]}
                    </span>
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold " +
                        riskColor[upgrade.risk]
                      }
                    >
                      {riskLabel[upgrade.risk]}
                    </span>
                    <span className="text-[11px] text-slate-300 mt-1">
                      Est. parts budget:{" "}
                      <span className="font-semibold text-slate-50">
                        {upgrade.estCost}
                      </span>
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-300 mb-2">
                  {upgrade.description}
                </p>
                <p className="text-xs text-slate-300 mb-3">
                  <span className="font-semibold text-slate-100">
                    Why this is high on the list:{" "}
                  </span>
                  {upgrade.whyNow}
                </p>

                <div className="grid gap-4 sm:grid-cols-3 text-xs text-slate-300 mb-4">
                  <div className="sm:col-span-1">
                    <p className="font-semibold text-slate-100 mb-1">Pros</p>
                    <ul className="list-disc list-inside space-y-1">
                      {upgrade.pros.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="sm:col-span-1">
                    <p className="font-semibold text-slate-100 mb-1">
                      Trade-offs
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {upgrade.cons.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="sm:col-span-1">
                    <p className="font-semibold text-slate-100 mb-1">
                      Best fit
                    </p>
                    <p className="text-slate-300">
                      {upgrade.recommendedFor}
                    </p>
                  </div>
                </div>

                {/* Shop links */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 mt-3">
                  <a
                    href={buildRetailLink(upgrade.category, "tirerack")}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      handleAffiliateClick("tirerack", upgrade.category)
                    }
                    className="inline-flex items-center rounded-md border border-cyan-400/70 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/20 transition-colors"
                  >
                    View {upgrade.category} options on Tire Rack
                  </a>
                  <a
                    href={buildRetailLink(upgrade.category, "amazon")}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      handleAffiliateClick("amazon", upgrade.category)
                    }
                    className="inline-flex items-center rounded-md border border-slate-500 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-800/80 transition-colors"
                  >
                    Search {upgrade.category} options on Amazon
                  </a>
                </div>
              </article>
            ))}
          </section>

          <footer className="border-t border-slate-800 pt-6 mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-slate-400">
              This is a starting point, not a hard rulebook. Always double-check exact
              fitment before ordering parts—especially wheels, tires, and suspension.
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Link
                href="/fitment"
                className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors"
              >
                Run a quick fitment sanity check
              </Link>
              <Link
                href="/best-upgrades"
                className="inline-flex items-center rounded-md border border-slate-700 px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-900/80 transition-colors"
              >
                Start over with a different setup
              </Link>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
};

export default BestUpgradesResultPage;
