import { Request } from "express";
import { AccountSession } from "../lib/dynamodb/models/user-account";

export interface AuthService {
    loadUserCredential: (req: Request) => Promise<AccountSession | false>;
}