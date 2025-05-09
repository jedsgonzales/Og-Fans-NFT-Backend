import "reflect-metadata";
import BN from "bn.js";

import { getBunyanLogger, getContract, getContractDeployAddress, getEthereumConfig, web3CallThrottle } from "@edenholdings/web3-libs";


export type Web3BN = BN;

const OGID_SHIFT = 160n;
const DROP_TS_SHIFT = 120n;
const REVEAL_TS_SHIFT = 80n;
const WHITELIST_TS_SHIFT = 40n;
const DROPCOUNT_SHIFT = 24n;
const MINT_LIMIT_SHIFT = 16n;

// data masks
const OGID_MASK = BigInt(0xffffffffff) << DROP_TS_SHIFT;
const DROP_TS_MASK = BigInt(0xffffffffff) << DROP_TS_SHIFT;
const REVEAL_TS_MASK = BigInt(0xffffffffff) << REVEAL_TS_SHIFT;
const WHITELIST_TS_MASK = BigInt(0xffffffffff) << WHITELIST_TS_SHIFT;
const DROPCOUNT_MASK = BigInt(0xffff) << DROPCOUNT_SHIFT;
const MINT_LIMIT_MASK = BigInt(0xff) << MINT_LIMIT_SHIFT;
const SOLD_COUNT_MASK = BigInt(0xffff);

interface CollectionInfo {
    // ogListId: Web3BN;
    mintPrice: Web3BN;
    paused: boolean;
    soldOut: boolean;
    properties: Web3BN;
}

const logger = getBunyanLogger('ogfans-api-lib');

export class DropCollectionInfo {
    // ogListId: number = 0;
    mintPrice: bigint = 0n;
    paused: boolean = false;
    soldOut: boolean = false;
    properties: bigint = 0n;

    constructor(info: CollectionInfo){
        // this.ogListId = number(info.ogListId.toString());
        this.mintPrice = BigInt(info.mintPrice.toString());
        this.properties = BigInt(info.properties.toString());
        this.paused = info.paused;
        this.soldOut = info.soldOut;
    }

    getOGID(): number {
        if(this.properties === 0n){
            return 0;
        } else {
            return Number(((this.properties & OGID_MASK) >> OGID_SHIFT).toString());
        }
    }

    getDropTime(): number {
        if(this.properties === 0n){
            return 0;
        } else {
            return Number(((this.properties & DROP_TS_MASK) >> DROP_TS_SHIFT).toString());
        }
    }

    getRevealTime(): number {
        if(this.properties === 0n){
            return 0;
        } else {
            return Number(((this.properties & REVEAL_TS_MASK) >> REVEAL_TS_SHIFT).toString());
        }
    }

    getWhitelistTime(): number {
        if(this.properties === 0n){
            return 0;
        } else {
            return Number(((this.properties & WHITELIST_TS_MASK) >> WHITELIST_TS_SHIFT).toString());
        }
    }

    getDropCount(): number {
        if(this.properties === 0n){
            return 0;
        } else {
            return Number(((this.properties & DROPCOUNT_MASK) >> DROPCOUNT_SHIFT).toString());
        }
    }

    getMintLimit(): number {
        if(this.properties === 0n){
            return 0;
        } else {
            return Number(((this.properties & MINT_LIMIT_MASK) >> MINT_LIMIT_SHIFT).toString());
        }
    }

    getSoldCount(): number {
        if(this.properties === 0n){
            return 0;
        } else {
            return Number((this.properties & SOLD_COUNT_MASK).toString());
        }
    }
}
export const getDropInfo = async (dropId:number): Promise<DropCollectionInfo | false> => {
    const contractName = process.env.OGF_CONTRACT || 'OGFans';
    
    const chainConfig = getEthereumConfig( process.env.PRIMARY_WEB3_CONNECTION || 'eth-rinkeby' );
    const contractDeploymentInfo = getContractDeployAddress(contractName, chainConfig.networkId);
    const { contract, web3, json } = getContract(contractName, chainConfig, {}, contractDeploymentInfo?.address);

    const dropInfo = await web3CallThrottle(async () => {
        return await contract.methods.getDropInfo(dropId.toString()).call().catch((error: any) => {
            logger.error('Get Drop Info error', error);
            return false;
        });
    });

    (web3.currentProvider || web3.givenProvider).engine?.stop();

    if(dropInfo)
        return new DropCollectionInfo(dropInfo);
    else
        return false;
}

export * from "./dynamodb/models";
export * from "./web3";