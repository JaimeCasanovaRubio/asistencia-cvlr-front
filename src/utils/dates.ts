import type { TrainingDays } from '../types';

export const SEASON_START = '2026-09-01';
export const SEASON_END = '2027-07-31';

export const DAY_NAMES: Record<TrainingDays, string[]> = {
  martes_jueves: ['Tuesday', 'Thursday'],
  lunes_miercoles: ['Monday', 'Wednesday'],
};

export function getTrainingDatesForTeam(trainingDays: TrainingDays): string[] {
  const start = new Date(SEASON_START);
  const end = new Date(SEASON_END);
  const dayNames = DAY_NAMES[trainingDays] || DAY_NAMES['martes_jueves'];
  const dates: string[] = [];

  const current = new Date(start);
  while (current <= end) {
    const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });
    if (dayNames.includes(dayName)) {
      dates.push(current.toISOString().split('T')[0] as string);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}