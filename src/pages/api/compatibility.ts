// FILE: src/pages/api/compatibility.ts
// Serverless API route to handle compatibility form leads (internal + user email)

import type { NextApiRequest, NextApiResponse } from "next";

type Data = { ok: true } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { year, make, model, trim, upgrade, email } = req.body || {};

  // Basic validation – must match your form fields
  if (!year || !make || !model || !trim || !upgrade || !email) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const userTemplateId = process.env.SENDGRID_TEMPLATE_CONFIRM;

    if (!apiKey) {
      console.warn("SENDGRID_API_KEY is not set. Skipping email send.");
    } else {
      // 1) INTERNAL NOTIFICATION EMAIL (to you / AutoGradeHQ)
      try {
        const internalPayload = {
          personalizations: [
            {
              to: [{ email: "autogradehq@gmail.com" }], // your inbox
            },
          ],
          from: {
            email: "autogradehq@gmail.com", // MUST be a verified sender in SendGrid
            name: "AutoGradeHQ",
          },
          subject: "New AutoGrade vehicle recommendations lead",
          content: [
            {
              type: "text/plain",
              value: [
                "New high-intent lead:",
                "",
                `Year:  ${year}`,
                `Make:  ${make}`,
                `Model: ${model}`,
                `Trim:  ${trim || "(not provided)"}`,
                `Upgrade: ${upgrade}`,
                `Email: ${email}`,
                "",
                `Time: ${new Date().toISOString()}`,
              ].join("\n"),
            },
          ],
        };

        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(internalPayload),
        });
      } catch (err) {
        console.error("Error sending internal lead email:", err);
        // We do NOT throw here – user should still see success.
      }

      // 2) USER CONFIRMATION EMAIL (dynamic template) – only if template ID is set
      if (!userTemplateId) {
        console.warn(
          "SENDGRID_TEMPLATE_CONFIRM is not set. Skipping user confirmation email."
        );
      } else {
        try {
          const userPayload = {
            personalizations: [
              {
                to: [{ email }], // the email entered in the form
                dynamic_template_data: {
                  year,
                  make,
                  model,
                  trim,
                  upgrade,
                },
              },
            ],
            from: {
              email: "autogradehq@gmail.com", // same verified sender
              name: "AutoGradeHQ",
            },
            template_id: userTemplateId,
          };

          await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userPayload),
          });
        } catch (err) {
          console.error("Error sending user confirmation email:", err);
          // Again, don't fail the response – front-end still gets ok: true
        }
      }
    }

    // If we reached here, treat as success for the user
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Unexpected error in /api/compatibility:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
