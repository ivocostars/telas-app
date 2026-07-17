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
  alumnaInvitada: string | null,
  silla: boolean,
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

  const alumnaHtml = alumnaInvitada
    ? `<p><strong>Va a ver a:</strong> ${alumnaInvitada}</p>`
    : "";

  const sillaHtml = silla
    ? `<p><strong>Silla reservada:</strong> Sí</p>`
    : "";

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
    .detail { background: #f0f0f5; padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
    .detail p { margin: 4px 0; }
    .qr-wrapper { text-align: center; margin: 24px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>¡Hola ${spectatorName}!</h1>
    <p>Gracias por tu compra. Presentá este código QR en la entrada del evento <strong>Acrobacia en Telas</strong> para acceder.</p>
    <div class="detail">
      ${alumnaHtml}
      ${sillaHtml}
    </div>
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

export async function sendWelcomeEmail(email: string, password: string) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    h1 { color: #6C3CB5; font-size: 22px; }
    .credentials { background: #f0f0f5; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .credentials p { margin: 6px 0; color: #333; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Acceso al Sistema - Acrobacia en Telas</h1>
    <p>Tus credenciales de acceso:</p>
    <div class="credentials">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Contraseña temporal:</strong> ${password}</p>
    </div>
    <p>Ingresá al panel de control en <a href="https://telas.costarojas.com">telas.costarojas.com</a></p>
    <p>Te recomendamos cambiar tu contraseña después del primer ingreso.</p>
    <div class="footer">
      <p>Acrobacia en Telas — Sistema de Control de Entradas</p>
    </div>
  </div>
</body>
</html>`;
  await trySendEmail(email, "Tus credenciales de acceso", html);
}

export async function sendRecoveryCodeEmail(email: string, code: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    h1 { color: #6C3CB5; font-size: 22px; }
    .code { background: #6C3CB5; color: #fff; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center; font-size: 28px; letter-spacing: 4px; font-weight: bold; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔑 Recuperación de Contraseña</h1>
    <p>Recibimos una solicitud para restablecer tu contraseña. Usá el siguiente código:</p>
    <div class="code">${code}</div>
    <p>Este código expira en <strong>15 minutos</strong>.</p>
    <p>Si no solicitaste este cambio, ignorá este mensaje.</p>
    <div class="footer">
      <p>Acrobacia en Telas — Sistema de Control de Entradas</p>
    </div>
  </div>
</body>
</html>`;
  return trySendEmail(email, "Código de recuperación de contraseña", html);
}

async function trySendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const config = getSmtpConfig();
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.sendMail({
      from: `"Acrobacia en Telas" <${config.user}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${to}. SMTP not configured?`);
    console.log(`--- EMAIL TO ${to} ---`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    console.log(`--- END EMAIL ---`);
    return false;
  }
}
