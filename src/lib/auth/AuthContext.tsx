import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../../types/crm';

// In-memory token cache (never stored in localStorage/sessionStorage)
let cachedGoogleAccessToken: string | null = null;

export const getGoogleAccessToken = (): string | null => {
  return cachedGoogleAccessToken;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedGoogleAccessToken = token;
};

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  googleAccessToken: string | null;
  setRole: (role: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<string | null>;
  requestGoogleSheetsAccess: () => Promise<string | null>;
  signInDemo: (desiredRole?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_admin_01',
  email: 'thecvshopin@gmail.com',
  displayName: 'Admin (InternsHome)',
  role: 'Administrator',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  profile: DEFAULT_PROFILE,
  role: 'Administrator',
  loading: false,
  setRole: async () => {},
  signInWithGoogle: async () => {},
  signInDemo: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            // Initialize default admin or requested profile
            const newProfile: UserProfile = {
              id: user.uid,
              email: user.email || 'thecvshopin@gmail.com',
              displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Operations Lead'),
              role: 'Administrator',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.warn('Could not fetch user profile from Firestore, using fallback:', err);
          setProfile(DEFAULT_PROFILE);
        }
      } else {
        // Fallback default admin profile for rapid exploration
        setProfile(DEFAULT_PROFILE);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setRole = async (newRole: UserRole) => {
    if (profile) {
      const updated = { ...profile, role: newRole, updatedAt: new Date().toISOString() };
      setProfile(updated);
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
        } catch (err) {
          console.error('Failed to sync role to Firestore:', err);
        }
      }
    }
  };

  const [googleAccessToken, setLocalGoogleAccessToken] = useState<string | null>(null);

  const requestGoogleSheetsAccess = async (): Promise<string | null> => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.setCustomParameters({ prompt: 'consent select_account' });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        cachedGoogleAccessToken = token;
        setLocalGoogleAccessToken(token);
      }
      return token;
    } catch (err: unknown) {
      console.warn('Google Sheets authorization failed or was closed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<string | null> => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        cachedGoogleAccessToken = token;
        setLocalGoogleAccessToken(token);
      }
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        const isAdmin = user.email === 'thecvshopin@gmail.com';
        const newProfile: UserProfile = {
          id: user.uid,
          email: user.email || 'thecvshopin@gmail.com',
          displayName: user.displayName || 'Operations Lead',
          role: isAdmin ? 'Administrator' : 'Operations',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        setProfile(newProfile);
      }
      return token;
    } catch (err: unknown) {
      console.warn('Google sign-in popup closed or cancelled:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInDemo = async (desiredRole: UserRole = 'Administrator') => {
    try {
      setLoading(true);
      const cred = await signInAnonymously(auth);
      const userProfile: UserProfile = {
        id: cred.user.uid,
        email: 'thecvshopin@gmail.com',
        displayName: `InternsHome (${desiredRole})`,
        role: desiredRole,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), userProfile, { merge: true });
      setProfile(userProfile);
    } catch (err) {
      console.error('Anonymous sign-in error:', err);
      // Still set local profile for operational usability
      setProfile({
        ...DEFAULT_PROFILE,
        role: desiredRole,
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      cachedGoogleAccessToken = null;
      setLocalGoogleAccessToken(null);
      setCurrentUser(null);
      setProfile(DEFAULT_PROFILE);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role: profile?.role || 'Administrator',
        loading,
        googleAccessToken,
        setRole,
        signInWithGoogle,
        requestGoogleSheetsAccess,
        signInDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
