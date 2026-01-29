import nodemailer from 'nodemailer';

// Create transporter with SMTP settings from .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface LessonEmailOptions {
  to: string;
  studentName: string;
  sessionId: string;
  topic: string;
  lowestScore?: number;
  isChallenge?: boolean;
}

export async function sendLessonInviteEmail(options: LessonEmailOptions): Promise<boolean> {
  const { to, studentName, sessionId, topic, lowestScore, isChallenge } = options;
  
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const lessonUrl = `${baseUrl}/lesson/${sessionId}`;

  const subject = isChallenge 
    ? `⚔️ ${studentName}, a SECRET CHALLENGE awaits you!`
    : `🎓 ${studentName}, your ${topic} lesson is ready!`;

  /* Premium Email Template */
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f9fafb; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
    /* Minimalist Header: White with Dark Text */
    .header { background: #ffffff; padding: 24px 32px; border-bottom: 1px solid #f3f4f6; text-align: left; }
    .logo { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin: 0; }
    
    .content { padding: 40px 32px; }
    .greeting { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 20px; }
    .text { font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px; }
    
    /* Highlight: Neutral Blue/Slate */
    .highlight { color: #2563eb; font-weight: 600; background: #eff6ff; padding: 2px 6px; border-radius: 4px; }
    
    /* Card: Subtle Border, No Colors */
    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 32px 0; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; margin-bottom: 8px; }
    .card-value { font-size: 36px; font-weight: 800; color: #111827; letter-spacing: -1px; }
    
    .btn-container { text-align: left; margin-top: 32px; }
    /* Button: Dark Slate/Black for high contrast & professionalism */
    .btn { display: inline-block; background-color: #111827; color: #ffffff; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; transition: background-color 0.2s; }
    .btn:hover { background-color: #000000; }
    
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .link { color: #6b7280; text-decoration: underline; word-break: break-all; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo">Kira</h1>
      </div>
      
      <div class="content">
        <h2 class="greeting">Hello, ${studentName}!</h2>
        
        ${isChallenge ? `
        <p class="text">
          We saw your results on <span class="highlight">${topic}</span> and... <strong>Wow.</strong>
        </p>
        <p class="text">
          You scored a perfect 100%. Most students stop there. 
          <br>But we think you're ready for something deeper.
        </p>
        <div class="card">
          <div class="card-title">Status Unlocked</div>
          <div class="card-value">Mastery Challenge</div>
        </div>
        <p class="text">
          This is a secret "Boss Level" designed to test true experts. Are you up for it?
        </p>
        ` : `
        <p class="text">
          We noticed you're working on <span class="highlight">${topic}</span>. 
          Learning is a journey, and every expert was once a beginner who didn't give up.
        </p>
        
        ${lowestScore !== undefined ? `
        <div class="card">
          <div class="card-title">Score to Beat</div>
          <div class="card-value">${lowestScore}%</div>
        </div>
        ` : ''}

        <p class="text">
          We've generated a <strong>personalized game plan</strong> to help you conquer these concepts. No boring lectures—just interactive mastery.
        </p>
        `}

        <div class="btn-container">
          <a href="${lessonUrl}" class="btn">
            ${isChallenge ? 'Accept the Challenge' : 'Start Your Lesson'} &rarr;
          </a>
        </div>
        
        <p class="text" style="font-size: 12px; margin-top: 32px; color: #9ca3af;">
            If the button above doesn't work, copy this link:<br>
            <a href="${lessonUrl}" class="link">${lessonUrl}</a>
        </p>
      </div>
      
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Kira Learning. Keep growing.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Hello ${studentName}!

${isChallenge 
  ? `You scored 100% on ${topic}! Amazing work. We've unlocked a SECRET CHALLENGE level for you.` 
  : `We noticed you could use some extra practice on ${topic}.`}

${!isChallenge && lowestScore !== undefined ? `Your score to beat: ${lowestScore}%` : ''}

${isChallenge ? 'Accept your challenge here:' : 'Start your lesson here:'}

${lessonUrl}

Powered by Kira
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Kira 🎓" <${process.env.EMAIL_USER}>`,
      to,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email] Sent lesson invite to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

// Verify email connection on startup
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified ✅');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error);
    return false;
  }
}
