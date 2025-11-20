// src/pages/api/recommendations.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

let openai: OpenAI | null = null;

const apiKey = process.env.OPENAI_API_KEY;
const projectId = process.env.OPENAI_PROJECT_ID;

// Debug what the server actually sees
console.log("[/api/recommendations] env debug:", {
  hasKey: !!apiKey,
  keyPrefix: apiKey?.slice(0, 12),
  hasProject: !!projectId,
  projectId,
});

if (apiKey && projectId) {
  openai = new OpenAI({
    apiKey,
    project: projectId,
  });
}

// Shape of the recommendation we’ll return to the frontend
export type UpgradeRecommendation = {
  overview: string;
  fitmentConfidence: number; // 0–100
  valueScore: number; // 0–100
  performanceImpact: number; // 0–100
  riskLevel: "low" | "medium" | "high";
  buyRecommendation: "buy_now" | "consider_alternatives" | "avoid";
  keyBenefits: string[];
  potentialIssues: string[];
  recommendedUpgradeIdeas: {
    name: string;
    type: string;
    summary: string;
    priceBand: "budget" | "midrange" | "premium";
    examplePartHint: string;
  }[];
  shortExplanation: string;
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = { ok: true; recommendation: UpgradeRecommendation };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
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
      error:
        "Missing required fields: year, make, model, and upgradeType are required.",
    });
  }

  // If we couldn't construct the client, fall back to mock data so the UI still works
  if (!openai) {
    console.warn(
      "[/api/recommendations] Missing OpenAI client (key or projectId). Returning mock data."
    );

    const mock: UpgradeRecommendation = {
      overview:
        "For this vehicle and upgrade type, a mild, well-reviewed setup is usually the sweet spot — good gains without major compromises.",
      fitmentConfidence: 88,
      valueScore: 82,
      performanceImpact: 75,
      riskLevel: "low",
      buyRecommendation: "consider_alternatives",
      keyBenefits: [
        "Noticeable improvement without dramatically changing daily drivability",
        "Common, proven configurations with lots of community feedback",
      ],
      potentialIssues: [
        "Cheap, no-name parts can introduce noise and reliability issues",
        "Aggressive options may require trimming or additional supporting mods",
      ],
      recommendedUpgradeIdeas: [
        {
          name: "Balanced, daily-driver friendly setup",
          type: upgradeType || "suspension",
          summary:
            "Focus on a combination that keeps the vehicle comfortable but sharper and more capable than stock.",
          priceBand: "midrange",
          examplePartHint:
            "Think reputable brands with many fitment confirmations for this platform.",
        },
      ],
      shortExplanation:
        "Overall, this upgrade can be worth it if you avoid cheap parts and stick to proven, platform-specific options.",
    };

    return res.status(200).json({ ok: true, recommendation: mock });
  }

  try {
    const prompt = `
You are AutoGrade, an AI engine that evaluates automotive upgrades.

Given:
- Vehicle: ${year} ${make} ${model} ${trim || ""}
- Upgrade type: ${upgradeType}
- Driving style: ${drivingStyle || "not specified"}
- Budget level: ${budgetLevel || "not specified"}
- Owner priorities: ${priorities || "not specified"}

Return a STRICT JSON object (no extra text) with this exact shape:

{
  "overview": string,
  "fitmentConfidence": number,
  "valueScore": number,
  "performanceImpact": number,
  "riskLevel": "low" | "medium" | "high",
  "buyRecommendation": "buy_now" | "consider_alternatives" | "avoid",
  "keyBenefits": string[],
  "potentialIssues": string[],
  "recommendedUpgradeIdeas": [
    {
      "name": string,
      "type": string,
      "summary": string,
      "priceBand": "budget" | "midrange" | "premium",
      "examplePartHint": string
    }
  ],
  "shortExplanation": string
}

Guidelines:
- Be realistic and conservative about fitment and risk.
- Consider rubbing, supporting mods, warranty risk, and daily drivability.
- Never mention affiliate links or specific stores; keep it generic for now.
- Tailor the advice to this specific vehicle + upgrade type.
`;

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    const rawText = (response as any).output_text as string | undefined;

    if (!rawText) {
      throw new Error("No output_text returned from model");
    }

    const jsonText = extractJson(rawText);
    const parsed = JSON.parse(jsonText) as UpgradeRecommendation;

    return res.status(200).json({ ok: true, recommendation: parsed });
  } catch (err: any) {
    console.error("[/api/recommendations] Error:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to generate recommendation. Please try again.",
    });
  }
}

function extractJson(text: string): string {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Could not find JSON object in model output");
  }
  return text.slice(firstBrace, lastBrace + 1);
}
