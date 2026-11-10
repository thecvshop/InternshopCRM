/**
 * Pricing Engine for Rent an Intern: Physical Presence Gigs
 * (Stall Handling, BTS Content, Vox-pop, Anchoring, Event Support)
 *
 * Official Rate Card Rules:
 * ① INTERN PAY (Per Intern):
 *   - Minimum (up to 3 hours): ₹1,000
 *   - Standard (5 hours): ₹1,750
 *   - Full Day (8 hours): ₹2,800
 *   - Beyond 8 hours: ₹400 / hr extra
 *   - Hours 3-5: ₹1,000 + (hours - 3) * ₹375/hr
 *   - Hours 5-8: ₹1,750 + (hours - 5) * ₹350/hr
 *   - Travel reimbursement: ₹200 flat within city per intern (Paid directly to intern)
 *
 * ② INTERN SHOP COORDINATION FEE (Agency Fee from client):
 *   - Flat fee per booking: ₹1,000
 *   - Volume discounts:
 *     - 1–2 bookings: ₹1,000
 *     - 3–5 bookings: ₹800 (Save ₹200)
 *     - 6–9 bookings: ₹650 (Save ₹350)
 *     - 10+ bookings: ₹500 (Save half)
 */

export interface RentAnInternPricingResult {
  hours: number;
  noOfKids: number;
  ratePerKid: number;
  travelPerKid: number;
  amountEarned: number; // ratePerKid * noOfKids
  travel: number;       // travelPerKid * noOfKids
  totalAmount: number;  // amountEarned + travel
  tierName: string;
  coordinationFee: number;
  clientGrandTotal: number;
}

/**
 * Calculate amount earned, travel reimbursement, and total amount based on hours and number of interns.
 */
export function calculateRentAnInternPricing(
  hours: number,
  noOfKids: number = 1,
  completedBookingsCount: number = 0
): RentAnInternPricingResult {
  const safeHours = Math.max(0, Number(hours) || 0);
  const safeKids = Math.max(1, Number(noOfKids) || 1);

  if (safeHours === 0) {
    return {
      hours: 0,
      noOfKids: safeKids,
      ratePerKid: 0,
      travelPerKid: 0,
      amountEarned: 0,
      travel: 0,
      totalAmount: 0,
      tierName: '0 Hours',
      coordinationFee: 1000,
      clientGrandTotal: 1000,
    };
  }

  let ratePerKid = 0;
  let tierName = '';

  if (safeHours <= 3) {
    // Minimum 3 hours tier: ₹1,000 flat
    ratePerKid = 1000;
    tierName = 'Minimum Slot (3 hrs)';
  } else if (safeHours < 5) {
    // Pro-rated between 3 hrs (₹1,000) and 5 hrs (₹1,750) -> ₹375/hr
    ratePerKid = Math.round(1000 + (safeHours - 3) * 375);
    tierName = `${safeHours} Hours Slot`;
  } else if (safeHours === 5) {
    // Standard 5 hours tier: ₹1,750
    ratePerKid = 1750;
    tierName = 'Standard Slot (5 hrs)';
  } else if (safeHours < 8) {
    // Pro-rated between 5 hrs (₹1,750) and 8 hrs (₹2,800) -> ₹350/hr
    ratePerKid = Math.round(1750 + (safeHours - 5) * 350);
    tierName = `${safeHours} Hours Slot`;
  } else if (safeHours === 8) {
    // Full day 8 hours tier: ₹2,800
    ratePerKid = 2800;
    tierName = 'Full Day Slot (8 hrs)';
  } else {
    // Beyond 8 hours: ₹2,800 + ₹400/hr extra
    const extraHours = safeHours - 8;
    ratePerKid = Math.round(2800 + extraHours * 400);
    tierName = `Full Day + ${extraHours} hr${extraHours > 1 ? 's' : ''} extra (@ ₹400/hr)`;
  }

  // Travel reimbursement: ₹200 flat within city per intern
  const travelPerKid = 200;
  const amountEarned = ratePerKid * safeKids;
  const travel = travelPerKid * safeKids;
  const totalAmount = amountEarned + travel;

  // Coordination fee calculation
  const coordinationFee = getInternshopCoordinationFee(completedBookingsCount);
  const clientGrandTotal = totalAmount + coordinationFee;

  return {
    hours: safeHours,
    noOfKids: safeKids,
    ratePerKid,
    travelPerKid,
    amountEarned,
    travel,
    totalAmount,
    tierName,
    coordinationFee,
    clientGrandTotal,
  };
}

/**
 * Get the rate card volume discount coordination fee (total amount earned by Internshop)
 * based on the number of prior bookings for this client in the year.
 * Rate Card Rules:
 * - 1–2 bookings: ₹1,000 (Flat fee)
 * - 3–5 bookings: ₹800 (Save ₹200)
 * - 6–9 bookings: ₹650 (Save ₹350)
 * - 10+ bookings: ₹500 (Save half)
 */
export function getInternshopCoordinationFee(priorBookingsCount: number = 0): number {
  const currentBookingIndex = Math.max(0, priorBookingsCount) + 1;
  if (currentBookingIndex >= 10) return 500;
  if (currentBookingIndex >= 6) return 650;
  if (currentBookingIndex >= 3) return 800;
  return 1000;
}

/**
 * Resolves the amount earned by Internshop for a booking:
 * Uses explicit value if saved, else calculates dynamically based on the company's booking order/volume.
 */
export function resolveInternshopFee(
  booking: { amountEarnedByInternshop?: number; company?: string; id?: string },
  allBookings?: Array<{ company?: string; id?: string }>
): number {
  if (booking.amountEarnedByInternshop !== undefined && booking.amountEarnedByInternshop !== null) {
    return Number(booking.amountEarnedByInternshop) || 0;
  }

  if (!allBookings || !booking.company) {
    return 1000;
  }

  const trimmed = booking.company.trim().toLowerCase();
  const companyBookings = allBookings.filter(
    (b) => b.company && b.company.trim().toLowerCase() === trimmed
  );

  let priorCount = 0;
  if (booking.id) {
    const idx = companyBookings.findIndex((b) => b.id === booking.id);
    priorCount = idx >= 0 ? idx : companyBookings.length;
  } else {
    priorCount = companyBookings.length;
  }

  return getInternshopCoordinationFee(priorCount);
}

