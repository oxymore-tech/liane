export class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type ValidationCode = "required" | "wrong_format" | "unknown_value" | "too_short" | "already_member" | "liane_state_invalid" | string;

export type ValidationMessage = {
  code: ValidationCode;
  args: any;
};

function parseValidationMessage(raw: string): ValidationMessage {
  const regex = /^(?<code>[a-z_]+)(?<args>([\s;]([a-z_]+:[^\s;]+))*)$/;
  const match = regex.exec(raw);
  if (!match?.groups) {
    return { code: raw, args: {} };
  }

  const { code, args } = match.groups;

  return {
    code,
    args: Object.fromEntries(
      args
        .trim()
        .split(";")
        .map(a => a.split(":"))
    )
  };
}

export class ValidationError extends Error {
  readonly errors: { [key: string]: ValidationMessage[] };
  readonly validationMessage: ValidationMessage;

  constructor(message: string, errors: { [key: string]: string[] } = {}) {
    super(message);
    this.validationMessage = parseValidationMessage(message);
    this.errors = Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages.map(parseValidationMessage)]));
  }
}

export class NetworkUnavailable extends Error {
  constructor() {
    super("Network request failed");
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

export const isResourceNotFound = (e: Error): e is ResourceNotFoundError => {
  return e.message === "Not found";
};

export const isValidationError = (e: Error): e is ValidationError => {
  return Object.hasOwn(e, "errors") && Object.hasOwn(e, "validationMessage");
};

export const isUnauthorizedError = (e: Error): e is UnauthorizedError => {
  return e.message === "Unauthorized";
};

export class TimedOutError extends Error {
  constructor() {
    super("Timed out");
  }
}
