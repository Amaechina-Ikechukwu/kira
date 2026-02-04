import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStudentQuizData } from './sheets';
// Note: importing 'googleapis' gives us the original module if not mocked, but vi.mock hoists and replaces it
import { google } from 'googleapis';

// The mockery happens here
vi.mock('googleapis', () => {
    // Need a mock for GoogleAuth and sheets()
    const GoogleAuthMock = vi.fn();
    const sheetsMock = vi.fn(() => ({
        spreadsheets: {
            get: vi.fn().mockResolvedValue({ data: { sheets: [] } }),
            values: {
                get: vi.fn().mockResolvedValue({ data: { values: [] } }),
            },
        },
    }));

    return {
        // Mock the named export 'google'
        google: {
            auth: {
                GoogleAuth: GoogleAuthMock,
            },
            sheets: sheetsMock,
        },
    };
});

describe('sheets service configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        process.env.MOCK_MODE = 'false';
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should use credentials from GOOGLE_SERVICE_ACCOUNT_JSON', async () => {
        const mockCredentials = {
            client_email: 'test@example.com',
            private_key: 'fake-key',
            project_id: 'test-project'
        };

        process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(mockCredentials);
        process.env.GOOGLE_SHEETS_ID = 'test-sheet-id';

        try {
            await getStudentQuizData('student@example.com');
        } catch (error) {
            // expected to throw 'Sheet is empty' or similar due to empty mock data
        }

        expect(google.auth.GoogleAuth).toHaveBeenCalledTimes(1);
        expect(google.auth.GoogleAuth).toHaveBeenCalledWith(expect.objectContaining({
            credentials: expect.objectContaining({
                client_email: 'test@example.com'
            }),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        }));
        console.log('VERIFICATION_SUCCESS');
    });
});
