import { CalendarSlot, User } from '../types/index.ts';

export interface AvailabilityOptions {
  durationMinutes: number; // 30, 45, 60
  bufferMinutes: number; // 15
  workingHoursStart: number; // 9 = 9 AM
  workingHoursEnd: number; // 17 = 5 PM
  timezone: string;
}

export const defaultAvailabilityOptions: AvailabilityOptions = {
  durationMinutes: 30,
  bufferMinutes: 15,
  workingHoursStart: 9,
  workingHoursEnd: 17,
  timezone: 'America/New_York',
};

// Seeded busy blocks for realistic calendar conflicts
const BUSY_PATTERNS: Record<string, { dayOffset: number; startHour: number; endHour: number }[]> = {
  'user-sdr-1': [
    { dayOffset: 1, startHour: 9, endHour: 10 },
    { dayOffset: 1, startHour: 12, endHour: 13 },
    { dayOffset: 1, startHour: 15, endHour: 16 },
    { dayOffset: 2, startHour: 11, endHour: 12 },
    { dayOffset: 2, startHour: 14, endHour: 15 },
  ],
  'user-ae-1': [
    { dayOffset: 1, startHour: 11, endHour: 12.5 },
    { dayOffset: 1, startHour: 13.5, endHour: 14.5 },
    { dayOffset: 2, startHour: 9.5, endHour: 11 },
    { dayOffset: 2, startHour: 15, endHour: 16.5 },
  ],
  'user-sdr-2': [
    { dayOffset: 1, startHour: 10, endHour: 11.5 },
    { dayOffset: 2, startHour: 13, endHour: 14 },
  ],
  'user-ae-2': [
    { dayOffset: 1, startHour: 14, endHour: 15.5 },
    { dayOffset: 2, startHour: 10, endHour: 11.5 },
  ],
};

/**
 * Finds available overlapping slots between SDR and AE
 */
export function findMeetingSlots(
  sdr: User,
  ae: User,
  options: AvailabilityOptions = defaultAvailabilityOptions
): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  const now = new Date();

  // Look ahead 3 business days
  let daysEvaluated = 0;
  let offset = 1;

  while (daysEvaluated < 3 && offset < 7) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + offset);

    const dayOfWeek = targetDate.getDay();
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      offset++;
      continue;
    }

    daysEvaluated++;
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    // Evaluate standard time blocks within working hours
    const candidateHours = [9.5, 10.5, 11.5, 13.5, 14.5, 15.5, 16.0];

    for (const hour of candidateHours) {
      const startMinutes = Math.floor(hour * 60);
      const endMinutes = startMinutes + options.durationMinutes;

      // Check SDR conflict
      const sdrBusy = (BUSY_PATTERNS[sdr.id] || []).some(
        (b) => b.dayOffset === daysEvaluated && hour >= b.startHour && hour < b.endHour
      );

      // Check AE conflict
      const aeBusy = (BUSY_PATTERNS[ae.id] || []).some(
        (b) => b.dayOffset === daysEvaluated && hour >= b.startHour && hour < b.endHour
      );

      const sdrAvailable = !sdrBusy;
      const aeAvailable = !aeBusy;

      if (sdrAvailable && aeAvailable) {
        const slotDateStart = new Date(targetDate);
        slotDateStart.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

        const slotDateEnd = new Date(slotDateStart);
        slotDateEnd.setMinutes(slotDateEnd.getMinutes() + options.durationMinutes);

        const timeFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        const timeLabel = `${slotDateStart.toLocaleTimeString('en-US', timeFormat)} - ${slotDateEnd.toLocaleTimeString('en-US', timeFormat)}`;

        // High priority recommendation: mid-morning or mid-afternoon
        const isIdealTime = (hour >= 10 && hour <= 11.5) || (hour >= 14 && hour <= 15.5);

        slots.push({
          id: `slot-${daysEvaluated}-${hour}`,
          day_label: dayName,
          time_label: timeLabel,
          start_iso: slotDateStart.toISOString(),
          end_iso: slotDateEnd.toISOString(),
          sdr_available: true,
          ae_available: true,
          recommended: isIdealTime,
        });
      }
    }
    offset++;
  }

  return slots;
}
