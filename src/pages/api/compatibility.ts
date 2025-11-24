// src/pages/api/compatibility.ts
import type { NextApiRequest, NextApiResponse } from "next";
import sgMail from "@sendgrid/mail";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "autogradehq@gmail.com";
const TEMPLATE_ID = process.env.SENDGRID_TEMPLATE_CONFIRM;

if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
} else {
  console.warn(
    "[/api/compatibility] Missing SENDGRID_API_KEY; emails will not be sent."
  );
}

type SuccessResponse = { ok: true };
type ErrorResponse = { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { year, make, model, trim, upgrade, email } = req.body || {};

  if (!year || !make || !model || !upgrade || !email) {
    return res.status(400).json({
      ok: false,
      error:
        "Missing required fields: year, make, model, upgrade, and email are required.",
    });
  }

  const vehicleLine = `${year} ${make} ${model}${
    trim ? ` ${trim}` : ""
  }`.trim();

  try {
    if (SENDGRID_KEY) {
      // Send confirmation to user
      if (TEMPLATE_ID) {
        await sgMail.send({
          to: email,
          from: FROM_EMAIL,
          templateId: TEMPLATE_ID,
          dynamicTemplateData: {
            vehicle: vehicleLine,
            upgrade,
          },
        });
      } else {
        await sgMail.send({
          to: email,
          from: FROM_EMAIL,
          subject: "Your AutoGradeHQ compatibility check",
          text: `Vehicle: ${vehicleLine}\nUpgrade: ${upgrade}\n\nWe'll follow up with more detail shortly.`,
        });
      }

      // Internal notification
      await sgMail.send({
        to: FROM_EMAIL,
        from: FROM_EMAIL,
        subject: "New AutoGradeHQ compatibility lead",
        text: `Vehicle: ${vehicleLine}\nUpgrade: ${upgrade}\nCustomer email: ${email}`,
      });
    } else {
      console.warn(
        "[/api/compatibility] No SENDGRID_API_KEY configured; skipping email send."
      );
    }

    // Even if email sending fails, the user shouldn't see a hard error.
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[/api/compatibility] Error sending email:", err);
    // Log error but still return ok so the front-end and AI stay smooth.
    return res.status(200).json({ ok: true });
  }
}
