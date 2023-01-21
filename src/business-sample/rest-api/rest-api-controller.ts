import * as errors from 'restify-errors';
import { SampleRequest, SampleResponse } from "./models/rest-model";


const MODULE = 'sample/controller';

export async function handleSample(sampleReq: SampleRequest, baseLog: any): Promise<SampleResponse> {

  const log = baseLog.child({ module: MODULE, method: 'handleInboundOpenMessage' });
  
  if (!sampleReq?.messageId) {
    log.info('Invalid request without message ID');
    throw new errors.BadRequestError('Missing messageId');
  }

  const sampleRes : SampleResponse = {
    messageId: sampleReq.messageId,
    number: (sampleReq.name ?? "").length
  }

  return sampleRes;
}