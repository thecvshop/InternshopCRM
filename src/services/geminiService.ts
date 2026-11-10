import { z } from 'zod';
import { db } from '../lib/firebase/config';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';

export const StructuredAiResponseSchema = z.object({
  client: z.string().default(''),
  brand: z.string().default(''),
  role: z.string().default(''),
  normalizedRole: z.string().default('Event Support'),
  numberOfInterns: z.number().nullable().optional(),
  dates: z.array(z.string()).default([]),
  startTime: z.string().default(''),
  endTime: z.string().default(''),
  durationMinutes: z.number().nullable().optional(),
  location: z
    .object({
      venue: z.string().default(''),
      area: z.string().default(''),
      city: z.string().default('Kolkata'),
    })
    .default({ venue: '', area: '', city: 'Kolkata' }),
  scopeOfWork: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
  deliveryDeadline: z.string().default(''),
  skills: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  applicationRequirements: z.array(z.string()).default([]),
  foodProvided: z.boolean().nullable().optional(),
  travelProvided: z.boolean().nullable().optional(),
  missingFields: z.array(z.string()).default([]),
  clarificationMessage: z.string().default(''),
  confidence: z.record(z.string(), z.any()).default({}),
});

export type StructuredAiResponse = z.infer<typeof StructuredAiResponseSchema>;

export interface GeminiConfigState {
  status: 'Connected' | 'Not Connected' | 'Error';
  model: string;
  hasKey: boolean;
  maskedKey: string;
  lastTestedAt?: string;
  error?: string;
}

export interface AiOperationLog {
  id?: string;
  jobId?: string;
  operationType: 'Brief Extraction' | 'Follow-up Synthesis' | 'Checklist Generation' | 'Connection Test';
  timestamp: string;
  requestedBy: string;
  model: string;
  status: 'Success' | 'Failed' | 'Fallback';
  latencyMs: number;
  error?: string;
  promptVersion: string;
}

// Fetch current Gemini connection status safely (no API key exposed)
export async function getGeminiConfig(): Promise<GeminiConfigState> {
  try {
    const res = await fetch('/api/ai/config');
    if (!res.ok) {
      return {
        status: 'Not Connected',
        model: 'gemini-3.8-flash',
        hasKey: false,
        maskedKey: '••••••••••••••••',
        error: 'Failed to retrieve configuration',
      };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      status: 'Not Connected',
      model: 'gemini-3.8-flash',
      hasKey: false,
      maskedKey: '••••••••••••••••',
      error: err.message,
    };
  }
}

// Test Gemini API connection on server side
export async function testGeminiConnection(apiKey?: string, model?: string): Promise<{ success: boolean; message: string; model?: string }> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/ai/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model }),
    });
    const data = await res.json();
    const latency = Date.now() - startTime;

    // Log operation safely
    logAiOperationSafe({
      operationType: 'Connection Test',
      timestamp: new Date().toISOString(),
      requestedBy: 'Administrator',
      model: model || 'gemini-3.8-flash',
      status: data.success ? 'Success' : 'Failed',
      latencyMs: latency,
      error: data.success ? undefined : data.error,
      promptVersion: '1.0.0',
    });

    return data;
  } catch (err: any) {
    return { success: false, message: err.message || 'Server connection failed' };
  }
}

// Save Gemini configuration (stores model and metadata; never stores raw API key in Firestore)
export async function saveGeminiConfig(config: { apiKey?: string; model: string; userEmail: string }): Promise<{ success: boolean; message: string }> {
  try {
    // Configure on server
    const res = await fetch('/api/ai/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: config.apiKey, model: config.model }),
    });
    const data = await res.json();

    // Store non-sensitive metadata in Firestore integrationSettings
    try {
      const settingRef = doc(db, 'integrationSettings', 'gemini');
      await setDoc(settingRef, {
        provider: 'Google Gemini',
        model: config.model,
        status: data.success ? 'Connected' : 'Error',
        lastTestedAt: new Date().toISOString(),
        configuredBy: config.userEmail,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (fsErr) {
      console.warn('Could not write integrationSettings metadata to Firestore:', fsErr);
    }

    return data;
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to save configuration' };
  }
}

// Analyze Brief through server-side Gemini service with Zod validation
export async function analyzeBriefWithGemini(
  brief: string,
  clarification?: string,
  existingJob?: any,
  requestedBy: string = 'Operations'
): Promise<StructuredAiResponse> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/ai/analyze-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, clarification, existingJob }),
    });

    const latency = Date.now() - startTime;

    if (!res.ok) {
      throw new Error(`Server returned error ${res.status}`);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Invalid AI response');
    }

    // Validate using Zod schema
    const validated = StructuredAiResponseSchema.parse(json.data);

    // Log safe metadata
    logAiOperationSafe({
      operationType: clarification ? 'Follow-up Synthesis' : 'Brief Extraction',
      timestamp: new Date().toISOString(),
      requestedBy,
      model: 'gemini-3.8-flash',
      status: 'Success',
      latencyMs: latency,
      promptVersion: '1.2.0',
    });

    return validated;
  } catch (err: any) {
    // Safe audit of failure
    logAiOperationSafe({
      operationType: clarification ? 'Follow-up Synthesis' : 'Brief Extraction',
      timestamp: new Date().toISOString(),
      requestedBy,
      model: 'gemini-3.8-flash',
      status: 'Failed',
      latencyMs: Date.now() - startTime,
      error: err.message,
      promptVersion: '1.2.0',
    });

    throw err;
  }
}

// Generate the 11-point requirement checklist WhatsApp message
export function generateFullRequirementChecklist(): string {
  return `Hi! Please send us these details for the Rent an Intern requirement:

1. Brand/Event:
2. What do you need the intern(s) to do?
3. No. of interns:
4. Date:
5. Timings:
6. Venue/Location:
7. Deliverables, if any:
8. Any specific skills required:
9. Any phone/camera/laptop requirement?
10. Food/travel provided, if any:
11. Any other instructions:

You can reply normally on WhatsApp. No need to follow the exact format.`;
}

// Safe logger to Firestore `aiOperations` (never logs API keys or secrets)
export async function logAiOperationSafe(log: AiOperationLog): Promise<void> {
  try {
    const colRef = collection(db, 'aiOperations');
    await addDoc(colRef, {
      ...log,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking log failure
    console.debug('Safe AI operation log failed:', err);
  }
}
