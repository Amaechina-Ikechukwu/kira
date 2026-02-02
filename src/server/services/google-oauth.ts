import { OAuth2Client, TokenPayload } from 'google-auth-library';

/**
 * Google OAuth Service
 * Handles Google Sign-In authentication and token management
 */

// OAuth2 client instance
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  process.env.GOOGLE_OAUTH_REDIRECT_URI
);

// Default scopes for basic authentication
const DEFAULT_SCOPES = [
  'openid',
  'email',
  'profile',
];

// Additional scopes for Google Calendar/Meet integration
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  verified_email: boolean;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

/**
 * Generate Google OAuth authorization URL
 * @param additionalScopes - Extra scopes beyond basic profile (e.g., calendar)
 * @param state - Optional state for CSRF protection
 */
export function getAuthUrl(additionalScopes: string[] = [], state?: string): string {
  const scopes = [...DEFAULT_SCOPES, ...additionalScopes];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state,
  });
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from OAuth callback
 */
export async function exchangeCode(code: string): Promise<{
  tokens: GoogleTokens;
  userInfo: GoogleUserInfo;
}> {
  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token) {
    throw new Error('No access token received from Google');
  }
  
  // Set credentials to make API calls
  oauth2Client.setCredentials(tokens);
  
  // Verify ID token and get user info
  let userInfo: GoogleUserInfo;
  
  if (tokens.id_token) {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });
    
    const payload = ticket.getPayload() as TokenPayload;
    
    userInfo = {
      id: payload.sub,
      email: payload.email!,
      name: payload.name || null,
      picture: payload.picture || null,
      verified_email: payload.email_verified || false,
    };
  } else {
    // Fallback: fetch user info from Google API
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }
    
    const data = await response.json();
    userInfo = {
      id: data.id,
      email: data.email,
      name: data.name || null,
      picture: data.picture || null,
      verified_email: data.verified_email || false,
    };
  }
  
  return {
    tokens: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      token_type: tokens.token_type || 'Bearer',
      expires_in: tokens.expiry_date 
        ? Math.floor((tokens.expiry_date - Date.now()) / 1000) 
        : 3600,
      scope: tokens.scope || DEFAULT_SCOPES.join(' '),
      id_token: tokens.id_token || undefined,
    },
    userInfo,
  };
}

/**
 * Refresh an access token using refresh token
 * @param refreshToken - The refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }
  
  return {
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token || refreshToken,
    token_type: credentials.token_type || 'Bearer',
    expires_in: credentials.expiry_date 
      ? Math.floor((credentials.expiry_date - Date.now()) / 1000) 
      : 3600,
    scope: credentials.scope || DEFAULT_SCOPES.join(' '),
    id_token: credentials.id_token || undefined,
  };
}

/**
 * Revoke a token (access or refresh)
 * @param token - Token to revoke
 */
export async function revokeToken(token: string): Promise<void> {
  await oauth2Client.revokeToken(token);
}

/**
 * Get an OAuth2Client with user credentials set
 * Used for making authenticated API calls on behalf of a user
 */
export function getAuthenticatedClient(accessToken: string, refreshToken?: string): OAuth2Client {
  const client = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
  
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  
  return client;
}

/**
 * Check if OAuth is properly configured
 */
export function isOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}
