export default {
  port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT) : undefined,
  host: process.env.REDIS_HOST,
  
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  database: process.env.REDIS_DATABASE ? Number.parseInt(process.env.REDIS_DATABASE) : undefined,

  keyPrefix: process.env.REDIS_KEY_PREFIX,
};
