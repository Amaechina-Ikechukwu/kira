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

/**
 * Send magic link email for authentication
 */
export async function sendMagicLinkEmail(email: string, magicLink: string): Promise<boolean> {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Kira</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #f9fafb; padding: 40px 0; }
    .container { max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { background: #ffffff; padding: 24px 32px; border-bottom: 1px solid #f3f4f6; text-align: center; }
    .logo { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin: 0; }
    .content { padding: 40px 32px; text-align: center; }
    .text { font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 32px; }
    .btn { display: inline-block; background-color: #7c3aed; color: #ffffff; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .link { color: #6b7280; font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo">Kira</h1>
      </div>
      <div class="content">
        <p class="text">Click the button below to sign in to your account. This link expires in 15 minutes.</p>
        <a href="${magicLink}" class="btn">Sign in to Kira</a>
        <p class="link" style="margin-top: 24px;">Or copy this link: ${magicLink}</p>
      </div>
      <div class="footer">
        <p>If you didn't request this email, you can safely ignore it.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"Kira" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Sign in to Kira',
      text: `Sign in to Kira:\n\n${magicLink}\n\nThis link expires in 15 minutes.`,
      html: htmlContent,
    });

    console.log(`[Email] Sent magic link to ${email}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send magic link:', error);
    return false;
  }
}

interface MeetingInviteOptions {
  to: string;
  recipientName?: string;
  meetingTitle: string;
  hostName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  meetLink?: string | null;
  description?: string | null;
}

export async function sendMeetingInviteEmail(options: MeetingInviteOptions): Promise<boolean> {
  const { to, recipientName, meetingTitle, hostName, scheduledStart, scheduledEnd, meetLink, description } = options;
  
  const dateStr = scheduledStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = `${scheduledStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${scheduledEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #ffffff; padding: 32px; border-bottom: 1px solid #f3f4f6; }
    .logo { font-size: 24px; font-weight: 800; color: #111827; }
    .content { padding: 32px; }
    .h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #111827; }
    .detail-row { display: flex; margin-bottom: 12px; }
    .label { width: 100px; color: #6b7280; font-weight: 500; font-size: 14px; }
    .value { color: #111827; font-weight: 600; font-size: 14px; }
    .btn { display: inline-block; background: #111827; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
    .description { background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 24px; color: #4b5563; font-size: 14px; line-height: 1.5; }
    .footer { padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Kira</div>
    </div>
    <div class="content">
      <div class="h1">Meeting Invitation</div>
      <p style="color: #4b5563; margin-bottom: 24px;">Hi ${recipientName || 'there'},<br>You have been invited to a meeting by <strong>${hostName}</strong>.</p>
      
      <div class="detail-row"><span class="label">Topic</span><span class="value">${meetingTitle}</span></div>
      <div class="detail-row"><span class="label">Date</span><span class="value">${dateStr}</span></div>
      <div class="detail-row"><span class="label">Time</span><span class="value">${timeStr}</span></div>
      
      ${description ? `<div class="description">${description}</div>` : ''}
      
      ${meetLink ? `<a href="${meetLink}" class="btn">Join Meeting</a>` : ''}
      
      ${!meetLink ? `<div style="margin-top:24px; padding:12px; background:#f3f4f6; border-radius:8px; text-align:center; font-size:14px; color:#6b7280;">No video link provided. Check with host for details.</div>` : ''}
    </div>
    <div class="footer">
      Powered by Kira
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"Kira" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Invitation: ${meetingTitle}`,
      html: htmlContent,
    });
    console.log(`[Email] Sent meeting invite to ${to}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send meeting invite:', error);
    return false;
  }
}

interface MeetingSummaryOptions {
  to: string;
  recipientName?: string;
  meetingTitle: string;
  durationMinutes: number;
  participantsCount: number;
  nextSteps?: string;
}

export async function sendMeetingSummaryEmail(options: MeetingSummaryOptions): Promise<boolean> {
  const { to, recipientName, meetingTitle, durationMinutes, participantsCount } = options;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #ffffff; padding: 32px; border-bottom: 1px solid #f3f4f6; }
    .logo { font-size: 24px; font-weight: 800; color: #111827; }
    .content { padding: 32px; }
    .h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #111827; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .stat-card { background: #f9fafb; padding: 16px; border-radius: 12px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 800; color: #7c3aed; }
    .stat-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .footer { padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Kira</div>
    </div>
    <div class="content">
      <div class="h1">Meeting Summary</div>
      <p style="color: #4b5563;font-size:16px;">${meetingTitle} has ended.</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${durationMinutes}m</div>
          <div class="stat-label">Duration</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${participantsCount}</div>
          <div class="stat-label">Participants</div>
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">Thanks for attending!</p>
    </div>
    <div class="footer">
      Powered by Kira
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"Kira" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Summary: ${meetingTitle}`,
      html: htmlContent,
    });
    console.log(`[Email] Sent meeting summary to ${to}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send meeting summary:', error);
    return false;
  }
}

interface ReviewSessionOptions {
  to: string;
  recipientName?: string;
  quizTitle: string;
  weakAreas: string[];
  reviewUrl: string;
}

export async function sendReviewSessionAssignedEmail(options: ReviewSessionOptions): Promise<boolean> {
  const { to, recipientName, quizTitle, weakAreas, reviewUrl } = options;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background-color: #fff1f2; color: #111827; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fecdd3; box-shadow: 0 4px 6px -1px rgba(244, 63, 94, 0.1); }
    .header { background: #fff1f2; padding: 32px; border-bottom: 1px solid #fecdd3; } /* Rose-50 background */
    .logo { font-size: 24px; font-weight: 800; color: #be123c; } /* Rose-700 */
    .content { padding: 32px; }
    .h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #9f1239; }
    .text { color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
    .tag-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
    .tag { background: #ffe4e6; color: #be123c; padding: 6px 12px; border-radius: 100px; font-size: 13px; font-weight: 600; }
    .btn { display: inline-block; background: #be123c; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; transition: background 0.2s; box-shadow: 0 4px 12px rgba(190, 18, 60, 0.2); }
    .btn:hover { background: #9f1239; }
    .footer { padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; background: #fafafa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Kira</div>
    </div>
    <div class="content">
      <div class="h1">Let's turn that around.</div>
      <p class="text">Hi ${recipientName || 'Scholar'},<br>We noticed you struggled a bit with <strong>${quizTitle}</strong>. That's part of learning.</p>
      
      <p class="text" style="font-weight: 600; margin-bottom: 12px;">We've created a custom review session focusing on:</p>
      <div class="tag-container">
        ${weakAreas.map(area => `<span class="tag">${area}</span>`).join('')}
      </div>
      
      <div style="text-align: center;">
        <a href="${reviewUrl}" class="btn">Start Review Session</a>
      </div>
    </div>
    <div class="footer">
      You got this. Powered by Kira.
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"Kira 🛡️" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Action Plan: Review for ${quizTitle}`,
      html: htmlContent,
    });
    console.log(`[Email] Sent review session assignment to ${to}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send review session assignment:', error);
    return false;
  }
}

