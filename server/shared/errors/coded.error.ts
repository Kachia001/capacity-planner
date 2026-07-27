export abstract class CodedError extends Error {
  abstract readonly code: string

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}
