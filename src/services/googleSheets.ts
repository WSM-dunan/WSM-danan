import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Transaction, Attendance } from '../data';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Sheets and Drive scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initializer for Auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check if we already have a session token stored
  const savedToken = sessionStorage.getItem('g_sheets_token');
  if (savedToken) {
    cachedAccessToken = savedToken;
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Try to get token if logged in but token is not in cache
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('g_sheets_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    // Store in sessionStorage to survive tab refreshes safely during active session
    sessionStorage.setItem('g_sheets_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in with Google error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = sessionStorage.getItem('g_sheets_token');
  }
  return cachedAccessToken;
};

export const logoutGoogleSheets = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem('g_sheets_token');
};

/**
 * GOOGLE SHEETS & DRIVE API HELPERS
 */

// Helper: Create a new spreadsheet in Drive
export const createNewSpreadsheet = async (title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const token = getCachedToken();
  if (!token) throw new Error('Not authenticated with Google');

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
};

// Helper: Fetch sheet values from standard range
export const fetchSpreadsheetValues = async (spreadsheetId: string, range: string): Promise<any[][]> => {
  const token = getCachedToken();
  if (!token) throw new Error('Not authenticated with Google');

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to read spreadsheet values: ${errText}`);
  }

  const data = await response.json();
  return data.values || [];
};

// Helper: Write values to a specific range (Updates or Overwrites)
export const updateSpreadsheetValues = async (
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> => {
  const token = getCachedToken();
  if (!token) throw new Error('Not authenticated with Google');

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: values,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to write spreadsheet values: ${errText}`);
  }

  return response.json();
};

// Helper: Find spreadsheets in user's Drive to let them pick
export const listUserSpreadsheets = async (): Promise<{ id: string; name: string; mimeType: string }[]> => {
  const token = getCachedToken();
  if (!token) throw new Error('Not authenticated with Google');

  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=30&fields=files(id,name,mimeType)`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to list spreadsheets from Drive: ${errText}`);
  }

  const data = await response.json();
  return data.files || [];
};
