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

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  password?: string;
  phoneNumber?: string;
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