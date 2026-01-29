import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { parse, serialize } from 'cookie';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { sendMagicLinkEmail } from '../services/email';

const router = Router();

// In-memory session store (replace with Redis in production)
const sessions = new Map<string, { userId: string; email: string; expiresAt: Date }>();

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Send magic link to email
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[Auth] Login attempt for:', normalizedEmail);

    // Create or update user
    let user;
    try {
      user = await db.query.users.findFirst({
        where: eq(schema.users.email, normalizedEmail),
      });
      console.log('[Auth] User lookup complete, exists:', !!user);
    } catch (dbError) {
      console.error('[Auth] Database error during user lookup:', dbError);
      return res.status(500).json({ error: 'Database connection failed. Please check Cloud SQL setup.' });
    }

    const token = randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

    try {
      if (!user) {
        // Create new user
        const [newUser] = await db.insert(schema.users).values({
          email: normalizedEmail,
          magicLinkToken: token,
          tokenExpiry,
        }).returning();
        user = newUser;
        console.log('[Auth] Created new user:', user.id);
      } else {
        // Update existing user with new token
        await db.update(schema.users)
          .set({ magicLinkToken: token, tokenExpiry })
          .where(eq(schema.users.id, user.id));
        console.log('[Auth] Updated token for user:', user.id);
      }
    } catch (dbError) {
      console.error('[Auth] Database error during user create/update:', dbError);
      return res.status(500).json({ error: 'Database write failed. Have you run db:push?' });
    }

    // Send magic link email
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const magicLink = `${baseUrl}/api/auth/verify/${token}`;

    try {
      await sendMagicLinkEmail(normalizedEmail, magicLink);
      console.log('[Auth] Magic link sent to:', normalizedEmail);
    } catch (emailError) {
      console.error('[Auth] Email sending error:', emailError);
      return res.status(500).json({ error: 'Failed to send email. Check EMAIL_USER and EMAIL_PASS in .env' });
    }

    res.json({ 
      message: 'Magic link sent! Check your email.',
      email: normalizedEmail,
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

/**
 * Verify magic link and create session
 */
router.get('/verify/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.magicLinkToken, token),
    });

    if (!user || !user.tokenExpiry || user.tokenExpiry < new Date()) {
      return res.redirect('/login?error=invalid');
    }

    // Clear the token
    await db.update(schema.users)
      .set({ magicLinkToken: null, tokenExpiry: null })
      .where(eq(schema.users.id, user.id));

    // Create session
    const sessionId = randomBytes(32).toString('hex');
    sessions.set(sessionId, {
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });

    // Set session cookie
    res.setHeader('Set-Cookie', serialize('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    }));

    // Redirect to dashboard
    res.redirect('/dashboard');

  } catch (error) {
    console.error('[Auth] Verify error:', error);
    res.redirect('/login?error=server');
  }
});

/**
 * Get current user
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const cookies = parse(req.headers.cookie || '');
    const sessionId = cookies.session;

    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = sessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) {
      sessions.delete(sessionId);
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });

  } catch (error) {
    console.error('[Auth] Me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Logout
 */
router.post('/logout', (req: Request, res: Response) => {
  const cookies = parse(req.headers.cookie || '');
  const sessionId = cookies.session;

  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.setHeader('Set-Cookie', serialize('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  }));

  res.json({ message: 'Logged out' });
});

/**
 * Auth middleware - adds user to request if authenticated
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const cookies = parse(req.headers.cookie || '');
  const sessionId = cookies.session;

  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session && session.expiresAt > new Date()) {
      (req as any).userId = session.userId;
      (req as any).userEmail = session.email;
    }
  }

  next();
}

/**
 * Require auth middleware - returns 401 if not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export default router;
