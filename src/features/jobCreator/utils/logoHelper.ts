export interface PresetBrand {
  name: string;
  domain: string;
  logoUrl: string;
}

export const PRESET_BRANDS: PresetBrand[] = [
  {
    name: 'Taj Bengal',
    domain: 'tajhotels.com',
    logoUrl: 'https://logo.clearbit.com/tajhotels.com',
  },
  {
    name: 'ITC Hotels',
    domain: 'itchotels.com',
    logoUrl: 'https://logo.clearbit.com/itchotels.com',
  },
  {
    name: 'Blue Tokai Coffee',
    domain: 'bluetokaicoffee.com',
    logoUrl: 'https://logo.clearbit.com/bluetokaicoffee.com',
  },
  {
    name: 'Zomato',
    domain: 'zomato.com',
    logoUrl: 'https://logo.clearbit.com/zomato.com',
  },
  {
    name: 'Swiggy',
    domain: 'swiggy.com',
    logoUrl: 'https://logo.clearbit.com/swiggy.com',
  },
  {
    name: 'InternsHome',
    domain: 'internshome.com',
    logoUrl: 'https://www.google.com/s2/favicons?domain=internshome.com&sz=128',
  },
];

/**
 * Normalizes input URL or domain string into a clean host domain
 */
export function cleanDomain(input: string): string {
  if (!input) return '';
  let str = input.trim().toLowerCase();
  str = str.replace(/^https?:\/\//, '');
  str = str.replace(/^www\./, '');
  str = str.split('/')[0];
  str = str.split('?')[0];
  return str;
}

/**
 * Returns the best logo URL for a domain
 */
export function getLogoUrlForDomain(domainOrUrl: string): string {
  const domain = cleanDomain(domainOrUrl);
  if (!domain) return '';

  // Check preset brands first
  const match = PRESET_BRANDS.find((b) => b.domain.toLowerCase() === domain.toLowerCase());
  if (match) return match.logoUrl;

  // Use Clearbit logo service with Google Favicon as fallback
  return `https://logo.clearbit.com/${domain}`;
}

/**
 * Converts a browser uploaded image File to a Base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
