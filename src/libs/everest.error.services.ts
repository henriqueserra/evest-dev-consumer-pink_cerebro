import { AxiosError } from 'axios';
import { QueryFailedError } from 'typeorm';

export class EverestError extends Error {
  public badRequest: any;
  constructor(message: string, badRequest?: any) {
    super(message);
    this.badRequest = badRequest;
  }
}

export class EverestErrorServices {
  constructor() {}

  static getError(error: any) {
    if (error instanceof QueryFailedError) {
      return `QueryFailedError: ${error?.driverError?.detail || error?.driverError?.message}`;
    }
    if (error instanceof AxiosError) {
      if (error?.code === 'ECONNRESET') return `AxiosError: Connection Reset - Message:${error.message}`;
      if (error?.code === 'ECONNABORTED') return `AxiosError: Timeout - Message:${error.message}`;
      if (error?.code === 'ERR_BAD_REQUEST')
        return `AxiosError: Status:${error?.response?.status} - Bad Request - Message:${
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          JSON.stringify(error?.response?.data || error?.response)
        }`;
      if (error?.response?.data?.message?.includes('Try again later'))
        return `AxiosError: Status:${error?.response?.status} - Message:${
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          JSON.stringify(error?.response?.data || error?.response)
        }`;
      return `AxiosError: Status:${error?.response?.status} - Message:${
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        JSON.stringify(error?.response?.data || error?.response)
      }`;
    }
    return error.message;
  }
}
