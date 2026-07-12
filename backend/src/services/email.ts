import nodemailer from "nodemailer";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

function getSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  };
}

export async function sendQrEmail(
  to: string,
  subject: string,
  qrBuffer: Buffer,
  spectatorName: string,
) {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    h1 { color: #1a1a2e; font-size: 24px; }
    p { color: #555; line-height: 1.6; }
    .qr-wrapper { text-align: center; margin: 24px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>¡Hola ${spectatorName}!</h1>
    <p>Gracias por tu compra. Presentá este código QR en la entrada del evento <strong>Acrobacia en Telas</strong> para acceder.</p>
    <div class="qr-wrapper">
      <img src="cid:qr" alt="QR de ingreso" style="width: 300px; height: 300px;" />
    </div>
    <p>Guardá este correo o mostrá el QR desde tu teléfono el día del evento.</p>
    <div class="footer">
      <p>Acrobacia en Telas — Evento de exhibición</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Acrobacia en Telas" <${config.user}>`,
    to,
    subject,
    html,
    attachments: [
      {
        filename: "qr.png",
        content: qrBuffer,
        contentType: "image/png",
        cid: "qr",
      },
    ],
  });
}
