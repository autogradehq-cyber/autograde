import type { NextApiRequest, NextApiResponse } from "next";
import sendgrid from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
const toEmail = process.env.LEAD_NOTIFY_TO;
const fromEmail = process.env.LEAD_NOTIFY_FROM || process.env.LEAD_NOTIFY_TO || "";

if (apiKey) {
  sendgrid.setApiKey(apiKey);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { year, make, model, trim } = req.body || {};

  // Not hard-failing on missing fields, but you can tighten this later.
  if (!year || !make || !model) {
    console.warn("Vehicle lead missing some fields:", { year, make, model, trim });
  }

  if (!apiKey || !toEmail || !fromEmail) {
    console.error("Vehicle lead: missing SendGrid env vars");
    return res.status(200).json({ ok: true });
  }

  try {
    await sendgrid.send({
      to: toEmail,
      from: fromEmail,
      subject: "New AutoGrade vehicle recommendations lead",
      text: `New high-intent lead:

Year:  ${year || "(not provided)"}
Make:  ${make || "(not provided)"}
Model: ${model || "(not provided)"}
Trim:  ${trim || "(not provided)"}

Time: ${new Date().toISOString()}
`,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("SendGrid error (vehicle lead):", error);
    return res.status(500).json({ ok: false, error: "Failed to send email" });
  }
}
