export class NotFound extends Error {}

export class BadRequest extends Error {}

export class Conflict extends Error {}

export class Unauthorized extends Error {
  constructor() {
    super("Unauthorized");
  }
}
