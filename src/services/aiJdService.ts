// Service to call Gemini AI on server to simplify messy or lengthy client Job Descriptions into CRM-ready formats

export interface SimplifiedJdResult {
  simplifiedJd: string;
  bulletPoints?: string[];
  detectedRole?: string;
  detectedInterns?: number | null;
  detectedHours?: number | null;
}

// Client fallback if server is unreachable or offline
export function fallbackSimplifyJd(rawText: string): SimplifiedJdResult {
  const clean = rawText.trim();

  // Detect role
  let role = 'Rent An Intern Gig';
  if (/model|lookbook|fashion|outfit|photoshoot for clothes/i.test(clean)) {
    role = 'Model (UGC + Photoshoot)';
  } else if (/videograph|cameraman|camera person|video shoot|shoot reel/i.test(clean)) {
    role = 'Video & Reel Shoot';
  } else if (/photograph|photoshoot|headshot/i.test(clean)) {
    role = 'Event Photography Shoot';
  } else if (/video edit|editing|post-production/i.test(clean)) {
    role = 'Video & Reel Editing';
  } else if (/content|creator|stories|social media|reels/i.test(clean)) {
    role = 'Content Creation & UGC';
  } else if (/registration|front desk|check in|badge|gate/i.test(clean)) {
    role = 'Event Registration & Front Desk';
  } else if (/stall|booth|exhibition|expo|lead|counter/i.test(clean)) {
    role = 'Exhibition Stall & Lead Support';
  } else if (/promoter|flyer|pamphlet|distribution|sampling/i.test(clean)) {
    role = 'Flyer & Brand Promotion';
  } else if (/data entry|excel|compiling|spreadsheet/i.test(clean)) {
    role = 'Data Entry & Compilation';
  } else if (/usher|hospitality|event help|ushering/i.test(clean)) {
    role = 'Event Hospitality & Ushering';
  }

  // Extract interns if mentioned (e.g. "need 2 interns", "3 kids", "4 people")
  let detectedInterns: number | null = null;
  const internMatch = clean.match(/(\d+)\s*(?:interns?|kids?|people|persons?|candidat?es?|models?|creators?)/i);
  if (internMatch) {
    detectedInterns = parseInt(internMatch[1], 10);
  }

  // Extract hours if mentioned (e.g. "3 hours", "4 hrs")
  let detectedHours: number | null = null;
  const hoursMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i);
  if (hoursMatch) {
    detectedHours = parseFloat(hoursMatch[1]);
  }

  // Extract first informative sentence or phrase
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstMeaningful = lines[0] || clean;
  let simplifiedTitle = role;
  if (firstMeaningful && firstMeaningful.length > 8 && firstMeaningful.length < 65) {
    const cleanedPhrase = firstMeaningful
      .replace(/^(we need|looking for|require|urgent requirement for|hi team|hello|need)\s*/i, '')
      .replace(/[.!?:;]+$/, '');
    simplifiedTitle = `${role} - ${cleanedPhrase}`;
    if (simplifiedTitle.length > 55) {
      simplifiedTitle = simplifiedTitle.slice(0, 52).trim() + '...';
    }
  }

  return {
    simplifiedJd: simplifiedTitle,
    bulletPoints: [
      'Coordinate and execute on-site gig tasks per client requirements',
      'Maintain punctuality and ensure deliverable handoff before shift completion',
    ],
    detectedRole: role,
    detectedInterns,
    detectedHours,
  };
}

export async function simplifyJobDescriptionWithAi(rawJd: string): Promise<SimplifiedJdResult> {
  const trimmed = rawJd.trim();
  if (!trimmed) {
    throw new Error('Please enter or paste the client job description first.');
  }

  try {
    const res = await fetch('/api/ai/simplify-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawJd: trimmed }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data && data.data.simplifiedJd) {
        return {
          simplifiedJd: data.data.simplifiedJd,
          bulletPoints: Array.isArray(data.data.bulletPoints) ? data.data.bulletPoints : [],
          detectedRole: data.data.detectedRole || undefined,
          detectedInterns: typeof data.data.detectedInterns === 'number' ? data.data.detectedInterns : null,
          detectedHours: typeof data.data.detectedHours === 'number' ? data.data.detectedHours : null,
        };
      }
    }
  } catch (err) {
    console.warn('Server AI simplification failed, using smart local fallback:', err);
  }

  // If server fails or offline, return smart fallback
  return fallbackSimplifyJd(trimmed);
}
