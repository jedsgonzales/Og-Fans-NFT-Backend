import { Request } from "express";

import { getBunyanLogger, TokenId } from "@edenholdings/web3-libs";
import { AuthService } from "../../types/auth-service";

// type auto-merging for session vars
declare module 'express-session' {
  export interface SessionData {
    userAuthId: TokenId;
  }
}

const logger = getBunyanLogger('api-auth', { env: process.env.NODE_ENV });

const adminList: string[] = [];

export const isAdmin = (userId: string) => {
  return adminList.includes(userId);
}

export const getAdmins = () => adminList;
export const addAdmin = (...userIds: string[]) => {
  userIds.forEach(userId => {
    if (!adminList.includes(userId)) {
      adminList.push(userId);
    }
  });
}
export const delAdmin = (userId: string) => {
  const index = adminList.indexOf(userId);

  if (index >= 0) {
    adminList.splice(index, 1);
  }
}

export const ACCOUNT_NOT_PERMITTED = "Not Permitted.";
export const LOGIN_EXPIRED = "Unauthorized";
export const UNEXPECTED_ERROR = "Unexpected Error. Try Again Later.";

const authModules: {
  [name:string]: AuthService;
} = {};

export const registerAuthModule = (name:string, service:AuthService) => {
  authModules[name] = service;
}

export const loadUserCredential = async (req: Request) => {
  for(const serviceName in authModules){
    const service = authModules[serviceName];
    const user = await service.loadUserCredential(req);

    if(user){
      return user;
    }
  }

  return false;
}