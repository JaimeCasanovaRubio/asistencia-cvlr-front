export type TrainingDays = 'martes_jueves' | 'lunes_miercoles';

export type AttendanceStatus = 'asistido' | 'falta_justificada' | 'falta_injustificada' | 'retraso';

export interface Team {
  id: string;
  name: string;
  trainingDays: TrainingDays;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
}

export interface Attendance {
  id: string;
  playerId: string;
  date: string;
  status: AttendanceStatus;
}