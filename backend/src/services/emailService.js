import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'info.aseocorp@gmail.com',
    pass: 'ycdz tddg fqhl hlmb',
  },
});

export const enviarOTP = async (destinatario, codigo) => {
  await transporter.sendMail({
    from: '"AseoCorp" <info.aseocorp@gmail.com>',
    to: destinatario,
    subject: 'Código de verificación - AseoCorp',
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2 style="color: #1a3cc8;">AseoCorp</h2>
        <p>Tu código de verificación es:</p>
        <h1 style="letter-spacing: 8px; color: #1a3cc8;">${codigo}</h1>
        <p>Expira en <strong>10 minutos</strong>.</p>
      </div>
    `,
  });
};