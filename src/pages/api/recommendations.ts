// src/pages/api/recommendations.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Keep this in sync with the frontend usage in compatibility.tsx
export type UpgradeIdea = {
  name: string;
  type: string; // e.g. "all-terrain tires", "leveling kit", "tonneau cover"
  summary: string;
  priceBand: "budget" | "midrange" | "premium";
  examplePartHint: string; // human-readable hint, not a SKU
};

export type UpgradeRecommendation = {
  overview: string;
  fitmentConfidence: number; // 0–100
  valueScore: number; // 0–100
  performanceImpact: number; // 0–100
  riskLevel: "low" | "medium" | "high";
  priceBand: "budget" | "midrange" | "premium";
  potentialIssues: string[];
  recommendedUpgradeIdeas: UpgradeIdea[];
  shortExplanation: string;
  decisionSummary: string;
};

type ApiResponse =
  | { ok: true; recommendation: UpgradeRecommendation }
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
    upgradeType,
    drivingStyle,
    budgetLevel,
    priorities,
    email,
  } = req.body || {};

  if (!year || !make || !model || !upgradeType) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: year, make, model, upgradeType",
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
            "Your job: help users avoid bad fitment and choose upgrades that make sense for daily life.",
            "You MUST respond with a single JSON object that matches the UpgradeRecommendation type.",
            "Do NOT invent specific brand names unless they are well-known and widely available.",
            "Never claim 100% guaranteed fitment; use confident but honest language instead.",
            "Assume current knowledge only up to your training cutoff; do not pretend to have live inventory data.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Vehicle: ${vehicleString}`,
            `Upgrade user is considering: ${upgradeType}`,
            drivingStyle ? `Driving style: ${drivingStyle}` : "",
            budgetLevel ? `Budget level: ${budgetLevel}` : "",
            priorities ? `User priorities: ${priorities}` : "",
            email ? `Contact email (for context only): ${email}` : "",
            "",
            "Return a JSON object with this exact shape:",
            JSON.stringify(
              {
                overview: "One paragraph summary of whether this upgrade makes sense.",
                fitmentConfidence: 0,
                valueScore: 0,
                performanceImpact: 0,
                riskLevel: "medium",
                priceBand: defaultPriceBand,
                potentialIssues: [
                  "List key risks like rubbing, gearing changes, ride harshness, safety, or towing impact.",
                ],
                recommendedUpgradeIdeas: [
                  {
                    name: "Short, descriptive upgrade name",
                    type: "category like 'all-terrain tires' or 'tonneau cover'",
                    summary:
                      "Why this is a good direction for this vehicle & use case.",
                    priceBand: defaultPriceBand,
                    examplePartHint:
                      "Human-readable description like '275/65R18 all-terrain tire aimed at quiet daily driving.'",
                  },
                ],
                shortExplanation:
                  "Plain-language explanation of what the user should do next in 2–3 sentences.",
                decisionSummary:
                  "Short summary sentence they could screenshot, like 'Safe to run 285/70R17s with minor trimming; choose an E-load AT if you tow.'",
              },
              null,
              2
            ),
            "",
            "Additional rules:",
            "- fitmentConfidence, valueScore, and performanceImpact must be integers from 0 to 100.",
            "- recommendedUpgradeIdeas should usually have 2–3 items: e.g. safe option, more aggressive option, and budget-friendly option.",
            "- For tires or wheels, mention if they should check a fitment tool at Tire Rack or similar.",
            "- For truck accessories (tonneau, running boards, bed covers, steps), mention that RealTruck-type retailers specialize in these.",
            "- For everything else, default to general retailers (like Amazon) as a concept, not by name in the JSON.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("No content returned from model");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[recommendations] JSON parse error:", err, raw);
      throw new Error("Failed to parse model JSON");
    }

    // Some models might nest under { recommendation: { ... } }
    const rec: UpgradeRecommendation =
      parsed.recommendation ?? parsed ?? ({} as any);

    // Minimal sanity checks with fallbacks
    const clamp = (n: any) =>
      Math.max(0, Math.min(100, Number.isFinite(Number(n)) ? Number(n) : 50));

    rec.fitmentConfidence = clamp(rec.fitmentConfidence);
    rec.valueScore = clamp(rec.valueScore);
    rec.performanceImpact = clamp(rec.performanceImpact);

    if (!rec.riskLevel || !["low", "medium", "high"].includes(rec.riskLevel)) {
      rec.riskLevel = "medium";
    }

    if (
      !rec.priceBand ||
      !["budget", "midrange", "premium"].includes(rec.priceBand)
    ) {
      rec.priceBand = defaultPriceBand;
    }

    if (!Array.isArray(rec.potentialIssues)) {
      rec.potentialIssues = [];
    }

    if (!Array.isArray(rec.recommendedUpgradeIdeas)) {
      rec.recommendedUpgradeIdeas = [];
    } else {
      rec.recommendedUpgradeIdeas = rec.recommendedUpgradeIdeas.map(
        (idea: any): UpgradeIdea => ({
          name: idea.name || "Upgrade direction",
          type: idea.type || "upgrade",
          summary:
            idea.summary ||
            "High-level upgrade direction based on your vehicle and goals.",
          priceBand:
            ["budget", "midrange", "premium"].includes(idea.priceBand) &&
            idea.priceBand
              ? idea.priceBand
              : defaultPriceBand,
          examplePartHint:
            idea.examplePartHint ||
            "Example style and size of part to consider; still verify exact fitment.",
        })
      );
    }

    rec.overview =
      rec.overview ||
      `High-level recommendation for ${vehicleString} with upgrade: ${upgradeType}.`;
    rec.shortExplanation =
      rec.shortExplanation ||
      "This upgrade can work, but double-check fitment and alignment with your daily use.";
    rec.decisionSummary =
      rec.decisionSummary ||
      "Good idea with some tradeoffs — review the notes and shop carefully.";

    return res.status(200).json({ ok: true, recommendation: rec });
  } catch (error: any) {
    console.error("[recommendations] API error:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to generate recommendation. Please try again soon.",
    });
  }
}
