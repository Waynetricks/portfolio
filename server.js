require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse URL-encoded and JSON form bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (index.html, michael.jpg, etc.)
app.use(express.static(path.join(__dirname)));

// Email transporter — uses credentials from .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// POST /contact — receives the consultation form
app.post("/contact", async (req, res) => {
  const { name, organization, email, location, service, timeframe, appointment_date, appointment_time, message, "bot-field": bot } = req.body;

  // Honeypot spam check
  if (bot) {
    return res.status(200).json({ ok: true }); // silently discard bots
  }

  // Basic validation
  if (!name || !email) {
    return res.status(400).json({ ok: false, error: "Name and email are required." });
  }

  // Format appointment display
  const appointmentStr = timeframe || (appointment_date ? `${appointment_date}${appointment_time ? " at " + appointment_time : ""}` : "—");

  const mailOptions = {
    from: `"${name}" <${process.env.SMTP_USER}>`,
    to: process.env.RECIPIENT_EMAIL || "michael.kehongoh@sematanzania.org",
    replyTo: email,
    subject: `New Consultation Request — ${service || "General Enquiry"}`,
    text: [
      `Name:          ${name}`,
      `Organization:  ${organization || "—"}`,
      `Email:         ${email}`,
      `Location:      ${location || "—"}`,
      `Service:       ${service || "—"}`,
      `Appointment:   ${appointmentStr}`,
      ``,
      `Message:`,
      message || "—",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#13262B">
        <h2 style="color:#0A3F4A;border-bottom:2px solid #D9A23A;padding-bottom:10px">
          New Consultation Request
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:8px 0;font-weight:bold;width:140px">Name</td><td>${name}</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold">Organization</td><td>${organization || "—"}</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 0;font-weight:bold">Location</td><td>${location || "—"}</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold">Service</td><td>${service || "—"}</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold">Appointment</td><td><strong style="color:#0A3F4A">${appointmentStr}</strong></td></tr>
        </table>
        <h3 style="color:#0A3F4A">Message</h3>
        <p style="background:#EDF4F5;padding:16px;border-radius:8px;white-space:pre-line">${message || "—"}</p>
        <p style="color:#546A70;font-size:0.85rem;margin-top:32px">
          Reply directly to this email to respond to ${name}.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ ok: true });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to send email." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
