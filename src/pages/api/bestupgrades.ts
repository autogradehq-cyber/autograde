// src/pages/api/bestupgrades.ts
import type { NextApiRequest, NextApiResponse } from "next";
/*
If the external types are not exported from ../../pages/best-upgrades,
re-declare the minimal types locally to avoid the import error.
*/
export type BestUpgradeIdea = {
  name: string;
  type: string;
  summary: string;
  priceBand: "budget" | "midrange" | "premium";
  examplePartHint: string;
  bestFor: string;
  potentialIssues: string[];
};

export type BestUpgradeCategory = {
  id: string;
  label: string;
  priorityRank: number;
  rationale: string;
  recommendedBudgetBand: "budget" | "midrange" | "premium";
  riskLevel: "low" | "medium" | "high";
  ideas: BestUpgradeIdea[];
  overallNote: string;
};

// If the import above causes trouble, comment it out and uncomment the type definitions below:
/*
export type BestUpgradeIdea = {
  name: string;
  type: string;
  summary: string;
  priceBand: "budget" | "midrange" | "premium";
  examplePartHint: string;
  bestFor: string;
  potentialIssues: string[];
};

export type BestUpgradeCategory = {
  id: string;
  label: string;
  priorityRank: number;
  rationale: string;
  recommendedBudgetBand: "budget" | "midrange" | "premium";
  riskLevel: "low" | "medium" | "high";
  ideas: BestUpgradeIdea[];
  overallNote: string;
};
*/

type ApiResponse =
  | { ok: true; categories: BestUpgradeCategory[] }
  | { ok: false; error: string };

/**
 * Fallback heuristic categories we can use if OpenAI fails for any reason.
 * This ensures the page still works and gives useful guidance.
 */
function buildHeuristicCategories(params: {
  year: string;
  make: string;
  model: string;
  trim?: string;
  drivingStyle?: string;
  budgetLevel?: string;
  priorities?: string;
}): BestUpgradeCategory[] {
  const { year, make, model, trim, drivingStyle, budgetLevel, priorities } =
    params;

  const vehicleLabel = [year, make, model, trim].filter(Boolean).join(" ");
  const budget =
    (budgetLevel || "").toLowerCase().includes("budget") ||
    (budgetLevel || "").toLowerCase().includes("cheap")
      ? "budget"
      : (budgetLevel || "").toLowerCase().includes("premium") ||
        (budgetLevel || "").toLowerCase().includes("high")
      ? "premium"
      : "midrange";

  const driving = (drivingStyle || "").toLowerCase();

  const mostlyHighway =
    driving.includes("highway") || driving.includes("commute");
  const offRoad =
    driving.includes("off") ||
    driving.includes("trail") ||
    driving.includes("overland");

  const priority = (priorities || "").toLowerCase();

  const wantsComfort =
    priority.includes("comfort") || priority.includes("quiet");
  const wantsTowing =
    priority.includes("tow") ||
    priority.includes("trailer") ||
    priority.includes("hauling");
  const wantsMpg =
    priority.includes("mpg") ||
    priority.includes("fuel") ||
    priority.includes("economy");
  const wantsPerformance =
    priority.includes("performance") ||
    priority.includes("power") ||
    priority.includes("acceleration");

  const baseNote =
    "Always double-check exact part numbers using a retailer fitment tool before buying. Specs, trims, and regional packages can change what fits.";

  const categories: BestUpgradeCategory[] = [];

  // 1. Tires
  categories.push({
    id: "tires",
    label: "Tires & basic wheel setup",
    priorityRank: 1,
    rationale:
      "Tires are usually the biggest single change you can make to how a vehicle feels and behaves. Grip, noise, comfort, and safety all start here.",
    recommendedBudgetBand: budget as "budget" | "midrange" | "premium",
    riskLevel: "low",
    ideas: [
      {
        name: "Mild all-terrain tire upgrade",
        type: "all-terrain tires",
        summary: offRoad
          ? `A mild all-terrain tire gives you extra bite on dirt, gravel, and bad weather while staying livable for daily driving in a ${vehicleLabel}.`
          : `A mild all-terrain tire gives better all-weather confidence and a tougher look for your ${vehicleLabel} without going full mud-terrain.`,
        priceBand: budget as "budget" | "midrange" | "premium",
        examplePartHint:
          "Look for a mild A/T pattern with good wet-weather reviews. Size like stock or +1 size to avoid rubbing.",
        bestFor: offRoad
          ? "daily driver that sees dirt/gravel, fire roads, or mild trails"
          : "drivers who want more confidence in rain/snow and a tougher look",
        potentialIssues: [
          "Going too large in diameter can cause rubbing on turns or over bumps.",
          "Larger/heavier tires can reduce MPG and softens acceleration.",
          "Speedometer error if overall diameter changes significantly.",
        ],
      },
      {
        name: "Quality highway-terrain or touring tire",
        type: "highway tires",
        summary: mostlyHighway || wantsComfort
          ? `A quiet, comfort-focused highway-terrain or touring tire will calm the ride and road noise on your ${vehicleLabel}.`
          : `If you mostly stay on pavement, a touring or highway-terrain tire will ride quieter and more efficiently than aggressive off-road patterns.`,
        priceBand: budget === "budget" ? "budget" : "midrange",
        examplePartHint:
          "Search for well-reviewed highway/touring tires with strong wet braking and low noise ratings.",
        bestFor: "commuters and road-trip drivers who want comfort and stability",
        potentialIssues: [
          "Less bite in deep mud or loose terrain than aggressive A/T or M/T tires.",
        ],
      },
    ],
    overallNote:
      "Stay close to stock diameter unless you’re also planning suspension/gear changes. Check load rating if you tow or haul heavy. Rotate and align after installation.",
  });

  // 2. Suspension / ride control
  categories.push({
    id: "suspension",
    label: "Suspension & ride control",
    priorityRank: 2,
    rationale:
      "Quality shocks, struts, and small leveling/lift changes can transform how the vehicle feels without making it harsh if chosen correctly.",
    recommendedBudgetBand:
      budget === "budget" ? "budget" : ("midrange" as "midrange"),
    riskLevel: "medium",
    ideas: [
      {
        name: "Quality replacement shocks/struts",
        type: "shocks and struts",
        summary: wantsComfort
          ? `Fresh shocks/struts tuned for comfort can take the float and bounce out of an aging ${vehicleLabel}.`
          : `Even on newer ${vehicleLabel} models, upgraded shocks/struts can improve body control, cornering, and stability, especially with bigger tires.`,
        priceBand:
          budget === "premium"
            ? "midrange"
            : (budget as "budget" | "midrange"),
        examplePartHint:
          "Look for well-reviewed monotube shocks or OE-quality replacements matched to your vehicle’s trim and drive type (4x4, 2WD).",
        bestFor: "drivers who notice float, bounce, or poor control over bumps",
        potentialIssues: [
          "Cheap no-name shocks can ride worse than worn factory parts.",
          "Some upgraded shocks may ride firmer than stock, especially unloaded.",
        ],
      },
      {
        name: "Mild leveling kit or small lift",
        type: "leveling kit or small lift",
        summary: offRoad
          ? `A mild leveling kit on a ${vehicleLabel} can improve clearance for slightly larger tires and help approach angle off-road.`
          : `A small leveling kit mainly changes the stance and can help fit a slightly larger tire size while keeping daily drivability.`,
        priceBand: "budget",
        examplePartHint:
          "Look for complete, vehicle-specific kits from reputable brands. Avoid extreme lifts without supporting components.",
        bestFor: "drivers wanting better stance and a bit more clearance",
        potentialIssues: [
          "Poorly designed kits can affect alignment and tire wear.",
          "Going too tall without correcting geometry can hurt ride and handling.",
        ],
      },
    ],
    overallNote:
      "Plan suspension changes and tire size together. Always get an alignment after changes and re-torque hardware after a few hundred miles.",
  });

  // 3. Brakes
  categories.push({
    id: "brakes",
    label: "Brake feel & confidence",
    priorityRank: 3,
    rationale:
      "Stopping consistently and confidently is more important than adding power. Basic upgrades here often have big safety and confidence benefits.",
    recommendedBudgetBand:
      budget === "budget"
        ? ("budget" as "budget")
        : ("midrange" as "midrange"),
    riskLevel: "low",
    ideas: [
      {
        name: "Quality pads and rotors",
        type: "brake pads and rotors",
        summary: `A set of quality pads and rotors tailored to your driving style can improve stopping consistency and pedal feel on your ${vehicleLabel}.`,
        priceBand:
          budget === "premium"
            ? "midrange"
            : (budget as "budget" | "midrange"),
        examplePartHint:
          "Look for ceramic pads for quiet/low-dust daily driving, or performance pads if you tow, haul, or drive aggressively.",
        bestFor:
          "any driver who notices fade, vibration, or long stopping distances",
        potentialIssues: [
          "Aggressive pads can create more dust and noise.",
          "Slotted/drilled rotors are often more cosmetic than necessary for street use.",
        ],
      },
    ],
    overallNote:
      "Bleeding old fluid and checking caliper slide pins often helps as much as new pads/rotors. Don’t neglect basic maintenance.",
  });

  // 4. Towing/utility (if priorities mention it)
  if (wantsTowing) {
    categories.push({
      id: "towing",
      label: "Towing & load support",
      priorityRank: 4,
      rationale:
        "If you tow or haul regularly, giving the chassis and cooling system some help can protect the vehicle and make it far less stressful to drive.",
      recommendedBudgetBand:
        budget === "budget"
          ? ("budget" as "budget")
          : ("midrange" as "midrange"),
      riskLevel: "medium",
      ideas: [
        {
          name: "Hitch, wiring, and brake controller",
          type: "towing setup",
          summary: `A properly rated hitch, wiring, and brake controller (if needed) tailored to your ${vehicleLabel}'s tow rating is the foundation for safe towing.`,
          priceBand: "midrange",
          examplePartHint:
            "Look for a class-appropriate hitch, vehicle-specific wiring harness, and a proportional brake controller if towing trailers with brakes.",
          bestFor: "drivers planning to tow trailers within the vehicle’s rating",
          potentialIssues: [
            "Never exceed the factory tow rating or payload specs.",
            "Improperly installed wiring can cause electrical issues.",
          ],
        },
        {
          name: "Rear load-support helpers",
          type: "air bags or helper springs",
          summary:
            "Load-support helpers can reduce sag and improve stability when towing or hauling without being a full lift kit.",
          priceBand: "midrange",
          examplePartHint:
            "Search for air helper bags or helper springs designed specifically for your rear suspension design.",
          bestFor:
            "frequent towing/hauling where the rear sags noticeably under load",
          potentialIssues: [
            "Incorrectly inflated air bags can create a harsh ride.",
            "Over-relying on helpers doesn’t increase the actual rated payload/tow capacity.",
          ],
        },
      ],
      overallNote:
        "Always respect factory ratings. Upgrades can help stability and confidence but don’t magically increase how much the vehicle is safely engineered to tow.",
    });
  }

  // 5. Comfort/quiet
  if (wantsComfort || mostlyHighway) {
    categories.push({
      id: "comfort",
      label: "Comfort, noise, and daily livability",
      priorityRank: 5,
      rationale:
        "If you’re in the vehicle every day, small changes that reduce noise and fatigue can matter more than big visual mods.",
      recommendedBudgetBand:
        budget === "premium"
          ? ("midrange" as "midrange")
          : (budget as "budget" | "midrange"),
      riskLevel: "low",
      ideas: [
        {
          name: "Sound deadening in doors and floor",
          type: "sound deadening",
          summary:
            "Strategic sound-deadening material in doors and floor areas can cut down on road noise and make the cabin feel more upscale.",
          priceBand:
            budget === "budget"
              ? ("budget" as "budget")
              : ("midrange" as "midrange"),
          examplePartHint:
            "Look for butyl-based sound deadening sheets and focus on door skins and floor pans first.",
          bestFor: "commuters and road-trippers who drive long distances",
          potentialIssues: [
            "Takes time and trim removal; rushed installs can create rattles.",
            "Added weight is usually small but technically reduces payload slightly.",
          ],
        },
        {
          name: "Seat and steering wheel upgrades",
          type: "seating and ergonomics",
          summary:
            "Better seat cushions, covers, or even upgraded seats and steering wheels can reduce fatigue and make you feel more in control.",
          priceBand:
            budget === "premium"
              ? ("premium" as "premium")
              : ("midrange" as "midrange"),
          examplePartHint:
            "Search for vehicle-specific seat covers or cushions with excellent long-drive comfort reviews.",
          bestFor:
            "drivers who get sore or fatigued after longer drives in the current setup",
          potentialIssues: [
            "Aftermarket seats must be installed safely; never compromise on airbag/seatbelt systems.",
          ],
        },
      ],
      overallNote:
        "Start with noise and ergonomics before chasing flashy cosmetic mods. You’ll notice these changes every single mile.",
    });
  }

  // 6. MPG / efficiency focus
  if (wantsMpg && !offRoad) {
    categories.push({
      id: "efficiency",
      label: "MPG & efficiency-focused tweaks",
      priorityRank: 6,
      rationale:
        "If fuel cost and range are key, staying near stock tire size/weight and cleaning up aero/maintenance can have more impact than bolt-on power parts.",
      recommendedBudgetBand: "budget",
      riskLevel: "low",
      ideas: [
        {
          name: "Low-rolling-resistance tires & alignment",
          type: "efficiency tires and alignment",
          summary:
            "Staying close to stock size with low-rolling-resistance tires and a fresh alignment keeps drag down and tracking straight.",
          priceBand: "budget",
          examplePartHint:
            "Search for eco-focused or low-rolling-resistance tire lines in your stock size. Ask the shop for a proper 4-wheel alignment.",
          bestFor:
            "drivers who put a lot of highway miles and care about fuel spend",
          potentialIssues: [
            "Some eco-focused tires can trade grip for efficiency; read independent reviews.",
          ],
        },
        {
          name: "Basic maintenance catch-up",
          type: "maintenance",
          summary:
            "Fresh filters, spark plugs (if applicable), and correct fluids can restore lost efficiency and smoothness on older vehicles.",
          priceBand: "budget",
          examplePartHint:
            "Use OEM-equivalent or better parts and fluids matched to the engine/transmission in your VIN/trim.",
          bestFor:
            "any higher-mileage vehicle that hasn’t had a full maintenance refresh recently",
          potentialIssues: [
            "Cheap fluids or filters can cause more problems than they fix; stick with known brands.",
          ],
        },
      ],
      overallNote:
        "Avoid aggressive tires, lifts, and heavy accessories if MPG is a top priority. They all add drag and weight.",
    });
  }

  // Ensure at least 3 categories
  const sorted = categories.sort((a, b) => a.priorityRank - b.priorityRank);
  return sorted.length ? sorted : [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Accept any method, pull data from body or query
  const source: any = req.body && Object.keys(req.body).length ? req.body : req.query;

  const {
    year,
    make,
    model,
    trim,
    drivingStyle,
    budgetLevel,
    priorities,
  } = source || {};

  if (!year || !make || !model) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: year, make, model",
    });
  }

  // Try OpenAI, but NEVER break the endpoint if it fails
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const vehicleString = `${year} ${make} ${model}${
      trim ? " " + trim : ""
    }`.trim();

    const userBudget =
      typeof budgetLevel === "string" && budgetLevel.length
        ? budgetLevel.toLowerCase()
        : "midrange";

    const defaultPriceBand: "budget" | "midrange" | "premium" =
      userBudget.includes("budget")
        ? "budget"
        : userBudget.includes("premium")
        ? "premium"
        : "midrange";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are AutoGrade, an automotive upgrade advisor. You output JSON-only responses with a `categories` array.",
        },
        {
          role: "user",
          content: [
            `Vehicle: ${vehicleString}`,
            drivingStyle ? `Driving style: ${drivingStyle}` : "",
            budgetLevel ? `Budget level: ${budgetLevel}` : "",
            priorities ? `User priorities: ${priorities}` : "",
            "",
            "Return ONLY a JSON object with a `categories` array as previously described.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("No content from model");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[bestupgrades] JSON parse error:", err, raw);
      throw new Error("Failed to parse JSON from model");
    }

    let categories: BestUpgradeCategory[] = parsed.categories || parsed || [];

    if (!Array.isArray(categories)) {
      categories = [];
    }

    const validBand = (band: any): "budget" | "midrange" | "premium" => {
      if (band === "budget" || band === "midrange" || band === "premium") {
        return band;
      }
      return defaultPriceBand;
    };

    const validRisk = (risk: any): "low" | "medium" | "high" => {
      if (risk === "low" || risk === "medium" || risk === "high") return risk;
      return "medium";
    };

    const sanitized: BestUpgradeCategory[] = categories
      .map((cat: any, idx: number): BestUpgradeCategory => ({
        id: String(cat.id || `cat_${idx + 1}`).toLowerCase(),
        label: cat.label || "Upgrade category",
        priorityRank:
          Number.isFinite(Number(cat.priorityRank)) && Number(cat.priorityRank) > 0
            ? Number(cat.priorityRank)
            : idx + 1,
        rationale:
          cat.rationale ||
          "High-level reason this upgrade category matters for this vehicle.",
        recommendedBudgetBand: validBand(cat.recommendedBudgetBand),
        riskLevel: validRisk(cat.riskLevel),
        ideas: Array.isArray(cat.ideas)
          ? cat.ideas.map((idea: any, ideaIdx: number): BestUpgradeIdea => ({
              name: idea.name || `Upgrade idea ${ideaIdx + 1}`,
              type: idea.type || "upgrade",
              summary:
                idea.summary ||
                "High-level description of why this upgrade direction could work.",
              priceBand: validBand(idea.priceBand),
              examplePartHint:
                idea.examplePartHint ||
                "Give a descriptive example of the style/size of part to consider.",
              bestFor:
                idea.bestFor ||
                "Describe which type of driver or use case this is best for.",
              potentialIssues: Array.isArray(idea.potentialIssues)
                ? idea.potentialIssues
                : [],
            }))
          : [],
        overallNote:
          cat.overallNote ||
          "Mention how to shop this category and what to double-check before buying.",
      }))
      .sort((a, b) => a.priorityRank - b.priorityRank);

    // If AI somehow returns nothing, still fall back:
    if (!sanitized.length) {
      const fallback = buildHeuristicCategories({
        year,
        make,
        model,
        trim,
        drivingStyle,
        budgetLevel,
        priorities,
      });
      return res.status(200).json({ ok: true, categories: fallback });
    }

    return res.status(200).json({ ok: true, categories: sanitized });
  } catch (err) {
    console.error("[bestupgrades] API error (using fallback):", err);

    const fallback = buildHeuristicCategories({
      year,
      make,
      model,
      trim,
      drivingStyle,
      budgetLevel,
      priorities,
    });

    return res.status(200).json({
      ok: true,
      categories: fallback,
    });
  }
}
