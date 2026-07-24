import type { PlanRow, UserRow } from './hooks';

let sessionUsers: UserRow[] | null = null;
const sessionPlansByUserId = new Map<string, PlanRow[]>();

export function getSessionUsers(): UserRow[] | null {
  return sessionUsers;
}

export function setSessionUsers(users: UserRow[]): void {
  sessionUsers = users;
}

export function getSessionPlans(userId: string): PlanRow[] | null {
  return sessionPlansByUserId.get(userId) ?? null;
}

export function setSessionPlans(userId: string, plans: PlanRow[]): void {
  sessionPlansByUserId.set(userId, plans);
}

export function hasSessionUsers(): boolean {
  return (sessionUsers?.length ?? 0) > 0;
}
