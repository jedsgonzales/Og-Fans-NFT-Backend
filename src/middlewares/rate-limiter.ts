import redis from "redis";
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { NextFunction, Response, Request } from "express";
import { pause } from "@edenholdings/web3-libs";

const hasRedis = !!process.env.REDIS_HOST;
const rateLimitPerSec = Number(process.env.REQ_RATE_LIMIT || '5');

const redisClient = hasRedis ? redis.createClient({
    url: process.env.REDIS_HOST,
}) : undefined;

const rateLimiter = redisClient ? new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate-limit',
    points: rateLimitPerSec, // requests
    duration: 1, // per 1 second by sessionID + url path
}) : new RateLimiterMemory({
    points: rateLimitPerSec,
    duration: 1,
});

const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
    rateLimiter.consume(`${req.ip}<>${req.sessionID}<>${req.path}`)
        .then(() => {
            // force throttle 100ms, XDDD
            pause(100).then(() => {
                next();
            });
        })
        .catch(() => {
            res.status(429).send('Too Many Requests');
        });
};

module.exports = rateLimiterMiddleware;