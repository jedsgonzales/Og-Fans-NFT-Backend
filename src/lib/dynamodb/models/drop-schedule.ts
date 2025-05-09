import { DateTime } from "luxon";
import MerkleTree from "merkletreejs";
import { utils } from "ethers";

import { DynamoDbTable, DynamoDbTableAttr, DynamoDbTableHash, DynamoDbTableRange, IDynamoDbTable, GraphQLEthereumWallet } from "@edenholdings/web3-libs";
import Web3 from "web3";
import { OGProfile } from "./profile";

export const DROP_SCHEDULE_INFO = "CollectionDropInfo";
export const DROP_SCHEDULE_SELLOFF = "DropScheduleSellOff";
export const DROP_ITEM = "DropNftItem";

/* const DropScheduleInfoTypeValues = [ DROP_SCHEDULE_INFO, DROP_SCHEDULE_SELLOFF ] as const;
export type DropScheduleInfoType = typeof DropScheduleInfoTypeValues[number];

const DropScheduleTransactionTypeValues = [ DROP_SCHEDULE_SELLOFF ] as const;
export type DropScheduleTransactionType = typeof DropScheduleTransactionTypeValues[number]; */

@DynamoDbTable('OGDropSchedules') 
export class ScheduleDropInfo {
    @DynamoDbTableHash()
    dropId: number;

    @DynamoDbTableRange()
    dropSubId: string;

    
    @DynamoDbTableAttr()
    dropEvent: string = "DropCreated";

    @DynamoDbTableAttr()
    dropEventTime?: number; // timestamp of creation event

    @DynamoDbTableAttr()
    ogListId: number = 0; // associated celebrity ID

    @DynamoDbTableAttr()
    dropScheduleTime: number = 0; // drop launch time

    @DynamoDbTableAttr()
    dropRevealTime?: number; // timestamp before exposing real metadata

    @DynamoDbTableAttr()
    dropWhitelistTime?: number; // timestamp after schedule that is allowed to whitelisted

    @DynamoDbTableAttr()
    dropMintingPrice:string = '100000000000000000';

    @DynamoDbTableAttr()
    dropMintingLimit:number = 5;

    @DynamoDbTableAttr()
    dropSellOffs:number = 0;

    @DynamoDbTableAttr()
    dropAllocation:number = 0;

    @DynamoDbTableAttr()
    dropScheduler?:string;

    @DynamoDbTableAttr()
    dropIsPaused:boolean = false;

    @DynamoDbTableAttr()
    dropIsSoldOut:boolean = false;

    @DynamoDbTableAttr()
    dropPausedOn?:number;

    @DynamoDbTableAttr()
    dropIsSoldOutOn?:number;

    // user-facing details
    @DynamoDbTableAttr()
    collectionName?:string;

    @DynamoDbTableAttr()
    collectionDetails?:string;

    @DynamoDbTableAttr()
    collectionOgName?:string;

    @DynamoDbTableAttr()
    collectionOgImage?:string;

    @DynamoDbTableAttr()
    collectionImage?:string;

    @DynamoDbTableAttr()
    collectionDetailMarkup?:string;

    @DynamoDbTableAttr()
    publishCollection?:boolean;

    constructor(dropId: number = 0){
        this.dropId = dropId;
        this.dropSubId = `${DROP_SCHEDULE_INFO}#${dropId}`;
    }

    get startTimestamp(){
        return DateTime.fromSeconds(Number(this.dropWhitelistTime || this.dropScheduleTime), { zone: 'utc' }).toISO();
    }

    ogProfile?: OGProfile;
    async loadOgProfile(){
        if(this.ogListId > 0 && !this.ogProfile){
            this.ogProfile = new OGProfile(this.ogListId);
            await this.ogProfile.load();
        }
    }
}

export interface ScheduleDropInfo extends IDynamoDbTable<any> {}

/** record sell offs here */
@DynamoDbTable('OGDropSchedules')
export class ScheduleDropSellOff {
    @DynamoDbTableHash()
    dropId: number;

    @DynamoDbTableRange()
    dropSubId: string;

    
    @DynamoDbTableAttr()
    dropEvent: string = "DropSold";

    @DynamoDbTableAttr()
    dropEventTime?: string;

    @DynamoDbTableAttr()
    dropBuyer?:string;

    @DynamoDbTableAttr()
    dropSigner?:string;

    @DynamoDbTableAttr()
    dropTokenId:number;

    @DynamoDbTableAttr()
    dropTokenURI:string = '';

    constructor(dropId: number = 0, dropTokenId:number = 0) {
        this.dropId = dropId;
        this.dropTokenId = dropTokenId;

        this.dropSubId = `${DROP_SCHEDULE_SELLOFF}#${dropId}#${dropTokenId}`;
    }
}

export interface ScheduleDropSellOff extends IDynamoDbTable<any> {}

@DynamoDbTable('OGDropSchedules')
export class ScheduleDropWhitelist {
    @DynamoDbTableHash()
    dropId: number;

    @DynamoDbTableRange()
    dropSubId: string = "WHITELIST"; // only one of this record should exist

    @DynamoDbTableAttr({ castTo: { type: 'Array', memberType: String } })
    whitelistAddress: string[] = [];

    @DynamoDbTableAttr({ castTo: { type: 'Array', memberType: String } })
    whitelistNodes: string[] = [];

    @DynamoDbTableAttr()
    whitelistRoot?: string;

    constructor(dropId: number = 0) {
        this.dropId = dropId;
    }

    merkleTree?: MerkleTree;

    computeMerkleTree() {
        this.whitelistNodes = this.whitelistAddress.map(w => utils.keccak256( w ));
        this.merkleTree = new MerkleTree(this.whitelistNodes, utils.keccak256, { sortPairs: true, sortLeaves: true });
        this.whitelistRoot = this.merkleTree.getHexRoot();
    }

    addWhitelist(address: string){
        const wallet = Web3.utils.toChecksumAddress(address);

        if(this.whitelistAddress.includes(wallet)){
            this.whitelistAddress.push(wallet);

            // invalidate merkle tree to force recalculation
            this.merkleTree = undefined;
        }
    }

    removeWhitelist(address: string){
        const wallet = Web3.utils.toChecksumAddress(address);

        const index = this.whitelistAddress.indexOf(wallet);
        if(index >= 0){
            this.whitelistAddress.splice(index, 1);

            // invalidate merkle tree to force recalculation
            this.merkleTree = undefined;
        }
    }

    isWhitelisted(address: string){
        const wallet = Web3.utils.toChecksumAddress(address);
        return this.whitelistAddress.indexOf(wallet) >= 0;
    }

    getMerkleTree(){
        if(!this.merkleTree){
            this.computeMerkleTree();
        }

        return this.merkleTree;
    }

    getRootHash(){
        return this.getMerkleTree()?.getRoot();
    }

    getHexProof(address: string){
        const wallet = Web3.utils.toChecksumAddress(address);

        return this.getMerkleTree()?.getHexProof( utils.keccak256(wallet) );
    }

    beforeSave(){
        this.computeMerkleTree();
    }

    afterLoad(){
        this.computeMerkleTree();
    }

    verify(address: string){
        if(!this.merkleTree){
            this.computeMerkleTree();
        }

        const wallet = Web3.utils.toChecksumAddress(address);
        const left = utils.keccak256( wallet );
        const proof = this.merkleTree?.getHexProof( left ) || [];
        return MerkleTree.verify(proof, left, this.getRootHash() || "");
    }
}

export interface ScheduleDropWhitelist extends IDynamoDbTable<any> {}
