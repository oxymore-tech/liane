export class ResourceNotFoundError extends Error {}

export class ValidationError extends Error {
  readonly errors: { [key: string]: string[] };

  constructor(errors: { [key: string]: string[] } = {}) {
    super("validation errors");
    this.errors = errors;
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
  }
}
