import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inisialisasi Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: Required for custom database ID */

const provider = new GoogleAuthProvider();
// Request Google Drive and User profile scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

let isSigningIn = false;

// Helper to get/set cached access token securely from sessionStorage
const getCachedToken = (): string | null => {
  try {
    return sessionStorage.getItem('tmii_google_access_token');
  } catch (e) {
    return null;
  }
};

const setCachedToken = (token: string | null) => {
  try {
    if (token) {
      sessionStorage.setItem('tmii_google_access_token', token);
    } else {
      sessionStorage.removeItem('tmii_google_access_token');
    }
  } catch (e) {
    // ignore
  }
};

// Mengatur listener untuk state perubahan autentikasi
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getCachedToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else {
        // Jika user aktif tapi token di storage hilang, panggil failure (hanya jika tidak sedang login)
        if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      setCachedToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Fungsi login menggunakan Popup Google Sign-In
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Auth');
    }

    setCachedToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Kesalahan masuk Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return getCachedToken();
};

export const logout = async () => {
  await signOut(auth);
  setCachedToken(null);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  const errStr = String(errInfo.error).toLowerCase();
  const isNetworkOrOffline = 
    errStr.includes('offline') || 
    errStr.includes('unavailable') || 
    errStr.includes('could not reach') || 
    errStr.includes('network');

  if (isNetworkOrOffline) {
    console.warn('Firestore is currently operating in offline/reconnecting mode:', errInfo.error);
    return;
  }

  throw new Error(JSON.stringify(errInfo));
}
