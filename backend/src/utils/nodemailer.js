import nodemailer from 'nodemailer';

const hasCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = hasCredentials
    ? nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
          },
      })
    : {
          sendMail: async () => {
              console.warn('[nodemailer] EMAIL_USER/EMAIL_PASS not set — email skipped');
              return null;
          },
      };

export { transporter };
