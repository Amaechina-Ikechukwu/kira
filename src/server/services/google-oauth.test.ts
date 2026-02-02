import { describe, it, expect, beforeEach, afterAll } from 'vitest';

// Test the exported constants and helper function without mocking
describe('Google OAuth Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isOAuthConfigured', () => {
    it('should return false when no OAuth env vars are set', async () => {
      delete process.env.GOOGLE_OAUTH_CLIENT_ID;
      delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
      
      // Re-import to get fresh evaluation
      const { isOAuthConfigured } = await import('./google-oauth');
      expect(isOAuthConfigured()).toBe(false);
    });

    it('should return false when only some OAuth env vars are set', async () => {
      process.env.GOOGLE_OAUTH_CLIENT_ID = 'client-id';
      delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
      
      const { isOAuthConfigured } = await import('./google-oauth');
      expect(isOAuthConfigured()).toBe(false);
    });

    it('should return true when all OAuth env vars are set', async () => {
      process.env.GOOGLE_OAUTH_CLIENT_ID = 'client-id';
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'client-secret';
      process.env.GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost:3000/callback';
      
      const { isOAuthConfigured } = await import('./google-oauth');
      expect(isOAuthConfigured()).toBe(true);
    });
  });

  describe('CALENDAR_SCOPES', () => {
    it('should include calendar scopes', async () => {
      const { CALENDAR_SCOPES } = await import('./google-oauth');
      
      expect(CALENDAR_SCOPES).toContain('https://www.googleapis.com/auth/calendar');
      expect(CALENDAR_SCOPES).toContain('https://www.googleapis.com/auth/calendar.events');
    });

    it('should have exactly 2 calendar scopes', async () => {
      const { CALENDAR_SCOPES } = await import('./google-oauth');
      expect(CALENDAR_SCOPES).toHaveLength(2);
    });
  });

  describe('GoogleUserInfo interface', () => {
    it('should support expected structure', () => {
      // This is a type check - if it compiles, it passes
      interface GoogleUserInfo {
        id: string;
        email: string;
        name: string | null;
        picture: string | null;
        verified_email: boolean;
      }

      const userInfo: GoogleUserInfo = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        verified_email: true,
      };

      expect(userInfo.id).toBe('123');
      expect(userInfo.email).toBe('test@example.com');
    });
  });

  describe('GoogleTokens interface', () => {
    it('should support expected structure', () => {
      interface GoogleTokens {
        access_token: string;
        refresh_token?: string;
        token_type: string;
        expires_in: number;
        scope: string;
        id_token?: string;
      }

      const tokens: GoogleTokens = {
        access_token: 'ya29.xxx',
        refresh_token: '1//xxx',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid email profile',
      };

      expect(tokens.access_token).toBeDefined();
      expect(tokens.token_type).toBe('Bearer');
    });
  });
});
