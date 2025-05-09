import 'core-js';

import express from 'express';
import https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import passport from 'passport';
import { createClient } from 'redis';
import connectRedis from 'connect-redis';

import fs from 'fs';
import path from 'path';

import { LoadableService, MiddlewareChainMap, MiddlewareMap, ServiceConfig } from '../types';
import { getBunyanLogger, isDevelopment, isProduction, isTest } from '@edenholdings/web3-libs';
import { Server } from 'http';

// load ENV config before everything else
require('dotenv').config();

const env = process.env.NODE_ENV || 'production';

const logger = getBunyanLogger('main-service-api', { env });
const server = express();

const port = process.env.API_HTTP_PORT || 8080;
const isHttps = !!process.env.API_HTTPS_PORT && !!process.env.API_HTTPS_CERT && !!process.env.API_HTTPS_KEY;
const hasRedis = !!process.env.REDIS_HOST;

const middlewares: MiddlewareMap = {
  passport
}

const middlewareChains: MiddlewareChainMap = {
  public: [],
  authenticated: [],
  adminOnly: []
}

if (hasRedis) {
  logger.info(`Redis ENV are present. Will start a redis client to Host: ${process.env.REDIS_HOST} Port: ${process.env.REDIS_PORT || 6379}`);
}

const redisClient = hasRedis ? createClient({
  url: process.env.REDIS_HOST,
}) : undefined;

const loadAPIServices = (httpServer: Server) => {
  //load services.json
  logger.info("Loading service configuration...");
  const data = fs.readFileSync('./services.json').toString();

  const services = JSON.parse(data.toString());
  logger.info("Loaded service configuration, processing...");

  for (const key of Object.keys(services)) {
    logger.info("service item: ", key);

    try {
      const { require_path, enabled, mountPath, config }: ServiceConfig = services[key];

      logger.debug("service config: ", require_path, enabled, config);

      const { default: Service } = require(path.resolve(__dirname, require_path));

      logger.debug("Service", Service);

      const serviceInstance: LoadableService = !!config ? new Service(config) : new Service();

      const service = serviceInstance.createService({ expressApp: server, httpServer, middlewareChainMap: middlewareChains, middlewares });
      if (service) {
        server.use(mountPath, service);
      }

      logger.info("service registered", serviceInstance.serviceName(), serviceInstance.version());

    } catch (err) {
      logger.error("service startup failed", err);
    }
  }
}

/* build service middlewares **/

//cors
const corsWhiteList: string[] = [];
const loadCORS = () => {
  //logger.debug("Loading CORS configuration...");
  fs.readFile('./cors.json', (err, data) => {
    if (!err) {
      //logger.info("Loaded CORS configuration, processing...");
      try {
        const corsList: string[] = JSON.parse(data.toString());
        corsWhiteList.splice(0, corsWhiteList.length);
        corsWhiteList.push(...corsList);

        //logger.info("CORS whitelist", corsList);
      } catch (e) {
        logger.info("CORS configuration error", e);
      }
    } else {
      logger.debug("Failed to load CORS configuration", err);
    }
  });
}

// start inittializing express and its middlewares
server.use(cors({
  origin: (origin, callback: Function) => {
    logger.debug(`CORS List`, corsWhiteList);
    // logger.info(`CORS Origin`, origin);
    logger.debug(`CORS Dev or Test`, isDevelopment(env) || isTest(env));

    if (corsWhiteList.length === 0) {
      //depending whether its is dev or prod we will control this behavior
      //if it is dev/test, we will allow all
      if (isDevelopment(env) || isTest(env)) {
        callback(null, true);
        logger.debug('CORS Allowed');
        return;
      }
    }

    let hostOrigin = `${origin}`;
    hostOrigin = hostOrigin.indexOf('://') >= 0 ? hostOrigin.substring(hostOrigin.indexOf('://') + 3) : hostOrigin;
    hostOrigin = hostOrigin.indexOf('/') >= 0 ? hostOrigin.substring(0, hostOrigin.indexOf('/')) : hostOrigin;

    logger.debug(`CORS Origin`, hostOrigin);

    // otherwise, filter it by cors and block it by default
    if (hostOrigin === undefined || corsWhiteList.indexOf('*') >= 0 || corsWhiteList.indexOf(hostOrigin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Blocked by CORS'))
    }

  }
}));

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));

/* server.use((req, res, next) => {
  logger.debug('request body', req.headers.referer, req.body);
  logger.debug('request params', req.headers.referer, req.params);
  next();
}); */

server.use(session({
  secret: process.env.SESSION_SECRET || "changemysecret",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { maxAge: Number(process.env.DAY_EXPIRATION || 7), secure: isHttps },
  store: isProduction(env) ? (hasRedis ? new (connectRedis(session))({ client: redisClient, prefix: process.env.SESSION_NAMESPACE || 'user-sessions' }) : undefined) : undefined
}));
server.use(passport.initialize());
server.use(passport.session());

/* server.use((req, res, next) => {
  console.log("Incoming", req);
  next();
}) */

//load cors config
logger.debug("Loading CORS configuration...");
loadCORS();

// attach endpoint services
logger.debug("Loading service configuration...");

// listen
const app = server.listen(
  port,
  () => {
    logger.info(`Service listening at http://localhost:${port}`);
  }
);

logger.info(`HTTPS? ${isHttps}`);

// start https if configured
if (isHttps) {
  const API_HTTPS_CERT = process.env.API_HTTPS_CERT || false;
  const API_HTTPS_KEY = process.env.API_HTTPS_KEY || false;

  logger.debug('API_HTTPS_CERT', API_HTTPS_CERT);
  logger.debug('API_HTTPS_KEY', API_HTTPS_KEY);
  logger.debug('process.env.API_HTTPS_PORT', process.env.API_HTTPS_PORT);

  if (API_HTTPS_CERT && fs.existsSync(API_HTTPS_CERT) && API_HTTPS_KEY && fs.existsSync(API_HTTPS_KEY)) {
    try {
      logger.info('Creating HTTPS Service');
      https.createServer({
        cert: fs.readFileSync(path.resolve(API_HTTPS_CERT)),
        key: fs.readFileSync(path.resolve(API_HTTPS_KEY))
      }, server).listen(process.env.API_HTTPS_PORT || 443,
        () => {
          logger.info(`HTTPS Service Started @${process.env.API_HTTPS_PORT || 443}`);
        }
      );
    } catch (error) {
      logger.error("Error starting HTTPS service", error);
    }
  } else {
    logger.error("HTTPS Error: Cert and/or Cert Key Not Found. Skipping HTTPS");
  }

} else {
  logger.info("HTTPS not configured.");
}

loadAPIServices(app);

// refresh cors every CORS_REFRESH or 1 minute by default
setInterval(loadCORS, Number(process.env.CORS_REFRESH || 60000));

module.exports = app;