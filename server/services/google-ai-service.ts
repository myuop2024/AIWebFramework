import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI with API key
const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

// Access the Gemini Pro model
const model = genAI.getGenerativeModel({
  model: "gemini-pro",
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// This interface should match what's in the database/schema
interface UserData {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  password?: string;
  phoneNumber?: string | null;
  role?: string;
}

/**
 * Processes and enhances a batch of user data using Google's Gemini AI
 * This function takes raw user data from a CSV import and improves it with AI assistance
 */
export async function processUserDataWithAI(userData: Partial<UserData>[]): Promise<Partial<UserData>[]> {
  try {
    // Create context for the AI to understand what it's working with
    const prompt = `
You are an AI assistant helping to process user data for import into an election observer management system.
Please help improve the data by doing the following:

1. Make sure firstName and lastName are properly capitalized
2. Validate email addresses (should have @ and domain)
3. Format phoneNumber consistently (prefer +1234567890 format if available)
4. Suggest appropriate roles if missing (options are: observer, supervisor, admin)
5. If username is missing, create one based on firstName and lastName

Original data:
${JSON.stringify(userData, null, 2)}

Please provide the enhanced data in valid JSON format. Return ONLY the JSON array with no other text.
`;

    // Generate content with the Gemini model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract the JSON from the response
    const jsonStartIndex = text.indexOf('[');
    const jsonEndIndex = text.lastIndexOf(']') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      console.error('Could not find valid JSON in the AI response');
      return userData; // Return original data if AI processing fails
    }
    
    const jsonStr = text.substring(jsonStartIndex, jsonEndIndex);
    const enhancedData = JSON.parse(jsonStr) as Partial<UserData>[];
    
    return enhancedData;
  } catch (error) {
    console.error('Error using Google AI to process user data:', error);
    return userData; // Return original data if AI processing fails
  }
}

/**
 * Check for potential duplicates in the user data by comparing with existing users
 */
export async function detectDuplicateUsers(
  newUsers: Partial<UserData>[], 
  existingUsers: Partial<UserData>[]
): Promise<{user: Partial<UserData>, potentialDuplicates: Partial<UserData>[]}[]> {
  try {
    // Create context for the AI to understand what it's working with
    const prompt = `
You are an AI assistant helping to detect potential duplicate users during an import into an election observer management system.
Compare each new user with existing users and identify potential duplicates.

New users to import:
${JSON.stringify(newUsers, null, 2)}

Existing users in system:
${JSON.stringify(existingUsers, null, 2)}

For each new user, identify if there are any potential duplicates among existing users.
Consider these factors:
1. Similar names (accounting for nicknames, typos, or different spellings)
2. Same email address
3. Same phone number
4. Very similar usernames

Return ONLY a JSON array where each item contains:
- "user": The new user being checked
- "potentialDuplicates": Array of existing users that might be duplicates

Return an empty array for potentialDuplicates if no duplicates are found for a user.
`;

    // Generate content with the Gemini model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract the JSON from the response
    const jsonStartIndex = text.indexOf('[');
    const jsonEndIndex = text.lastIndexOf(']') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      console.error('Could not find valid JSON in the AI response for duplicate detection');
      // Return empty array of duplicates if AI processing fails
      return newUsers.map(user => ({ user, potentialDuplicates: [] }));
    }
    
    const jsonStr = text.substring(jsonStartIndex, jsonEndIndex);
    const duplicateResults = JSON.parse(jsonStr) as {user: Partial<UserData>, potentialDuplicates: Partial<UserData>[]}[];
    
    return duplicateResults;
  } catch (error) {
    console.error('Error using Google AI to detect duplicate users:', error);
    // Return empty array of duplicates if AI processing fails
    return newUsers.map(user => ({ user, potentialDuplicates: [] }));
  }
}

/**
 * Generate informative error messages for failed imports
 */
export async function generateImportErrorExplanation(
  userData: Partial<UserData>, 
  errorMessage: string
): Promise<string> {
  try {
    const prompt = `
You are an AI assistant helping with a user import process for an election observer management system.
An error occurred when trying to import this user:

User data:
${JSON.stringify(userData, null, 2)}

Error message:
${errorMessage}

Please explain this error in simple, clear terms and suggest how to fix it. Keep your explanation brief but helpful.
Only return the explanation text without any additional formatting or JSON.
`;

    // Generate content with the Gemini model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error('Error generating import error explanation:', error);
    // Return original error if AI processing fails
    return errorMessage;
  }
}

/**
 * Interface for report data
 */
interface ReportData {
  id?: number;
  content?: any;
  description?: string;
  category?: string;
  severity?: string;
  status?: string;
  pollingStationId?: number;
  stationName?: string;
  createdAt?: Date;
}

/**
 * Interface for Incident prediction
 */
export interface IncidentPrediction {
  issueType: string;
  probability: number;
  suggestedAction: string;
  reasoning: string;
  affectedStations?: string[];
  estimatedImpact: 'low' | 'medium' | 'high';
  preventativeMeasures: string[];
}

/**
 * Analyze incident reports to generate advanced predictions
 * This uses Google's Gemini model to analyze patterns in election observation data
 */
export async function analyzeIncidentPatternsWithGemini(
  reports: ReportData[],
  pollingStationId?: number
): Promise<IncidentPrediction[]> {
  try {
    // Prepare contextual data for the query
    const stationSpecificText = pollingStationId 
      ? `Analyze specifically for polling station ID ${pollingStationId}.` 
      : 'Analyze general patterns across all polling stations.';
    
    // Clean and structure the report data for the prompt
    const cleanedReports = reports.map(report => {
      // Format content to string if it's an object
      const content = typeof report.content === 'object' 
        ? JSON.stringify(report.content) 
        : report.content || '';
      
      return {
        id: report.id,
        description: report.description || '',
        content: content.slice(0, 200) + (content.length > 200 ? '...' : ''), // Truncate long content
        category: report.category || 'unknown',
        severity: report.severity || 'unknown',
        status: report.status || 'unknown',
        pollingStationId: report.pollingStationId,
        stationName: report.stationName || `Station ${report.pollingStationId}`,
        createdAt: report.createdAt ? report.createdAt.toISOString() : 'unknown date'
      };
    });
    
    // Create context for the AI
    const prompt = `
You are an advanced election analytics AI assistant helping election officials predict potential issues at polling stations based on past incident reports.
${stationSpecificText}

Analyze the following election observer reports to identify patterns and make predictions:

Historical Reports Data:
${JSON.stringify(cleanedReports, null, 2)}

Based on these reports, identify:
1. The top 3-5 most likely issues that may occur in the upcoming days
2. For each issue, provide:
   - Issue type/category
   - Probability (as a decimal between 0 and 1)
   - Reasoning based on patterns in the data
   - Suggested preventative action
   - List of polling stations most likely to be affected (if applicable)
   - Estimated impact (low/medium/high)
   - 2-3 concrete preventative measures

Return ONLY a JSON array with each item containing these fields:
- issueType (string)
- probability (number between 0 and 1)
- suggestedAction (string with concise recommendation)
- reasoning (string explaining the pattern analysis)
- affectedStations (array of station names, if applicable)
- estimatedImpact (string: 'low', 'medium', or 'high')
- preventativeMeasures (array of strings with specific measures)

If there's not enough data for meaningful predictions, provide generic but useful predictions for common election issues.
`;

    // Generate content with the Gemini model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract the JSON from the response
    const jsonStartIndex = text.indexOf('[');
    const jsonEndIndex = text.lastIndexOf(']') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      console.error('Could not find valid JSON in the Gemini response for incident predictions');
      return getGenericPredictions();
    }
    
    try {
      const jsonStr = text.substring(jsonStartIndex, jsonEndIndex);
      const predictions = JSON.parse(jsonStr) as IncidentPrediction[];
      
      // Validate predictions format
      if (!Array.isArray(predictions) || predictions.length === 0) {
        console.warn('Predictions array is empty or invalid');
        return getGenericPredictions();
      }
      
      return predictions;
    } catch (parseError) {
      console.error('Error parsing Gemini predictions response:', parseError);
      return getGenericPredictions();
    }
  } catch (error) {
    console.error('Error analyzing incident patterns with Gemini:', error);
    return getGenericPredictions();
  }
}

/**
 * Provides generic predictions when AI analysis fails or data is insufficient
 */
function getGenericPredictions(): IncidentPrediction[] {
  return [
    {
      issueType: 'Voter verification delays',
      probability: 0.75,
      suggestedAction: 'Prepare additional staff and verification equipment',
      reasoning: 'Voter verification is consistently a bottleneck in many elections, particularly during peak hours.',
      estimatedImpact: 'high',
      preventativeMeasures: [
        'Deploy mobile verification teams during peak hours',
        'Create express lanes for voters with complete documentation', 
        'Establish backup manual verification protocols'
      ]
    },
    {
      issueType: 'Technology failures',
      probability: 0.63,
      suggestedAction: 'Implement redundant technical systems and manual backups',
      reasoning: 'Electronic systems are vulnerable to various failures including power outages, software glitches, and connectivity issues.',
      estimatedImpact: 'high',
      preventativeMeasures: [
        'Test all equipment 48 hours before election day',
        'Station technical support staff at larger polling stations',
        'Prepare paper-based backup systems'
      ]
    },
    {
      issueType: 'Ballot shortages',
      probability: 0.51,
      suggestedAction: 'Establish rapid ballot distribution system',
      reasoning: 'Unexpected voter turnout can lead to ballot shortages, especially in contentious elections.',
      estimatedImpact: 'medium',
      preventativeMeasures: [
        'Maintain 25% excess ballot inventory at all stations',
        'Create regional backup supply hubs',
        'Develop emergency printing protocols'
      ]
    },
    {
      issueType: 'Accessibility issues',
      probability: 0.45,
      suggestedAction: 'Audit polling stations for accessibility compliance',
      reasoning: 'Accessibility issues often affect vulnerable populations and can lead to voter disenfranchisement.',
      estimatedImpact: 'medium',
      preventativeMeasures: [
        'Deploy accessibility compliance teams',
        'Prepare portable accessibility equipment',
        'Train staff on accessibility assistance protocols'
      ]
    }
  ];
}