export class ResourceNotFoundError extends Error {

}

export class ValidationError extends Error {

  readonly errors: { string: string[] };

  constructor(errors: { string: string[] }) {
    super("validation errors");
    this.errors = errors;
  }

}

export class UnauthorizedError extends Error {

  constructor() {
    super("Unauthorized");
  }

}