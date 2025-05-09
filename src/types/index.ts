import { Request, Response } from "express";

export * from "./graphql-manifest";
export * from "./loadable-service";
export * from "./service-config";

export type ConnectMiddleware = (req:Request, resp:Response, next:Function) => any;

export interface MiddlewareMap {
  [id:string]: any;
}

export interface MiddlewareChainMap {
  public: ConnectMiddleware[],
  authenticated: ConnectMiddleware[],
  adminOnly: ConnectMiddleware[]
}

// express related
/* declare global {
  namespace Express {
      interface Request {
          session: session.Session & Partial<session.SessionData> & {
            userAuthId?:string;
          };
      }
  }
} */

export interface ClassConstructor<T> {
    new (...args: any[]): T;
  }
  
  export interface EmptyConstructor<T> {
    new (): T;
  }
  
  export interface StringMap {
    [key: string]: string;
  }
  
  export interface NumberMap {
    [key: string]: number;
  }

  export interface UserLike {
    id:string;
    firstName?:string;
    lastName?:string;
    displayName?:string;
    roles?:string[];
  }
  
  export interface RequestContext {
    user?: UserLike | false;
  }