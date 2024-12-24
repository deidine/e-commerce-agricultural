import { Redis } from "ioredis";

require("dotenv").config();
const redisClient = (): string => {
  
  if (process.env.REDIS_URL) {
    console.log("Redis Connected");
    return process.env.REDIS_URL;
  } else {
    throw new Error("REDIS_URL is not set");
  }
}; 
export const redis = new Redis("redis://127.0.0.1:6379");