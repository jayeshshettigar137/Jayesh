/** A rule violation that is safe to show to a user (bad input, wrong state, missing approval). */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string = "domain_error",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(what: string) {
    super(`${what} not found`, "not_found");
  }
}
