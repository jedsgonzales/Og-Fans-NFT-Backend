//session EIP712 structure

import { MessageTypes, TypedMessage } from "@metamask/eth-sig-util";
import Web3 from "web3";

export const SessionDomain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" }
];

export const SessionMessage = [
    { name: "address", type: "address" },
    { name: "signed", type: "string" },
    { name: "message", type: "string" }
];

export interface SessionParams {
    address: string;
    signed: string;
    message: string;
}

export const SESSION_DOMAIN = {
    name: process.env.WEB3_SESSION_DOMAIN_NAME || "EdenHoldings.Web3.Domain",
    version: process.env.WEB3_SESSION_DOMAIN_VERS || "1.0"
};

export const createSessionTokenParams = (sessionParams: SessionParams): TypedMessage<MessageTypes> => {
    return {
        types: {
            EIP712Domain: SessionDomain,
            Message: SessionMessage,
        },
        domain: SESSION_DOMAIN,
        primaryType: "Message",
        message: { ...sessionParams }
    }
}
