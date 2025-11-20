// src/pages/api/compatibility.ts
import type { NextApiRequest, NextApiResponse } from "next";
import sgMail from "@sendgrid/mail";

type SuccessResponse = { ok: true };
type ErrorResponse = { ok: false; error: string };

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "autogradehq@gmail.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

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
      error: "Missing required fields: year, make, model, upgrade, email.",
    });
  }

  // If SendGrid is not configured, log and return a mock success
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.warn(
      "[/api/compatibility] Missing SendGrid config – skipping email send and returning mock success."
    );
    return res.status(200).json({ ok: true });
  }

  try {
    const subject = `AutoGrade compatibility check for ${year} ${make} ${model}`;
    const plainText = `
AutoGradeHQ Compatibility Request

Vehicle:
- Year: ${year}
- Make: ${make}
- Model: ${model}
- Trim: ${trim || "N/A"}

Upgrade:
- ${upgrade}

Contact:
- Email: ${email}
`;

    const html = `
      <h2>AutoGradeHQ Compatibility Request</h2>
      <p><strong>Vehicle</strong></p>
      <ul>
        <li><strong>Year:</strong> ${year}</li>
        <li><strong>Make:</strong> ${make}</li>
        <li><strong>Model:</strong> ${model}</li>
        <li><strong>Trim:</strong> ${trim || "N/A"}</li>
      </ul>
      <p><strong>Upgrade</strong></p>
      <p>${upgrade}</p>
      <p><strong>Contact</strong></p>
      <p>${email}</p>
    `;

    // Send to you (internal) and optionally to user
    const messages = [
      {
        to: "autogradehq@gmail.com",
        from: SENDGRID_FROM_EMAIL,
        subject: subject,
        text: plainText,
        html,
      },
      {
        to: email,
        from: SENDGRID_FROM_EMAIL,
        subject: "We received your AutoGrade compatibility request",
        text:
          "Thanks for submitting your upgrade details. We'll review fitment, value, and real-world use and send you a breakdown soon.",
        html:
          "<p>Thanks for submitting your upgrade details. We'll review fitment, value, and real-world use and send you a breakdown soon.</p>",
      },
    ];

    await sgMail.send(messages);

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[/api/compatibility] Error sending email:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to send compatibility email via SendGrid.",
    });
  }
}
