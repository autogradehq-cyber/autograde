// src/lib/fitment.ts

export type TireSize = {
  sectionWidthMm: number; // e.g. 285
  aspectRatio: number; // e.g. 70
  wheelDiameterIn: number; // e.g. 17
};

export type FitmentInput = {
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleTrim?: string;
  stockTire?: string;
  newTire: string;
  liftAmountIn?: number; // 0, 1, 2, etc.
  wheelOffsetChangeMm?: number; // negative = more poke, positive = more tucked
};

export type FitmentRiskLevel = "low" | "medium" | "high";

export type FitmentResult = {
  ok: boolean;
  error?: string;

  parsedStock?: TireSize | null;
  parsedNew: TireSize;

  stockDiameterIn?: number | null;
  newDiameterIn: number;
  diameterChangeIn?: number | null;
  diameterChangePercent?: number | null;

  widthChangeIn?: number | null;
  speedometerErrorPercent?: number | null;

  rubRisk: FitmentRiskLevel;
  summary: string;
  detailedNotes: string[];
};

/**
 * Parse a tire size like "285/70R17" or "285/70-17"
 */
export const parseTireSize = (input: string): TireSize | null => {
  if (!input) return null;
  const normalized = input.toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/(\d{3})\/(\d{2})R?(\d{2})/);
  if (!match) return null;

  const sectionWidthMm = parseInt(match[1], 10);
  const aspectRatio = parseInt(match[2], 10);
  const wheelDiameterIn = parseInt(match[3], 10);

  if (
    !Number.isFinite(sectionWidthMm) ||
    !Number.isFinite(aspectRatio) ||
    !Number.isFinite(wheelDiameterIn)
  ) {
    return null;
  }

  return { sectionWidthMm, aspectRatio, wheelDiameterIn };
};

/**
 * Compute overall tire diameter in inches from a TireSize.
 */
export const tireDiameterIn = (size: TireSize): number => {
  const sidewallMm = size.sectionWidthMm * (size.aspectRatio / 100);
  const sidewallIn = sidewallMm / 25.4;
  return size.wheelDiameterIn + 2 * sidewallIn;
};

/**
 * Rough section width in inches.
 */
export const tireWidthIn = (size: TireSize): number => {
  return size.sectionWidthMm / 25.4;
};

/**
 * Core fitment logic: compares stock vs new and estimates rub risk + notes.
 */
export const evaluateFitment = (input: FitmentInput): FitmentResult => {
  const {
    vehicleYear,
    vehicleMake,
    vehicleModel,
    vehicleTrim,
    stockTire,
    newTire,
    liftAmountIn = 0,
    wheelOffsetChangeMm = 0,
  } = input;

  const vehicleLabel = [vehicleYear, vehicleMake, vehicleModel, vehicleTrim]
    .filter(Boolean)
    .join(" ")
    .trim();

  const parsedNew = parseTireSize(newTire);
  if (!parsedNew) {
    return {
      ok: false,
      error:
        "We couldn’t read the new tire size. Use a format like 285/70R17 or 265/65R18.",
      parsedNew: {
        sectionWidthMm: NaN,
        aspectRatio: NaN,
        wheelDiameterIn: NaN,
      },
      newDiameterIn: NaN,
      rubRisk: "high",
      summary: "",
      detailedNotes: [],
    };
  }

  const parsedStock = stockTire ? parseTireSize(stockTire) : null;

  const newDiameter = tireDiameterIn(parsedNew);
  const newWidthIn = tireWidthIn(parsedNew);

  let stockDiameter: number | null = null;
  let stockWidthIn: number | null = null;
  let diameterChange: number | null = null;
  let diameterChangePercent: number | null = null;
  let widthChangeIn: number | null = null;
  let speedoError: number | null = null;

  if (parsedStock) {
    stockDiameter = tireDiameterIn(parsedStock);
    stockWidthIn = tireWidthIn(parsedStock);
    diameterChange = newDiameter - stockDiameter;
    diameterChangePercent = (diameterChange / stockDiameter) * 100;
    widthChangeIn = newWidthIn - stockWidthIn;
    // Speedometer error: larger diameter -> speedo reads lower than actual
    speedoError = diameterChangePercent;
  }

  // --- Rub risk heuristic ---
  // Baseline risk from diameter change and lift amount.
  let risk: FitmentRiskLevel = "medium";
  const notes: string[] = [];

  if (parsedStock && diameterChangePercent !== null) {
    if (Math.abs(diameterChangePercent) <= 3) {
      risk = "low";
      notes.push(
        "Overall diameter is within about 3% of stock, which is usually safe on many vehicles."
      );
    } else if (Math.abs(diameterChangePercent) <= 6) {
      risk = "medium";
      notes.push(
        "Overall diameter is about 3–6% different from stock. This often fits but may rub at full lock or over big bumps."
      );
    } else {
      risk = "high";
      notes.push(
        "Overall diameter changes more than ~6%. This is where rubbing, trimming, or more lift is commonly required."
      );
    }
  } else {
    // No stock size – be conservative but not alarmist
    risk = "medium";
    notes.push(
      "We don’t have a stock tire size to compare to, so we’re giving general guidance only. Always test lock-to-lock and full compression."
    );
  }

  // Adjust risk based on lift
  if (liftAmountIn >= 2 && risk !== "low") {
    risk = "medium";
    notes.push(
      `You listed about ${liftAmountIn}" of lift/level. That usually helps clearance and may reduce rubbing risk if the rest of the setup is reasonable.`
    );
  } else if (liftAmountIn >= 1 && risk === "high") {
    notes.push(
      `You listed about ${liftAmountIn}" of lift/level, which helps, but the new tire may still be aggressive for many setups.`
    );
  } else if (liftAmountIn < 1 && risk !== "low") {
    notes.push(
      "On stock suspension or very small lift, aggressive size changes are more likely to rub the fenders or liners."
    );
  }

  // Offset change notes
  if (wheelOffsetChangeMm !== 0) {
    const direction = wheelOffsetChangeMm < 0 ? "stick out farther" : "tuck in more";
    notes.push(
      `Your listed wheel offset change will make the wheels ${direction} by about ${Math.abs(
        wheelOffsetChangeMm
      ).toFixed(1)} mm. More poke (negative offset) increases fender and liner rub risk.`
    );
  }

  if (widthChangeIn !== null && Math.abs(widthChangeIn) > 0.8) {
    notes.push(
      `The tire is roughly ${widthChangeIn > 0 ? "wider" : "narrower"} by about ${Math.abs(
        widthChangeIn
      ).toFixed(
        1
      )}" compared to stock. Extra width can rub on the upper control arm, sway bar, or inner fender at full lock.`
    );
  }

  if (speedoError !== null) {
    const sign = speedoError > 0 ? "slower" : "faster";
    notes.push(
      `At an indicated 60 mph, your true speed would be roughly ${(
        60 * (1 + speedoError / 100)
      ).toFixed(1)} mph. Bigger tires make the speedometer read ${sign} than actual.`
    );
  }

  notes.push(
    "Always check lock-to-lock steering at full droop and after an alignment. Real-world trimming needs vary by exact wheel, tire brand, and how the vehicle is used."
  );

  const summaryVehicle = vehicleLabel || "this vehicle";

  let summary = `Based on the sizes you entered, this tire is a ${risk} rub-risk choice for ${summaryVehicle}.`;
  if (!parsedStock) {
    summary =
      "We don’t have a stock size to compare to, so this is general guidance only. Use a test fit and detailed fitment guides when possible.";
  }

  return {
    ok: true,
    parsedStock,
    parsedNew,
    stockDiameterIn: stockDiameter,
    newDiameterIn: newDiameter,
    diameterChangeIn: diameterChange,
    diameterChangePercent,
    widthChangeIn,
    speedometerErrorPercent: speedoError,
    rubRisk: risk,
    summary,
    detailedNotes: notes,
  };
};
