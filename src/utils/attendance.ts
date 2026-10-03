import type { AttendanceStatus, Attendance, Player } from '../types';

export const STATUS_LIST: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'asistido', label: '✓ Asistido', color: '#4CAF50' },
  { value: 'falta_justificada', label: '⚠ Justificada', color: '#FF9800' },
  { value: 'falta_injustificada', label: '✗ Injustif.', color: '#F44336' },
  { value: 'retraso', label: '⏱ Retraso', color: '#EAB308' },
];

export function nextStatus(current: AttendanceStatus | undefined): AttendanceStatus {
  const idx = STATUS_LIST.findIndex((s) => s.value === current);
  const next = (idx + 1) % STATUS_LIST.length;
  return STATUS_LIST[next].value;
}

export function statusInfo(status: AttendanceStatus | undefined): { label: string; color: string } {
  const found = STATUS_LIST.find((s) => s.value === status);
  if (found) return { label: found.label, color: found.color };
  return { label: '— Sin marcar', color: '#94a3b8' };
}

function attendanceScore(status: AttendanceStatus): number {
  if (status === 'asistido') return 1;
  if (status === 'retraso') return 0.9;
  return 0;
}

export function getPlayerAttendancePercent(playerId: string, attendances: Attendance[]): number {
  const valid = attendances.filter((a) => a.playerId === playerId && a.status !== 'falta_justificada');
  if (valid.length === 0) return 0;
  const score = valid.reduce((sum, a) => sum + attendanceScore(a.status), 0);
  return Math.round((score / valid.length) * 100);
}

export function getTeamAttendancePercent(teamId: string, players: Player[], attendances: Attendance[]): number {
  const teamPlayers = players.filter((p) => p.teamId === teamId);
  if (teamPlayers.length === 0) return 0;
  let total = 0;
  let score = 0;

  for (const p of teamPlayers) {
    const valid = attendances.filter((a) => a.playerId === p.id && a.status !== 'falta_justificada');
    total += valid.length;
    score += valid.reduce((sum, a) => sum + attendanceScore(a.status), 0);
  }

  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}