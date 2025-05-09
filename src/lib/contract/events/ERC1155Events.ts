import { Web3BN } from "../..";

export interface TransferBatchEvent {
    operator: string;
    from: string;
    to: string;
    ids: Web3BN[];
    values: Web3BN[];
}

export interface TransferSingleEvent {
    operator: string;
    from: string;
    to: string;
    id: Web3BN;
    value: Web3BN;
};