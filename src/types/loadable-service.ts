import { Express } from "express";
import { MiddlewareMap, MiddlewareChainMap } from ".";
import { Server } from 'http';

export interface ServiceParams {
  expressApp:Express;
  httpServer:Server;
  middlewareChainMap:MiddlewareChainMap;
  middlewares?:MiddlewareMap;
}

export interface LoadableService {
  serviceName:() => string;
  version:() => number;
  hotPlugControlFile:() => string;
  createService:(params:ServiceParams) => Express | false;
}
