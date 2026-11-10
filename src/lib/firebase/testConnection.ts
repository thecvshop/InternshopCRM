import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  timestamp: string;
  writeSuccess?: boolean;
  readSuccess?: boolean;
  deleteSuccess?: boolean;
  error?: string;
}

export async function runFirebaseConnectionTest(): Promise<ConnectionTestResult> {
  const testDocId = `test_${Date.now()}`;
  const testRef = doc(db, 'connectionTest', testDocId);
  const payload = {
    test: 'InternsHome CRM ping verification',
    timestamp: new Date().toISOString(),
    status: 'ok',
  };

  try {
    // 1. Write to test document
    await setDoc(testRef, payload);
    const writeSuccess = true;

    // 2. Read back from test document
    const snapshot = await getDoc(testRef);
    const readSuccess = snapshot.exists() && snapshot.data()?.status === 'ok';

    // 3. Remove test record afterwards
    await deleteDoc(testRef);
    const deleteSuccess = true;

    return {
      success: writeSuccess && readSuccess && deleteSuccess,
      message: 'Cloud Firestore live read/write/delete cycle verified successfully.',
      timestamp: new Date().toISOString(),
      writeSuccess,
      readSuccess,
      deleteSuccess,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Firebase connection test error:', err);
    return {
      success: false,
      message: `Connection test failed: ${errorMessage}`,
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }
}
