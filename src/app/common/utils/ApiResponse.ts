import type { Response } from "express";

export class ApiResponse {
  static success(res: Response, message?: string, data?: any) {
    return res.status(200).json({
      success: true,
      error: false,
      message,
      data,
    });
  }

  static created(res: Response, message?: string, data?: any) {
    return res.status(201).json({
      success: true,
      error: false,
      message,
      data,
    });
  }

}
