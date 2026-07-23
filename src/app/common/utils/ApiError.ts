export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: any) {
    super(message);
    this.statusCode = statusCode;
  }

  static badRequest(message:any = "bad request") {
    return new ApiError(400, message);
  }

  static unauthorized(message:any = "unauthorized") {
    return new ApiError(401, message);
  }

  static conflict(message:any = "conflict") {
    return new ApiError(409, message);
  }

  static notFound(message:any = "not found") {
    return new ApiError(404, message);
  }

  static serverError(message:any = "server error") {
    return new ApiError(500, message);
  }
}

