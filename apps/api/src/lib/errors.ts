export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, string>;

  constructor(code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.code = code;
    this.details = details;
  }
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
