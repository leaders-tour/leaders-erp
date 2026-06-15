export interface CustomerDeleteSummaryInput {
  name: string;
  plans?: ReadonlyArray<unknown> | null;
  confirmedTrips?: ReadonlyArray<{ status: string }> | null;
  userDealTodos?: ReadonlyArray<unknown> | null;
}

export interface CustomerDeleteSummary {
  customerName: string;
  planCount: number;
  confirmedTripCount: number;
  activeConfirmedTripCount: number;
  dealTodoCount: number;
}

export function buildCustomerDeleteSummary(user: CustomerDeleteSummaryInput): CustomerDeleteSummary {
  const plans = user.plans ?? [];
  const confirmedTrips = user.confirmedTrips ?? [];
  const dealTodos = user.userDealTodos ?? [];

  return {
    customerName: user.name,
    planCount: plans.length,
    confirmedTripCount: confirmedTrips.length,
    activeConfirmedTripCount: confirmedTrips.filter((trip) => trip.status === 'ACTIVE').length,
    dealTodoCount: dealTodos.length,
  };
}

export function isCustomerDeleteConfirmationValid(customerName: string, confirmationInput: string): boolean {
  return confirmationInput.trim() === customerName.trim();
}
