export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, string>;

  constructor(code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

type ValidationIssue = {
  path: Array<string | number>;
  message: string;
};

type ValidationErrorSource = {
  issues: ValidationIssue[];
};

export function toValidationDetails(error: ValidationErrorSource): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue, index) => [
      issue.path.length > 0 ? issue.path.join('.') : `issue_${index + 1}`,
      issue.message,
    ]),
  );
}

function formatValidationMessage(message: string, details: Record<string, string>): string {
  const summary = Object.entries(details)
    .map(([path, detail]) => (path.startsWith('issue_') ? detail : `${path}: ${detail}`))
    .join('; ');

  return summary.length > 0 ? `${message} (${summary})` : message;
}

export function createValidationError(message: string, error: ValidationErrorSource): DomainError {
  const details = toValidationDetails(error);
  return new DomainError('VALIDATION_FAILED', formatValidationMessage(message, details), details);
}

export function toGraphQLErrorExtensions(error: unknown): Record<string, unknown> {
  if (error instanceof DomainError) {
    return {
      code: error.code,
      details: error.details ?? null,
    };
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
  };
}
