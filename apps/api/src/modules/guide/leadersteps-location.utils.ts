export const ULAANBAATAR_DAY_MS = 24 * 60 * 60 * 1000;

const ULAANBAATAR_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ulaanbaatar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface LeaderstepsProjectRow {
  id: string;
  name: string;
  started_at: number | string;
  scheduled_ended_at: number | string;
  ended_at: number | string | null;
  is_active: number | boolean | null;
}

export interface LeaderstepsLocationLogRow {
  user_id: string;
  project_id: string;
  lat: number | string;
  lng: number | string;
  accuracy: number | string;
  timestamp: number | string;
}

export interface LeaderstepsPlaceVisitRow {
  id: string;
  user_id: string;
  project_id: string;
  center_lat: number | string;
  center_lng: number | string;
  started_at: number | string;
  ended_at: number | string;
  duration_ms: number | string;
  radius_meters: number | string;
  point_count: number | string;
  pin_type: string | null;
  description: string | null;
}

export function getTodayInUlaanbaatar(): string {
  return ULAANBAATAR_DATE_FORMATTER.format(new Date());
}

export function getUlaanbaatarDayRange(date: string): { startMs: number; endMs: number } {
  const startMs = Date.parse(`${date}T00:00:00+08:00`);
  return { startMs, endMs: startMs + ULAANBAATAR_DAY_MS };
}

export function projectEndMs(project: LeaderstepsProjectRow): number {
  if (project.ended_at != null) {
    return Number(project.ended_at);
  }
  return Number(project.scheduled_ended_at);
}

export function isProjectActiveOnDate(
  project: LeaderstepsProjectRow,
  dayStartMs: number,
  dayEndMs: number,
): boolean {
  const projectStart = Number(project.started_at);
  const projectEnd = projectEndMs(project);
  return projectStart < dayEndMs && projectEnd >= dayStartMs;
}

export function isLogWithinProject(logTimestamp: number, project: LeaderstepsProjectRow): boolean {
  return logTimestamp >= Number(project.started_at) && logTimestamp <= projectEndMs(project);
}
