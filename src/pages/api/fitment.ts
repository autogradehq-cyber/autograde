// src/pages/api/fitment.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  evaluateFitment,
  type FitmentInput,
  type FitmentResult,
} from "../../lib/fitment";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<FitmentResult>
) {
  // Accept both POST body and GET query for flexibility
  const source: any =
    req.method === "POST"
      ? req.body
      : Object.keys(req.query || {}).length
      ? req.query
      : {};

  const input: FitmentInput = {
    vehicleYear: source.year || source.vehicleYear || "",
    vehicleMake: source.make || source.vehicleMake || "",
    vehicleModel: source.model || source.vehicleModel || "",
    vehicleTrim: source.trim || source.vehicleTrim || "",
    stockTire: source.stockTire || source.stock || "",
    newTire: source.newTire || source.new || "",
    liftAmountIn: source.liftAmountIn
      ? parseFloat(String(source.liftAmountIn))
      : 0,
    wheelOffsetChangeMm: source.wheelOffsetChangeMm
      ? parseFloat(String(source.wheelOffsetChangeMm))
      : 0,
  };

  if (!input.newTire) {
    return res.status(400).json({
      ok: false,
      error: "Please provide at least a new tire size like 285/70R17.",
      parsedNew: {
        sectionWidthMm: NaN,
        aspectRatio: NaN,
        wheelDiameterIn: NaN,
      },
      rubRisk: "high",
      summary: "",
      detailedNotes: [],
    });
  }

  const result = evaluateFitment(input);

  if (!result.ok) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}
