import * as errors from 'restify-errors';
import * as moment from 'moment-timezone';

moment.tz.setDefault('Asia/Hongkong');
const prettyPrint = (process.env.LOG_PRETTY_PRINT === 'true');

export default {
  level: process.env.LOG_LEVEL ?? 'info',
  prettyPrint: prettyPrint,
  timestamp: prettyPrint ? () => {
    let timeStr = moment.default(Date.now()).format('YYYY-MM-DD HH:mm:ss.SSS');
    return `,"time":"${timeStr}"`;
  } : true,
  serializers: {
    err: errors.bunyanSerializer,
  }
};
