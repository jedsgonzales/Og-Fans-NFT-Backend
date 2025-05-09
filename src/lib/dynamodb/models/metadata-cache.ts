import { ADDRESS_0, DynamoDbTable, DynamoDbTableAttr, DynamoDbTableHash, DynamoDbTableRange, IDynamoDbTable, GraphQLEthereumWallet } from "@edenholdings/web3-libs";
import { DateTime } from "luxon";

/* @DynamoDbTable('OGMetadataCache')
export class MetadataCache {
    @DynamoDbTableHash()
    metadataURI: string = "";

    @DynamoDbTableRange()
    recordSubId: string = "";

    @DynamoDbTableAttr()
    dropId: number = 0;

    @DynamoDbTableAttr()
    ogId: number = 0;

    @DynamoDbTableAttr()
    basePrice: string = '0';

    @DynamoDbTableAttr()
    metadataCID: string = "";

    @DynamoDbTableAttr()
    metadataContent: string = "{}";

    @DynamoDbTableAttr()
    lockedContent?: string = "{}";

    @DynamoDbTableAttr()
    metadataFEContent: string = "{}";

    @DynamoDbTableAttr()
    lastUpdate: number = 0;

    @DynamoDbTableAttr()
    revealTime: number = 0;

    constructor(tokenUri: string = "", dropId: number = 0, ogId: number = 0) {
        this.metadataURI = tokenUri;
        this.dropId = dropId;
        this.ogId = ogId;
    }

    beforeLoad() {
        // this.buildSubId();
    }

    beforeSave() {
        this.buildSubId();
    }

    buildSubId() {
        if (!this.recordSubId && this.ogId && this.dropId) {
            this.recordSubId = `OG#${this.ogId}/DROP#${this.dropId}`;
        } else if (!this.recordSubId) {
            throw new Error('Insufficient data to build sort ID.');
        }
    }
}

export interface MetadataCache extends IDynamoDbTable<any> { } */

type MetadataType = 'Token' | 'DropCollection' | 'OGCeleb' | 'Contract';

@DynamoDbTable('OGMetadata')
export class Metadata {
    @DynamoDbTableHash()
    metadataId: string;

    @DynamoDbTableRange()
    metadataType: MetadataType; // dont supply default value when column is shared across models

    @DynamoDbTableAttr()
    metadataContent: string = "{}";

    @DynamoDbTableAttr()
    lockedContent: string = "{}";

    @DynamoDbTableAttr()
    transactionHash: string = ''; // minting block number

    @DynamoDbTableAttr()
    owner: string = ADDRESS_0;

    @DynamoDbTableAttr()
    locked: boolean = true;

    @DynamoDbTableAttr()
    dropId?: number;

    @DynamoDbTableAttr()
    ogId?: number;

    @DynamoDbTableAttr()
    tokenId?: number;

    @DynamoDbTableAttr()
    syncDate: number = 0;

    constructor(metadataId: string = "", type: MetadataType = 'Token') {
        this.metadataId = metadataId;
        this.metadataType = type;

        console.log('Type', type, this.metadataType);
    }

    beforeSave() {
        if (this.syncDate == 0) {
            this.syncDate = Math.round(DateTime.utc().toSeconds());
        }

        console.log('Save Type', this.metadataType);
    }
}

export interface Metadata extends IDynamoDbTable<any> { }

@DynamoDbTable({ tableName: 'OGMetadata', indexName: 'DropCollectionMetadata' })
export class DropMetadata {
    @DynamoDbTableHash()
    dropId: number;

    @DynamoDbTableRange()
    metadataType: MetadataType = "DropCollection";

    @DynamoDbTableAttr()
    metadataContent: string = "{}";

    @DynamoDbTableAttr()
    transactionHash: string = ''; // minting block number

    @DynamoDbTableAttr()
    ogId?: number;

    constructor(dropId: number = 0) {
        this.dropId = dropId;
        this.metadataType = 'DropCollection';
    }

    beforeLoad() {
        if (this.dropId === 0) {
            throw new Error('Need ID to Load');
        }
    }
}

export interface DropMetadata extends IDynamoDbTable<any> { }

@DynamoDbTable({ tableName: 'OGMetadata', indexName: 'OGCelebMetadata' })
export class OGCelebMetadata {
    @DynamoDbTableHash()
    ogId: number;

    @DynamoDbTableRange()
    metadataType: MetadataType = "OGCeleb";

    @DynamoDbTableAttr()
    metadataContent: string = "{}";

    @DynamoDbTableAttr()
    transactionHash: string = ''; // minting block number

    constructor(ogId: number = 0) {
        this.ogId = ogId;
        this.metadataType = 'OGCeleb';
    }

    beforeLoad() {
        if (this.ogId === 0) {
            throw new Error('Need ID to Load');
        }
    }
}

export interface OGCelebMetadata extends IDynamoDbTable<any> { }

@DynamoDbTable({ tableName: 'OGMetadata', indexName: 'OGTokenMetadata' })
export class TokenMetadata {
    @DynamoDbTableHash()
    tokenId: number;

    @DynamoDbTableRange()
    metadataType: MetadataType = "Token";

    @DynamoDbTableAttr()
    metadataContent: string = "{}";

    @DynamoDbTableAttr()
    lockedContent?: string = "{}";

    @DynamoDbTableAttr()
    transactionHash: string = ''; // minting block number

    @DynamoDbTableAttr()
    ogId?: number;

    @DynamoDbTableAttr()
    dropId?: number;

    @DynamoDbTableAttr()
    metadataId: string = "";

    @DynamoDbTableAttr()
    owner: string = "";

    @DynamoDbTableAttr()
    locked: boolean = true;

    constructor(tokenId: number = 0) {
        this.tokenId = tokenId;
        this.metadataType = 'Token';
    }

    beforeLoad() {
        if (this.tokenId === 0) {
            throw new Error('Need ID to Load');
        }
    }
}

export interface TokenMetadata extends IDynamoDbTable<any> { }

@DynamoDbTable({ tableName: 'OGMetadata', indexName: 'TokenMetadataByOwner' })
export class UserToken {
    @DynamoDbTableHash()
    owner: string;

    @DynamoDbTableRange()
    tokenId: number = 0;

    @DynamoDbTableAttr()
    metadataContent: string = "{}";

    @DynamoDbTableAttr()
    lockedContent?: string = "{}";

    @DynamoDbTableAttr()
    transactionHash: string = ''; // minting block number

    @DynamoDbTableAttr()
    ogId?: number;

    @DynamoDbTableAttr()
    dropId?: number;

    @DynamoDbTableAttr()
    locked: boolean = true;

    constructor(owner: string = '') {
        this.owner = owner.toLowerCase();
    }

    beforeLoad() {
        if (this.owner === '') {
            throw new Error('UserToken: Need Owner ID to Load');
        }
    }
}

export interface UserToken extends IDynamoDbTable<any> { }