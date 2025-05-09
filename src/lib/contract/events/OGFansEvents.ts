import { Web3BN } from "../..";

export interface DropCreatedEvent {
    dropId: Web3BN;
    ogId: Web3BN;
    dropName: string;
    dropCount: Web3BN;
    dropTime: Web3BN;
    whitelistTime: Web3BN;
    revealTime: Web3BN;
    mintPrice: Web3BN;
    mintLimit: Web3BN;
    scheduler: string;
}

export interface DropMinted {
    buyer: string;
    dropId: Web3BN;
    ids: Web3BN[];
    ogIndexes: Web3BN[];
    // uris: string[];
    sellCount: Web3BN;
    locked: boolean;
}

export interface DropPauseStatusEvent {
    dropId: Web3BN;
    isPaused: boolean;
    changedBy: string;
}

export interface OGProfileEvent {
    ogId: Web3BN;
    ogName: string;
}

export interface TokenUnlocked {
    tokenId: Web3BN;
}