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
      let token = getCachedToken();
      if (!token) {
        try {
          token = await user.getIdToken();
          setCachedToken(token);
        } catch {
          token = '';
        }
      }
      if (onAuthSuccess) onAuthSuccess(user, token || '');
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
    const token = credential?.accessToken || (await result.user.getIdToken()) || '';

    setCachedToken(token);
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    // Penanganan khusus ketika user sengaja / tidak sengaja menutup popup Google Sign-In
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      console.info('Login Google dibatalkan oleh pengguna (popup ditutup).');
      return null;
    }

    // Penanganan jika browser memblokir popup
    if (error?.code === 'auth/popup-blocked') {
      console.warn('Popup login diblokir oleh browser.');
      throw new Error('Jendela popup login terblokir oleh browser. Harap izinkan pop-up untuk situs ini atau coba buka aplikasi di tab baru.');
    }

    // Penanganan jika ada gangguan jaringan
    if (error?.code === 'auth/network-request-failed') {
      console.warn('Koneksi jaringan terputus saat proses autentikasi.');
      throw new Error('Koneksi internet bermasalah. Harap periksa jaringan Anda dan coba lagi.');
    }

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
