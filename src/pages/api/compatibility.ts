// src/pages/api/compatibility.ts
import type { NextApiRequest, NextApiResponse } from "next";
import sgMail from "@sendgrid/mail";
import type { UpgradeRecommendation, UpgradeIdea } from "./recommendations";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;

// IMPORTANT:
// SENDGRID_FROM_EMAIL must be a VERIFIED sender in SendGrid (Single Sender or Domain Auth).
const FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL || "noreply@autogradehq.com";

// Where YOU want to receive lead notifications (your real inbox)
const NOTIFY_EMAIL =
  process.env.SENDGRID_NOTIFY_EMAIL || process.env.SENDGRID_FROM_EMAIL || "";

const SITE_URL = process.env.SITE_URL || "https://autogradehq.com";

if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
} else {
  console.warn(
    "[/api/compatibility] Missing SENDGRID_API_KEY; emails will fail until configured."
  );
}

type SuccessResponse = {
  ok: true;
  affiliateUrl: string;
  vendor: "amazon" | "tirerack" | "realtruck";
  vendorLabel: "Amazon" | "Tire Rack" | "RealTruck";
  recommendation?: UpgradeRecommendation | null;
};

type ErrorResponse = { ok: false; error: string };

type AffiliateVendor = "amazon" | "tirerack" | "realtruck";

const chooseVendor = (text: string): AffiliateVendor => {
  const t = (text || "").toLowerCase();

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

const vendorLabelFromVendor = (vendor: AffiliateVendor) =>
  vendor === "tirerack" ? "Tire Rack" : vendor === "realtruck" ? "RealTruck" : "Amazon";

const buildAffiliateUrl = (vendor: AffiliateVendor, keywords: string): string => {
  const params = new URLSearchParams();
  params.set("vendor", vendor);
  params.set("q", keywords || "auto upgrade");
  return `${SITE_URL}/api/out?${params.toString()}`;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Minimal HTML escaping to prevent broken markup or injection
function escapeHtml(input: unknown) {
  const s = String(input ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeClampScore(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
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
    upgrade,
    email, // OPTIONAL now
    drivingStyle,
    budgetLevel,
    topPriority,
    recommendation, // <-- NEW: full recommendation object from the client (optional)
  } = req.body || {};

  // Email is no longer required to show results on screen
  if (!year || !make || !model || !upgrade) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: year, make, model, and upgrade are required.",
    });
  }

  // If email provided, validate it (but do not block if omitted)
  const emailString = String(email || "").trim();
  if (emailString && !isValidEmail(emailString)) {
    return res.status(400).json({
      ok: false,
      error: "Please enter a valid email address.",
    });
  }

  const vehicleLine = `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`.trim();

  // Build affiliate link (generic)
  const keywords = `${year} ${make} ${model} ${upgrade}`.trim();
  const primaryVendor = chooseVendor(String(upgrade));
  const affiliateUrl = buildAffiliateUrl(primaryVendor, keywords);

  const vendorLabel = vendorLabelFromVendor(primaryVendor);

  // Prepare option links if we have AI ideas
  const ideas: UpgradeIdea[] = Array.isArray(recommendation?.recommendedUpgradeIdeas)
    ? recommendation.recommendedUpgradeIdeas
    : [];

  const ideaBlocksHtml = ideas.length
    ? ideas
        .slice(0, 4)
        .map((idea) => {
          const ideaName = escapeHtml(idea.name);
          const ideaType = escapeHtml(idea.type);
          const ideaSummary = escapeHtml(idea.summary);
          const ideaHint = escapeHtml(idea.examplePartHint);
          const ideaBand = escapeHtml(idea.priceBand);

          const v = chooseVendor(`${idea.type} ${idea.name}`);
          const label = vendorLabelFromVendor(v);

          const k = `${vehicleLine} ${idea.type} ${idea.name}`.trim();
          const href = buildAffiliateUrl(v, k);

          return `
          <div style="border-radius:12px; border:1px solid #1f2937; background:#020617; padding:12px 12px; margin-top:10px;">
            <div style="font-size:13px; font-weight:700; color:#e5e7eb; margin-bottom:4px;">${ideaName}</div>
            <div style="font-size:11px; color:#9ca3af; margin-bottom:6px;">Type: ${ideaType} • Price: ${ideaBand}</div>
            <div style="font-size:12px; color:#cbd5f5; line-height:1.6; margin-bottom:6px;">${ideaSummary}</div>
            <div style="font-size:11px; color:#94a3b8; line-height:1.6; margin-bottom:10px;">
              Example approach: <span style="color:#e5e7eb;">${ideaHint}</span>
            </div>
            <a href="${href}"
               style="display:inline-block; padding:9px 14px; border-radius:999px; background:#06b6d4; color:#020617; font-size:12px; font-weight:700; text-decoration:none;">
              View on ${label}
            </a>
          </div>
          `;
        })
        .join("")
    : "";

  // ---------- TEXT VERSION (fallback) ----------
  const fitmentScore = safeClampScore(recommendation?.fitmentConfidence);
  const valueScore = safeClampScore(recommendation?.valueScore);

  const textLines: string[] = [
    `Your AutoGrade Compatibility Breakdown`,
    "",
    `Vehicle & upgrade`,
    `• Vehicle: ${vehicleLine}`,
    `• Upgrade: ${upgrade}`,
  ];

  if (drivingStyle) textLines.push(`• Driving style: ${drivingStyle}`);
  if (budgetLevel) textLines.push(`• Budget level: ${budgetLevel}`);
  if (topPriority) textLines.push(`• Top priority: ${topPriority}`);

  if (fitmentScore !== null) textLines.push(`• Fitment confidence: ${fitmentScore}/100`);
  if (valueScore !== null) textLines.push(`• Value score: ${valueScore}/100`);

  if (recommendation?.shortExplanation || recommendation?.overview) {
    textLines.push(
      "",
      "AutoGrade recommendation:",
      String(recommendation.shortExplanation || recommendation.overview)
    );
  }

  if (ideas.length) {
    textLines.push("", "Suggested options:");
    ideas.slice(0, 4).forEach((idea) => {
      const v = chooseVendor(`${idea.type} ${idea.name}`);
      const label = vendorLabelFromVendor(v);
      const k = `${vehicleLine} ${idea.type} ${idea.name}`.trim();
      const href = buildAffiliateUrl(v, k);
      textLines.push(`• ${idea.name} (${label}): ${href}`);
    });
  } else {
    textLines.push("", `View matching parts on ${vendorLabel}: ${affiliateUrl}`);
  }

  textLines.push("", `Run another check: ${SITE_URL}/compatibility`);

  const textBody = textLines.join("\n");

  // Escape dynamic values for HTML
  const vehicleLineHtml = escapeHtml(vehicleLine);
  const upgradeHtml = escapeHtml(upgrade);
  const drivingStyleHtml = escapeHtml(drivingStyle);
  const budgetLevelHtml = escapeHtml(budgetLevel);
  const topPriorityHtml = escapeHtml(topPriority);

  const hasScores = fitmentScore !== null || valueScore !== null;

  const recommendationSummaryHtml = escapeHtml(
    recommendation?.shortExplanation || recommendation?.overview || ""
  );

  // ---------- HTML VERSION ----------
  const htmlBody = `
  <div style="background-color:#020617; padding:24px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background-color:#020617; border-radius:18px; border:1px solid #0f172a;">
            <tr>
              <td style="padding:20px 20px 8px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                  <tr>
                    <td>
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-right:8px;">
                            <div style="width:28px; height:28px; border-radius:8px; background:#0ea5e9; display:inline-flex; align-items:center; justify-content:center;">
                              <span style="font-weight:700; font-size:16px; color:#020617; line-height:1;">A</span>
                            </div>
                          </td>
                          <td>
                            <div style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#e2e8f0;">
                              AUTOGRADEHQ
                            </div>
                            <div style="font-size:11px; color:#64748b;">
                              AI-Powered Upgrade Advisor
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="font-size:11px; color:#64748b;">
                      <a href="${SITE_URL}" style="color:#22c4ff; text-decoration:none;">autogradehq.com</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 20px 12px 20px;">
                <h1 style="font-size:20px; margin:4px 0 8px 0; color:#e5e7eb; font-weight:600;">
                  Your AutoGrade Compatibility Breakdown
                </h1>
                <p style="margin:0 0 16px 0; font-size:13px; color:#cbd5f5; line-height:1.5;">
                  Here’s a summary you can keep before you buy.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 20px 4px 20px;">
                <div style="border-radius:14px; border:1px solid #1f2937; background:#020617; padding:14px 16px;">
                  <h2 style="font-size:13px; margin:0 0 6px 0; color:#e5e7eb;">Vehicle & upgrade</h2>
                  <ul style="margin:0; padding-left:18px; font-size:13px; color:#e5e7eb; line-height:1.5;">
                    <li><strong>Vehicle:</strong> ${vehicleLineHtml}</li>
                    <li><strong>Upgrade:</strong> ${upgradeHtml}</li>
                    ${drivingStyle ? `<li><strong>Driving style:</strong> ${drivingStyleHtml}</li>` : ""}
                    ${budgetLevel ? `<li><strong>Budget level:</strong> ${budgetLevelHtml}</li>` : ""}
                    ${topPriority ? `<li><strong>Top priority:</strong> ${topPriorityHtml}</li>` : ""}
                  </ul>
                </div>
              </td>
            </tr>

            ${
              hasScores
                ? `
            <tr>
              <td style="padding:8px 20px 0 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                  <tr>
                    ${
                      fitmentScore !== null
                        ? `
                    <td style="padding-right:6px;">
                      <div style="border-radius:12px; border:1px solid #1f2937; background:#020617; padding:10px 12px;">
                        <div style="font-size:11px; color:#9ca3af; margin-bottom:2px;">Fitment confidence</div>
                        <div style="font-size:16px; font-weight:600; color:#e5e7eb;">
                          ${fitmentScore}/100
                        </div>
                      </div>
                    </td>
                        `
                        : ""
                    }
                    ${
                      valueScore !== null
                        ? `
                    <td style="padding-left:6px;">
                      <div style="border-radius:12px; border:1px solid #1f2937; background:#020617; padding:10px 12px;">
                        <div style="font-size:11px; color:#9ca3af; margin-bottom:2px;">Value score</div>
                        <div style="font-size:16px; font-weight:600; color:#e5e7eb;">
                          ${valueScore}/100
                        </div>
                      </div>
                    </td>
                        `
                        : ""
                    }
                  </tr>
                </table>
              </td>
            </tr>
                `
                : ""
            }

            ${
              recommendationSummaryHtml
                ? `
            <tr>
              <td style="padding:14px 20px 4px 20px;">
                <h2 style="font-size:13px; margin:0 0 4px 0; color:#e5e7eb;">AutoGrade recommendation</h2>
                <p style="margin:0 0 10px 0; font-size:13px; color:#cbd5f5; line-height:1.6;">
                  ${recommendationSummaryHtml}
                </p>
              </td>
            </tr>
                `
                : ""
            }

            ${
              ideaBlocksHtml
                ? `
            <tr>
              <td style="padding:6px 20px 4px 20px;">
                <h2 style="font-size:13px; margin:0 0 4px 0; color:#e5e7eb;">Suggested options</h2>
                <p style="margin:0 0 8px 0; font-size:12px; color:#94a3b8; line-height:1.6;">
                  These are “shop directions” — always confirm exact fitment before purchase.
                </p>
                ${ideaBlocksHtml}
              </td>
            </tr>
                `
                : `
            <tr>
              <td style="padding:12px 20px 4px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <a href="${affiliateUrl}"
                         style="display:inline-block; padding:10px 18px; border-radius:999px; background:#06b6d4; color:#020617; font-size:13px; font-weight:600; text-decoration:none;">
                        View matching parts on ${vendorLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
                `
            }

            <tr>
              <td style="padding:10px 20px 18px 20px;">
                <p style="margin:0 0 4px 0; font-size:11px; color:#94a3b8;">
                  This link may pay AutoGradeHQ a small commission if you buy, but it never changes your price.
                </p>
                <p style="margin:6px 0 0 0; font-size:11px; color:#64748b; line-height:1.5;">
                  Run another check at
                  <a href="${SITE_URL}/compatibility" style="color:#22c4ff; text-decoration:none;">autogradehq.com/compatibility</a>.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
  `;

  try {
    // Only send email if user provided a valid email
    if (emailString) {
      if (!SENDGRID_KEY) {
        return res.status(500).json({
          ok: false,
          error:
            "Email service is not configured. Please try again later or contact support.",
        });
      }

      // 1) Customer email (optional)
      await sgMail.send({
        to: emailString,
        from: FROM_EMAIL,
        replyTo: NOTIFY_EMAIL || FROM_EMAIL,
        subject: `Your AutoGradeHQ compatibility breakdown – ${vehicleLine}`,
        text: textBody,
        html: htmlBody,
      });
    }

    // 2) Internal notification (optional; only if NOTIFY_EMAIL is set & valid)
    if (NOTIFY_EMAIL && isValidEmail(NOTIFY_EMAIL)) {
      await sgMail.send({
        to: NOTIFY_EMAIL,
        from: FROM_EMAIL,
        subject: "New AutoGradeHQ compatibility lead",
        text: `New compatibility check request:

Vehicle: ${vehicleLine}
Upgrade: ${upgrade}
Customer email: ${emailString || "n/a"}
Driving style: ${drivingStyle || "n/a"}
Budget level: ${budgetLevel || "n/a"}
Top priority: ${topPriority || "n/a"}

Affiliate vendor: ${vendorLabel}
Affiliate URL: ${affiliateUrl}

Has AI recommendation: ${recommendation ? "yes" : "no"}
Ideas count: ${ideas.length}
`,
      });
    }

    return res.status(200).json({
      ok: true,
      affiliateUrl,
      vendor: primaryVendor,
      vendorLabel,
      recommendation: recommendation ?? null,
    });
  } catch (err: any) {
    const sgDetails =
      err?.response?.body?.errors ? JSON.stringify(err.response.body.errors) : "";

    console.error("[/api/compatibility] Error sending email:", err);
    if (sgDetails) console.error("[/api/compatibility] SendGrid details:", sgDetails);

    return res.status(500).json({
      ok: false,
      error:
        "There was a problem sending your breakdown email. Please try again in a moment.",
    });
  }
}
