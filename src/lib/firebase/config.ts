import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use the designated Firestore Database ID if specified
const cfg = firebaseConfig as Record<string, any>;
export const db = cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, cfg.firestoreDatabaseId)
  : getFirestore(app);

export default app;
