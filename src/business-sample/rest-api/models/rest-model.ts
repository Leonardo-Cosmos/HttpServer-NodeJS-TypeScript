export interface BaseRequest {
  messageId: string;
}

export interface BaseResponse {
  messageId: string;
}

export class SampleRequest implements BaseRequest {
  constructor(
    public messageId: string,
    public name: string,
  ) { }
}

export class SampleResponse implements BaseResponse {
  constructor(
    public messageId: string,
    public number: number,
  ) { }
}
