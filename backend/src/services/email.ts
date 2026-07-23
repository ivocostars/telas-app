import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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
  eventDate: string | null = null,
  eventAddress: string | null = null
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

  const finalAddress = eventAddress || 'Palmar 7035 - Club Liniers';
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalAddress)}`;

  let mapAttachment = null;
  const mapPath = path.join(process.cwd(), "assets", "map.jpg");
  if (fs.existsSync(mapPath)) {
    mapAttachment = {
      filename: "map.jpg",
      path: mapPath,
      cid: "map"
    };
  }

  const mapHtml = mapAttachment
    ? `
      <div style="margin: 24px 0; text-align: center;">
        <p><strong>Ubicación en el mapa:</strong></p>
        <a href="${googleMapsUrl}" target="_blank">
          <img src="cid:map" alt="Ubicación en el mapa" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 8px; border: 1px solid #ddd;" />
        </a>
        <p style="font-size: 12px; margin-top: 8px;"><a href="${googleMapsUrl}" target="_blank" style="color: #6C3CB5;">Abrir en Google Maps</a></p>
      </div>
      `
    : "";

  let formattedDate = "sábado, 8 de agosto de 2026, 08:30 p. m."; // Default fallback
  if (eventDate) {
    try {
      formattedDate = new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(new Date(eventDate));
    } catch(e) {}
  }

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Acrobacia en Telas//ES
BEGIN:VEVENT
DTSTART:20260808T233000Z
DTEND:20260809T023000Z
SUMMARY:Acrobacia en Telas
LOCATION:${finalAddress}
DESCRIPTION:Evento de exhibición de acrobacia en telas
END:VEVENT
END:VCALENDAR`;

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
    .event-info { background: #fef9e7; padding: 12px 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #D4A847; }
    .event-info p { margin: 4px 0; }
    .qr-wrapper { text-align: center; margin: 24px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>¡Hola ${spectatorName}!</h1>
    <p>Gracias por tu compra. Presentá este código QR en la entrada del evento <strong>Acrobacia en Telas</strong> para acceder.</p>
    
    <div class="event-info">
      <h2 style="color: #1a1a2e; font-size: 18px; margin: 16px 0 8px;">📅 Datos del evento</h2>
      <p><strong>Fecha:</strong> ${formattedDate}</p>
      <p><strong>Dirección:</strong> ${finalAddress}</p>
    </div>

    <div class="detail">
      ${alumnaHtml}
      ${sillaHtml}
    </div>
    <div class="qr-wrapper">
      <img src="cid:qr" alt="QR de ingreso" style="width: 300px; height: 300px;" />
    </div>
    ${mapHtml}
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
      {
        filename: "evento.ics",
        content: Buffer.from(icsContent, "utf-8"),
        contentType: "text/calendar"
      },
      ...(mapAttachment ? [mapAttachment] : [])
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

export async function sendSetupCodeEmail(email: string, code: string, downloadToken?: string): Promise<boolean> {
  const apiUrl = process.env.API_URL || "https://telas.costarojas.com";
  const apkLink = downloadToken
    ? `${apiUrl}/api/apk/descargar?token=${encodeURIComponent(downloadToken)}`
    : undefined;

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
    .btn { display: inline-block; background: #6C3CB5; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 16px 0; }
    .btn:hover { background: #5a2d9e; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Acceso al Sistema - Acrobacia en Telas</h1>
    <p>Te dieron acceso al sistema de control de entradas.</p>
    <p>Usá este código para configurar tu contraseña por primera vez:</p>
    <div class="code">${code}</div>
    <p>Este código expira en <strong>7 días</strong>.</p>
    <p>Ingresá al panel en <a href="https://telas.costarojas.com">telas.costarojas.com</a>, andá a <strong>¿Olvidaste tu contraseña?</strong> e ingresá el código junto con tu nueva contraseña.</p>

    ${apkLink ? `
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
    <h2>📱 Descargá la app para escanear QR</h2>
    <p>Si vas a usar el rol de <strong>scanner</strong>, descargá la app mobile:</p>
    <p style="text-align: center;">
      <a href="${apkLink}" class="btn">📲 Descargar App Android</a>
    </p>
    <p style="font-size: 13px; color: #888;">El link expira en 7 días.</p>
    ` : ""}

    <div class="footer">
      <p>Acrobacia en Telas — Sistema de Control de Entradas</p>
    </div>
  </div>
</body>
</html>`;
  return trySendEmail(email, "Código de acceso - Acrobacia en Telas", html);
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
