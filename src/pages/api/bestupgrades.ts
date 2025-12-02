// src/pages/api/bestupgrades.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type BestUpgradeIdea = {
  name: string;
  type: string; // e.g. "all-terrain tires", "leveling kit"
  summary: string;
  priceBand: "budget" | "midrange" | "premium";
  examplePartHint: string;
  bestFor: string; // e.g. "daily driver", "heavy towing"
  potentialIssues: string[];
};

export type BestUpgradeCategory = {
  id: string; // e.g. "tires", "suspension"
  label: string; // human heading
  priorityRank: number; // 1 = do this first
  rationale: string; // why this category matters for this vehicle
  recommendedBudgetBand: "budget" | "midrange" | "premium";
  riskLevel: "low" | "medium" | "high";
  ideas: BestUpgradeIdea[];
  overallNote: string;
};

type ApiResponse =
  | { ok: true; categories: BestUpgradeCategory[] }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const {
    year,
    make,
    model,
    trim,
    drivingStyle,
    budgetLevel,
    priorities,
  } = req.body || {};

  if (!year || !make || !model) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: year, make, model",
    });
  }

  try {
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
          content: [
            "You are AutoGrade, an automotive upgrade advisor.",
            "You help users decide which upgrades are *actually worth doing* for their specific vehicle.",
            "You MUST answer with a single JSON object with a `categories` array.",
            "Each category is a high-level upgrade area like tires, suspension, brakes, lighting, armor, towing, reliability, interior comfort, etc.",
            "You are not allowed to claim live pricing or live inventory; use patterns and typical setups only.",
            "For fitment, give realistic cautions: rubbing, trimming, gearing, braking, towing, ride quality, legal issues, etc.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Vehicle: ${vehicleString}`,
            drivingStyle ? `Driving style: ${drivingStyle}` : "",
            budgetLevel ? `Budget level: ${budgetLevel}` : "",
            priorities ? `User priorities: ${priorities}` : "",
            "",
            "Return a JSON object with this shape:",
            JSON.stringify(
              {
                categories: [
                  {
                    id: "tires",
                    label: "Tires & basic wheel setup",
                    priorityRank: 1,
                    rationale:
                      "Why this is one of the highest-impact upgrades for this specific vehicle and use case.",
                    recommendedBudgetBand: defaultPriceBand,
                    riskLevel: "low",
                    ideas: [
                      {
                        name: "Mild all-terrain tire upgrade",
                        type: "all-terrain tires",
                        summary:
                          "Explain why this is a strong baseline upgrade for this vehicle and driving style.",
                        priceBand: defaultPriceBand,
                        examplePartHint:
                          "Example size and style, like '265/70R17 mild all-terrain tire with focus on quiet ride.'",
                        bestFor: "daily driver with some bad weather or dirt roads",
                        potentialIssues: [
                          "Any rubbing, speedometer error, mpg hit, or ride quality changes.",
                        ],
                      },
                    ],
                    overallNote:
                      "Any extra context for how to shop this category safely and intelligently.",
                  },
                ],
              },
              null,
              2
            ),
            "",
            "Important rules:",
            "- Provide 3–6 categories only; prioritize what gives the most value for this specific vehicle and scenario.",
            "- Sort categories by priorityRank where 1 is 'do this first'.",
            "- For trucks & SUVs, tires/suspension/towing often rank high; for sporty cars, tires/brakes/suspension/driver comfort often rank high.",
            "- For each idea, be specific about tradeoffs (noise, firmness, towing, tire wear, MPG, safety).",
            "- Use integers 1, 2, 3, ... for priorityRank.",
            "- Price bands must be one of: 'budget', 'midrange', 'premium'.",
            "- riskLevel must be one of: 'low', 'medium', 'high'.",
            "- Do NOT recommend unsafe or sketchy setups just because they are popular.",
            "- Assume the user will ultimately double-check part numbers with a retailer fitment tool like Tire Rack or a similar vendor.",
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
      // sort by priorityRank ascending
      .sort((a, b) => a.priorityRank - b.priorityRank);

    return res.status(200).json({ ok: true, categories: sanitized });
  } catch (err) {
    console.error("[bestupgrades] API error:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to generate best upgrades. Please try again soon.",
    });
  }
}
