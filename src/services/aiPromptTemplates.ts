/**
 * Centralized AI Prompt Templates for InternsHome Job Creator module.
 * Stored centrally (not buried inside React components) per architectural requirements.
 */

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  template: string;
}

export const AI_PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  briefExtraction: {
    id: 'brief-extraction',
    name: 'Rent an Intern Brief Extraction',
    version: '1.2.0',
    description: 'Extracts structured gig information from raw client WhatsApp or email messages.',
    template: `You are the AI Assistant for InternsHome CRM's "Job Creator" module for "Rent an Intern" in Kolkata, India.
Given a raw client message/brief, extract available information into a structured format.
Never invent information. If information is not mentioned, leave it empty or null.
Map roles to standard categories: Content Creator, Videographer, Photographer, Video Editor, Event Support, Event Registration, Stall Support, Promoter, Research Intern, Data Entry, Operations Support, Social Media Support, Marketing Support, Sales Support, Campus Ambassador, Host / Presenter, Graphic Design, Production Assistant, Other.`,
  },
  missingInfoDetection: {
    id: 'missing-info-detection',
    name: 'Missing Information Detection',
    version: '1.1.0',
    description: 'Compares extracted data against Rent an Intern core operational requirements.',
    template: `Check the extracted data against the essential Rent an Intern requirements:
1. Role & scope of work
2. Number of interns needed
3. Date & start/end timing
4. Location (Venue & area)
5. Brand or Client name
Identify ONLY crucial missing fields that prevent posting the gig or assigning interns.`,
  },
  clientClarificationGenerator: {
    id: 'client-clarification-generator',
    name: 'Client Clarification Generator',
    version: '1.2.0',
    description: 'Generates a short, polite WhatsApp message asking only for missing fields.',
    template: `Generate a concise, polite WhatsApp message to send back to the client asking ONLY for the missing details.
Format:
"Just need [N] quick details:

1. [Question 1]?
2. [Question 2]?"
Do NOT generate a full questionnaire if only 1-3 details are missing. Never ask for info already provided.`,
  },
  finalJobMessageGenerator: {
    id: 'final-job-message-generator',
    name: 'Final Job Message Generator',
    version: '1.3.0',
    description: 'Generates the official standardized WhatsApp gig notification for students.',
    template: `🚨 RENT AN INTERN GIG | PAID ₹[Amount]

🎯 Role: [Role]

📍 Location: [Venue, Area]
📅 Date: [Date]
⏰ Time: [Start Time to End Time]
🏷️ Brand/Event: [Name]
[Instagram/Page link if relevant]

Scope of Work:
• [Tasks and deliverables]

Who Should Apply:
• [Skills and expectations]

Payment: ₹[Amount]
[Payment inclusions]

To apply, DM:
1. Name and phone number
2. College and year
[Additional relevant questions]
Confirmation of availability`,
  },
  roleClassification: {
    id: 'role-classification',
    name: 'Role Classification',
    version: '1.0.0',
    description: 'Normalizes informal job titles into standardized CRM role categories.',
    template: `Classify the client requirement into one of the 19 standard Rent an Intern roles:
Content Creator, Videographer, Photographer, Video Editor, Event Support, Event Registration, Stall Support, Promoter, Research Intern, Data Entry, Operations Support, Social Media Support, Marketing Support, Sales Support, Campus Ambassador, Host / Presenter, Graphic Design, Production Assistant, Other.`,
  },
};
