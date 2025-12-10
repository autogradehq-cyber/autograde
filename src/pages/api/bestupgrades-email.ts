// src/pages/api/bestupgrades-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import sgMail from "@sendgrid/mail";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@autogradehq.com";
const SITE_URL = process.env.SITE_URL || "https://autogradehq.com";

if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
} else {
  console.warn(
    "[/api/bestupgrades-email] Missing SENDGRID_API_KEY; emails will fail until this is configured."
  );
}

type SuccessResponse = { ok: true };
type ErrorResponse = { ok: false; error: string };

type AffiliateVendor = "amazon" | "tirerack" | "realtruck";

const chooseVendor = (upgradeName: string, category?: string): AffiliateVendor => {
  const t = (upgradeName || "").toLowerCase();
  const c = (category || "").toLowerCase();

  if (t.includes("tire") || t.includes("wheel") || c.includes("tire")) {
    return "tirerack";
  }

  if (
    t.includes("tonneau") ||
    t.includes("bed cover") ||
    t.includes("running board") ||
    t.includes("nerf bar") ||
    t.includes("step") ||
    c.includes("exterior")
  ) {
    return "realtruck";
  }

  if (
    t.includes("lift") ||
    t.includes("suspension") ||
    t.includes("shock") ||
    c.includes("suspension")
  ) {
    return "amazon";
  }

  return "amazon";
};

const buildAffiliateUrl = (vendor: AffiliateVendor, keywords: string): string => {
  const params = new URLSearchParams();
  params.set("vendor", vendor);
  params.set("q", keywords || "auto upgrade");
  return `${SITE_URL}/api/out?${params.toString()}`;
};

type EmailUpgrade = {
  name: string;
  category?: string;
  impactLabel?: string; // "High impact", "Medium", etc.
  priceBand?: string;   // "budget" | "midrange" | "premium" | free text
  notes?: string;       // short summary / why it matters
};

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
    email,
    drivingStyle,
    budgetLevel,
    priorities,
    planSummary,
    upgrades,
  } = req.body || {};

  if (!year || !make || !model || !email || !Array.isArray(upgrades)) {
    return res.status(400).json({
      ok: false,
      error:
        "Missing required fields: year, make, model, email, and upgrades array are required.",
    });
  }

  if (!SENDGRID_KEY) {
    console.error(
      "[/api/bestupgrades-email] SENDGRID_API_KEY is not configured; cannot send email."
    );
    return res.status(500).json({
      ok: false,
      error:
        "Email service is not configured. Please try again later or contact support.",
    });
  }

  const vehicleLine = `${year} ${make} ${model}${
    trim ? ` ${trim}` : ""
  }`.trim();

  const upgradeList = upgrades as EmailUpgrade[];

  const topUpgrade = upgradeList[0];
  const vendor = chooseVendor(topUpgrade?.name || "", topUpgrade?.category);
  const keywords = `${year} ${make} ${model} ${topUpgrade?.name || ""} ${
    topUpgrade?.category || ""
  }`.trim();
  const affiliateUrl = buildAffiliateUrl(vendor, keywords);

  const vendorLabel =
    vendor === "tirerack"
      ? "Tire Rack"
      : vendor === "realtruck"
      ? "RealTruck"
      : "Amazon";

  const safePlanSummary =
    planSummary ||
    "We’ve built a prioritized upgrade plan for your vehicle based on impact, risk, and budget.";

  // ---------- TEXT VERSION ----------
  const textLines: string[] = [
    "Your AutoGrade Best Upgrades Plan",
    "",
    `Vehicle: ${vehicleLine}`,
  ];

  if (drivingStyle) textLines.push(`Driving style: ${drivingStyle}`);
  if (budgetLevel) textLines.push(`Budget level: ${budgetLevel}`);
  if (priorities) textLines.push(`Top priorities: ${priorities}`);

  textLines.push("", "Plan summary:", safePlanSummary, "", "Top upgrades:");

  upgradeList.forEach((u, idx) => {
    textLines.push(
      ` ${idx + 1}. ${u.name}${
        u.category ? ` (${u.category})` : ""
      }${u.impactLabel ? ` – ${u.impactLabel}` : ""}${
        u.priceBand ? ` [${u.priceBand}]` : ""
      }${u.notes ? ` – ${u.notes}` : ""}`
    );
  });

  textLines.push(
    "",
    `View parts for your top upgrade on ${vendorLabel}: ${affiliateUrl}`,
    "",
    `You can always re-run your plan at ${SITE_URL}/best-upgrades`
  );

  const textBody = textLines.join("\n");

  // ---------- HTML VERSION (branded, like compatibility email) ----------
  const firstThree = upgradeList.slice(0, 3);

  const upgradesHtml = firstThree
    .map((u, idx) => {
      return `
      <tr>
        <td style="padding:6px 0;">
          <div style="border-radius:12px; border:1px solid #1f2937; background:#020617; padding:10px 12px;">
            <div style="font-size:11px; color:#9ca3af; margin-bottom:2px;">
              #${idx + 1}${
        u.category ? ` · ${u.category}` : ""
      }${u.priceBand ? ` · ${u.priceBand}` : ""}
            </div>
            <div style="font-size:13px; color:#e5e7eb; font-weight:600; margin-bottom:2px;">
              ${u.name}
            </div>
            ${
              u.impactLabel
                ? `<div style="font-size:11px; color:#22c4ff; margin-bottom:2px;">${u.impactLabel}</div>`
                : ""
            }
            ${
              u.notes
                ? `<div style="font-size:12px; color:#9ca3af; line-height:1.4;">${u.notes}</div>`
                : ""
            }
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

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
                              Best Upgrades Plan
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
                  Your prioritized upgrade plan
                </h1>
                <p style="margin:0 0 12px 0; font-size:13px; color:#cbd5f5; line-height:1.5;">
                  Here’s a snapshot of the upgrade plan we built for your vehicle on <strong style="color:#f9fafb;">AutoGradeHQ</strong>.
                </p>
              </td>
            </tr>

            <!-- Vehicle & use case -->
            <tr>
              <td style="padding:0 20px 4px 20px;">
                <div style="border-radius:14px; border:1px solid #1f2937; background:#020617; padding:14px 16px;">
                  <h2 style="font-size:13px; margin:0 0 6px 0; color:#e5e7eb;">Vehicle & use case</h2>
                  <ul style="margin:0; padding-left:18px; font-size:13px; color:#e5e7eb; line-height:1.5;">
                    <li><strong>Vehicle:</strong> ${vehicleLine}</li>
                    ${
                      drivingStyle
                        ? `<li><strong>Driving style:</strong> ${drivingStyle}</li>`
                        : ""
                    }
                    ${
                      budgetLevel
                        ? `<li><strong>Budget level:</strong> ${budgetLevel}</li>`
                        : ""
                    }
                    ${
                      priorities
                        ? `<li><strong>Top priorities:</strong> ${priorities}</li>`
                        : ""
                    }
                  </ul>
                </div>
              </td>
            </tr>

            <!-- Plan summary -->
            <tr>
              <td style="padding:10px 20px 0 20px;">
                <h2 style="font-size:13px; margin:0 0 4px 0; color:#e5e7eb;">Plan overview</h2>
                <p style="margin:0 0 10px 0; font-size:13px; color:#cbd5f5; line-height:1.6;">
                  ${safePlanSummary}
                </p>
              </td>
            </tr>

            <!-- Top upgrades -->
            ${
              firstThree.length
                ? `
            <tr>
              <td style="padding:4px 20px 6px 20px;">
                <h2 style="font-size:13px; margin:0 0 4px 0; color:#e5e7eb;">Top upgrade moves</h2>
                <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                  ${upgradesHtml}
                </table>
                ${
                  upgradeList.length > 3
                    ? `<p style="margin:4px 0 0 0; font-size:11px; color:#64748b;">+ ${
                        upgradeList.length - 3
                      } more upgrades in your full plan on AutoGradeHQ.</p>`
                    : ""
                }
              </td>
            </tr>
                `
                : ""
            }

            <!-- CTA -->
            <tr>
              <td style="padding:10px 20px 4px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <a href="${affiliateUrl}"
                         style="display:inline-block; padding:10px 18px; border-radius:999px; background:#06b6d4; color:#020617; font-size:13px; font-weight:600; text-decoration:none;">
                        View parts for your top upgrade on ${vendorLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:8px 0 0 0; font-size:11px; color:#94a3b8;">
                  This link may pay AutoGradeHQ a small commission if you buy, but it never changes your price.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:14px 20px 18px 20px;">
                <p style="margin:0 0 4px 0; font-size:11px; color:#64748b; line-height:1.5;">
                  Keep this email so you have your plan handy when you’re shopping.
                  You can always re-run or tweak your plan at
                  <a href="${SITE_URL}/best-upgrades" style="color:#22c4ff; text-decoration:none;">autogradehq.com/best-upgrades</a>.
                </p>
                <p style="margin:6px 0 0 0; font-size:10px; color:#475569;">
                  You’re receiving this because you requested a best upgrades plan on AutoGradeHQ.
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
    // Customer email
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject: `Your AutoGradeHQ best upgrades plan – ${vehicleLine}`,
      text: textBody,
      html: htmlBody,
    });

    // Internal notification for you
    await sgMail.send({
      to: FROM_EMAIL,
      from: FROM_EMAIL,
      subject: "New AutoGradeHQ best-upgrades plan",
      text: `New best-upgrades plan generated:

Vehicle: ${vehicleLine}
Customer email: ${email}
Driving style: ${drivingStyle || "n/a"}
Budget level: ${budgetLevel || "n/a"}
Priorities: ${priorities || "n/a"}

Plan summary:
${safePlanSummary}

Top upgrades:
${upgradeList
  .map(
    (u, i) =>
      `${i + 1}. ${u.name}${
        u.category ? ` (${u.category})` : ""
      } ${u.priceBand ? `[${u.priceBand}]` : ""} – ${u.impactLabel || ""}`
  )
  .join("\n")}

Affiliate vendor: ${vendorLabel}
Affiliate URL: ${affiliateUrl}
`,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[/api/bestupgrades-email] Error sending email:", err);
    return res.status(500).json({
      ok: false,
      error:
        "There was a problem sending your best upgrades email. Please try again in a moment.",
    });
  }
}
