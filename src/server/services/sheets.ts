import { google } from 'googleapis';

export interface QuestionAttempt {
  question: string;
  studentAnswer: string;
  category?: string;
}

export interface StudentQuizData {
  email: string;
  studentName?: string;
  lowestScore: number;
  topic: string;
  attempts: QuestionAttempt[];
}

// Mock data for testing without Google Sheets
const MOCK_STUDENT_DATA: StudentQuizData = {
  email: 'amaechinaikechukwu6@gmail.com',
  studentName: 'Test Student',
  lowestScore: 45,
  topic: 'General Knowledge',
  attempts: [
    {
      question: "What is the capital of France?",
      studentAnswer: "London", // Fails
    },
    {
      question: "What is 15 × 12?",
      studentAnswer: "180", // Passes
    },
    {
      question: "Which planet is known as the Red Planet?",
      studentAnswer: "Venus", // Fails
    },
    {
       question: "Who painted the Starry Night?",
       studentAnswer: "Van Gogh", // Passes
    }
  ]
};

export async function getStudentQuizData(email: string): Promise<StudentQuizData> {
  // Use mock data if MOCK_MODE is enabled
  if (process.env.MOCK_MODE === 'true') {
    console.log(`[Mock] Fetching quiz data for: ${email}`);
    // Return mock data
    return { ...MOCK_STUDENT_DATA, email };
  }

  try {
    // Load service account credentials
    // Support both file path (local dev) and JSON string (Cloud Run)
    let authOptions: any = {
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    };

    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      // Cloud Run / Local: Parse JSON from environment variable
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      authOptions.credentials = credentials;
    } else {
      throw new Error('No Google credentials configured. Set GOOGLE_SERVICE_ACCOUNT_JSON');
    }

    const auth = new google.auth.GoogleAuth(authOptions);

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // First, get all sheets to find the latest one
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetsList = spreadsheet.data.sheets || [];
    
    // Logic to find the "Latest Form Tab"
    // User report: "Form 2 is the latest" and it was at index 0.
    // New Strategy:
    // 1. Find all tabs named "Form responses X".
    // 2. Sort them by the number X (descending).
    // 3. Pick the highest number.
    
    const formSheets = sheetsList.filter(s => 
        s.properties?.title?.toLowerCase().includes('form responses') || 
        s.properties?.title?.toLowerCase().includes('formularantworten') 
    );

    let latestSheet;
    
    if (formSheets.length > 0) {
        // Sort by number: "Form responses 10" > "Form responses 2" > "Form responses" (1)
        formSheets.sort((a, b) => {
            const getNum = (str: string) => {
                const match = str.match(/(\d+)$/);
                return match ? parseInt(match[1]) : 1;
            };
            const numA = getNum(a.properties?.title || '');
            const numB = getNum(b.properties?.title || '');
            return numB - numA; // Descending
        });
        
        latestSheet = formSheets[0];
    } else {
        // Fallback: If no "Form responses", assume the User put the active sheet FIRST (which is common behavior)
        // or LAST? The previous failing attempt used LAST. Let's try FIRST (index 0) this time since "Form responses 2" was at index 0.
        latestSheet = sheetsList[0];
    }

    console.log('[Sheets] Available tabs:', sheetsList.map(s => s.properties?.title).join(', '));

    const sheetName = latestSheet?.properties?.title || 'Sheet1';
    
    // Determine Topic Name
    // If the tab is just "Form Responses 1" (or similar), we use the Spreadsheet Title (e.g. "Biology Quiz")
    const spreadsheetTitle = spreadsheet.data.properties?.title || 'Quiz';
    let topic = sheetName;

    if (sheetName.toLowerCase().includes('form responses') || sheetName.toLowerCase().includes('formularantworten') || sheetName.startsWith('Sheet')) {
        topic = spreadsheetTitle;
    }

    // Cleanup topic (remove timestamps/generic terms if needed)
    topic = topic.replace(/\s*\(.*?\)\s*/g, '').trim();

    console.log(`[Sheets] Using latest tab: ${sheetName} (topic: ${topic})`);

    // Fetch ALL data from the latest sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}`, // Fetch all rows and columns
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
        throw new Error('Sheet is empty');
    }

    const headers = rows[0].map(h => h.toString().toLowerCase());
    
    // Dynamic Column Detection
    const emailIndex = headers.findIndex(h => h.includes('email') || h === 'e-mail');
    // Look for "Name", "Student Name", "Full Name" etc.
    const nameIndex = headers.findIndex(h => h.includes('name') && !h.includes('username') && !h.includes('email'));
    const scoreIndex = headers.findIndex(h => h === 'score' || h === 'total score' || h.includes('points'));
    const timestampIndex = headers.findIndex(h => h.includes('timestamp') || h.includes('zeitstempel'));

    if (emailIndex === -1) {
        console.warn('[Sheets] Could not find "Email" column. Defaulting to column A (index 0).');
    }

    // Filter by email (case insensitive)
    const targetEmailIndex = emailIndex === -1 ? 0 : emailIndex; // Default to col A if no email header
    
    // Find the student's LATEST submission (searching from end backwards or checking timestamps?)
    // Simple approach: Find the LAST row that matches the email (most recent attempt)
    const studentRow = rows.slice(1).reverse().find(row => 
      row[targetEmailIndex]?.toString().toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!studentRow) {
      console.log(`[Sheets] No data found for email: ${email}`);
      return {
        email,
        lowestScore: 0,
        topic,
        attempts: [],
      };
    }

    // Extract basic info
    let studentName = nameIndex !== -1 ? studentRow[nameIndex] : (studentRow[1] || 'Student');
    
    // Sanity Check: If "Name" is a number (like a year "1989" or ID), fallback to "Student" or part of Email
    if (studentName && /^\d+$/.test(studentName.trim())) {
        console.log(`[Sheets] Detected numeric name "${studentName}", falling back to email username.`);
        studentName = email.split('@')[0];
    }
    
    // Parse Score
    let lowestScore = 0;
    if (scoreIndex !== -1) {
        const scoreRaw = studentRow[scoreIndex];
        // Handle "80 / 100" format
        const match = scoreRaw?.toString().match(/(\d+)/);
        if (match) {
            lowestScore = parseInt(match[0]);
        }
    }

    // Question Parsing Strategy
    // Everything that is NOT metadata (Timestamp, Score, Email, Name) is considered a Question.
    const knownIndices = [timestampIndex, emailIndex, nameIndex, scoreIndex].filter(i => i !== -1);
    
    const attempts: QuestionAttempt[] = [];

    for (let i = 0; i < headers.length; i++) {
        if (knownIndices.includes(i)) continue; // Skip metadata columns

        const qText = rows[0][i]; // Original header casing
        const answer = studentRow[i] || ''; // Student answer

        if (!qText) continue;

        attempts.push({
            question: qText,
            studentAnswer: answer,
        });
    }

    console.log(`[Sheets] Extracted ${attempts.length} Q/A attempts for ${email}`);

    return {
      email,
      studentName,
      lowestScore,
      topic,
      attempts,
    };

  } catch (error) {
    console.error('[Sheets] Error fetching from Google Sheets:', error);
    throw new Error('Failed to fetch quiz results from Google Sheets');
  }
}
