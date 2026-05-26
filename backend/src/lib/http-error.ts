// HttpError - cho phép throw từ service và auto convert sang response chuẩn

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Vui lòng đăng nhập') {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Không có quyền truy cập') {
    return new HttpError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Không tìm thấy') {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new HttpError(409, 'CONFLICT', message);
  }
  static unprocessable(message: string, details?: unknown) {
    return new HttpError(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
  static internal(message = 'Lỗi máy chủ nội bộ') {
    return new HttpError(500, 'INTERNAL_ERROR', message);
  }
}
