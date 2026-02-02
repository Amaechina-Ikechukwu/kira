import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { parse, serialize } from 'cookie';
import { eq, lt } from 'drizzle-orm';
import { db, schema } from '../db';
import { sendMagicLinkEmail } from '../services/email';
import { 
  getAuthUrl, 
  exchangeCode, 
  isOAuthConfigured,
  CALENDAR_SCOPES 
} from '../services/google-oauth';

const router = Router();

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// Helper Functions for Database-Backed Sessions
// ============================================================================

/**
 * Create a new session in the database
 */
async function createSession(userId: string, email: string, req: Request): Promise<string> {
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  await db.insert(schema.authSessions).values({
    id: sessionId,
    userId,
    email,
    expiresAt,
    userAgent: req.headers['user-agent'] || null,
    ipAddress: req.ip || req.socket.remoteAddress || null,
  });
  
  return sessionId;
}

/**
 * Get session from database
 */
async function getSession(sessionId: string) {
  const session = await db.query.authSessions.findFirst({
    where: eq(schema.authSessions.id, sessionId),
  });
  
  if (!session) return null;
  
  // Check if expired
  if (session.expiresAt < new Date()) {
    await db.delete(schema.authSessions).where(eq(schema.authSessions.id, sessionId));
    return null;
  }
  
  return session;
}

/**
 * Delete a session from database
 */
async function deleteSession(sessionId: string) {
  await db.delete(schema.authSessions).where(eq(schema.authSessions.id, sessionId));
}

/**
 * Clean up expired sessions (call periodically)
 */
export async function cleanupExpiredSessions() {
  const result = await db.delete(schema.authSessions)
    .where(lt(schema.authSessions.expiresAt, new Date()));
  console.log('[Auth] Cleaned up expired sessions');
  return result;
}

/**
 * Set session cookie
 */
function setSessionCookie(res: Response, sessionId: string) {
  res.setHeader('Set-Cookie', serialize('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  }));
}

/**
 * Clear session cookie
 */
function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', serialize('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  }));
}

// ============================================================================
// Google OAuth Routes
// ============================================================================

/**
 * Redirect to Google OAuth
 */
router.get('/google', (req: Request, res: Response) => {
  if (!isOAuthConfigured()) {
    return res.status(500).json({ 
      error: 'Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI in .env' 
    });
  }
  
  // Include calendar scopes if requested
  const includeCalendar = req.query.calendar === 'true';
  const scopes = includeCalendar ? CALENDAR_SCOPES : [];
  
  // State for CSRF protection (optional)
  const state = randomBytes(16).toString('hex');
  
  const authUrl = getAuthUrl(scopes, state);
  res.redirect(authUrl);
});

/**
 * Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      console.error('[Auth] Google OAuth error:', error);
      return res.redirect('/login?error=oauth_denied');
    }
    
    if (!code || typeof code !== 'string') {
      return res.redirect('/login?error=no_code');
    }
    
    // Exchange code for tokens
    const { tokens, userInfo } = await exchangeCode(code);
    console.log('[Auth] Google OAuth successful for:', userInfo.email);
    
    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, userInfo.email),
    });
    
    if (!user) {
      // Create new user
      const [newUser] = await db.insert(schema.users).values({
        email: userInfo.email,
        name: userInfo.name,
        avatarUrl: userInfo.picture,
        googleId: userInfo.id,
      }).returning();
      user = newUser;
      console.log('[Auth] Created new user via Google:', user.id);
    } else {
      // Update existing user with Google info
      await db.update(schema.users)
        .set({ 
          googleId: userInfo.id,
          name: user.name || userInfo.name,
          avatarUrl: user.avatarUrl || userInfo.picture,
          lastActiveAt: new Date(),
        })
        .where(eq(schema.users.id, user.id));
      console.log('[Auth] Updated user with Google info:', user.id);
    }
    
    // Store OAuth tokens if we have a refresh token
    if (tokens.refresh_token) {
      // Check if tokens exist for this user
      const existingTokens = await db.query.oauthTokens.findFirst({
        where: eq(schema.oauthTokens.userId, user.id),
      });
      
      if (existingTokens) {
        await db.update(schema.oauthTokens)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            scope: tokens.scope,
            updatedAt: new Date(),
          })
          .where(eq(schema.oauthTokens.userId, user.id));
      } else {
        await db.insert(schema.oauthTokens).values({
          userId: user.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          scope: tokens.scope,
        });
      }
    }
    
    // Create session
    const sessionId = await createSession(user.id, user.email, req);
    setSessionCookie(res, sessionId);
    
    // Redirect to dashboard
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('[Auth] Google callback error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});

// ============================================================================
// Magic Link Routes (Fallback)
// ============================================================================

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
    console.log('[Auth] Magic link login attempt for:', normalizedEmail);

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
      .set({ magicLinkToken: null, tokenExpiry: null, lastActiveAt: new Date() })
      .where(eq(schema.users.id, user.id));

    // Create session in database
    const sessionId = await createSession(user.id, user.email, req);
    setSessionCookie(res, sessionId);

    // Redirect to dashboard
    res.redirect('/dashboard');

  } catch (error) {
    console.error('[Auth] Verify error:', error);
    res.redirect('/login?error=server');
  }
});

// ============================================================================
// Session Management Routes
// ============================================================================

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

    const session = await getSession(sessionId);
    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get user's primary school if any
    const membership = await db.query.schoolMembers.findFirst({
      where: eq(schema.schoolMembers.userId, user.id),
      orderBy: (members, { desc }) => [desc(members.createdAt)],
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      platformRole: user.platformRole,
      schoolId: membership?.schoolId || null,
      role: membership?.role || null, // School role
    });

  } catch (error) {
    console.error('[Auth] Me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  const cookies = parse(req.headers.cookie || '');
  const sessionId = cookies.session;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  clearSessionCookie(res);
  res.json({ message: 'Logged out' });
});

/**
 * Check auth status (for frontend)
 */
router.get('/status', async (req: Request, res: Response) => {
  const cookies = parse(req.headers.cookie || '');
  const sessionId = cookies.session;

  if (!sessionId) {
    return res.json({ authenticated: false, googleOAuthEnabled: isOAuthConfigured() });
  }

  const session = await getSession(sessionId);
  res.json({ 
    authenticated: !!session,
    googleOAuthEnabled: isOAuthConfigured(),
  });
});

// ============================================================================
// Middleware
// ============================================================================

/**
 * Auth middleware - adds user to request if authenticated
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const cookies = parse(req.headers.cookie || '');
  const sessionId = cookies.session;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
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
  // First run authMiddleware to populate user info
  authMiddleware(req, res, () => {
    if (!(req as any).userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  });
}

/**
 * Optional auth middleware - allows request to proceed but populates user info if available
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  authMiddleware(req, res, next);
}

export default router;
