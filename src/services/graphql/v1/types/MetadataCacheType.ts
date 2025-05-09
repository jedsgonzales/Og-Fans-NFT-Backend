import { Field, ObjectType } from "type-graphql";

import { GraphQLEthereumWallet } from "@edenholdings/web3-libs";
import { DropMetadata, Metadata, OGCelebMetadata, TokenMetadata, UserToken } from "../../../../lib/dynamodb/models/index";
import { GraphQLJSONObject } from "graphql-scalars";

@ObjectType('Metadata')
export class MetadataType {
    private wrapped:Metadata;

    @Field(() => String)
    get metadataId(){
        return this.wrapped.metadataId;
    }

    @Field(() => BigInt, { nullable: true })
    get tokenId(){
        return this.wrapped.tokenId;
    }

    @Field(() => BigInt, { nullable: true })
    get dropId(){
        return this.wrapped.dropId;
    }

    @Field(() => BigInt, { nullable: true })
    get ogId(){
        return this.wrapped.ogId;
    }

    @Field(() => String)
    get transactionHash(){
        return this.wrapped.transactionHash;
    }

    @Field(() => GraphQLEthereumWallet, { nullable: true })
    get owner(){
        return this.wrapped.owner;
    }

    @Field(() => GraphQLJSONObject, { defaultValue: {} } )
    get metadataContent(){
        if(this.wrapped.locked){
            return this.wrapped.lockedContent;
        }

        return this.wrapped.metadataContent;
    }

    @Field(() => BigInt)
    get lastUpdate(){
        return this.wrapped.syncDate;
    }

    constructor(wrap:Metadata) {
        this.wrapped = wrap;
    }
}

@ObjectType('DropMetadata')
export class DropMetadataType {
    private wrapped:DropMetadata;

    @Field(() => BigInt)
    get dropId(){
        return this.wrapped.dropId;
    }

    @Field(() => BigInt, { nullable: true })
    get ogId(){
        return this.wrapped.ogId;
    }

    @Field(() => String)
    get transactionHash(){
        return this.wrapped.transactionHash;
    }

    @Field(() => GraphQLJSONObject, { defaultValue: {} } )
    get metadataContent(){
        return this.wrapped.metadataContent;
    }

    constructor(wrap:DropMetadata) {
        this.wrapped = wrap;
    }
}

@ObjectType('OGCelebMetadata')
export class OGCelebMetadataType {
    private wrapped:OGCelebMetadata;

    @Field(() => BigInt)
    get ogId(){
        return this.wrapped.ogId;
    }

    @Field(() => String)
    get transactionHash(){
        return this.wrapped.transactionHash;
    }

    @Field(() => GraphQLJSONObject, { defaultValue: {} } )
    get metadataContent(){
        return this.wrapped.metadataContent;
    }

    constructor(wrap:OGCelebMetadata) {
        this.wrapped = wrap;
    }
}

@ObjectType('TokenMetadata')
export class TokenMetadataType {
    private wrapped:TokenMetadata;

    @Field(() => BigInt)
    get tokenId(){
        return this.wrapped.tokenId;
    }

    @Field(() => BigInt, { nullable: true })
    get dropId(){
        return this.wrapped.dropId;
    }

    @Field(() => BigInt, { nullable: true })
    get ogId(){
        return this.wrapped.ogId;
    }

    @Field(() => String)
    get metadataId(){
        return this.wrapped.metadataId;
    }

    @Field(() => String)
    get transactionHash(){
        return this.wrapped.transactionHash;
    }

    @Field(() => GraphQLEthereumWallet, { nullable: true })
    get owner(){
        return this.wrapped.owner;
    }

    @Field(() => GraphQLJSONObject, { defaultValue: {} } )
    get metadataContent(){
        if(this.wrapped.locked){
            return this.wrapped.lockedContent;
        }

        return this.wrapped.metadataContent;
    }

    constructor(wrap:TokenMetadata) {
        this.wrapped = wrap;
    }
}

@ObjectType('UserToken')
export class UserTokenType {
    private wrapped:UserToken;

    @Field(() => BigInt)
    get tokenId(){
        return this.wrapped.tokenId;
    }

    @Field(() => BigInt, { nullable: true })
    get dropId(){
        return this.wrapped.dropId;
    }

    @Field(() => BigInt, { nullable: true })
    get ogId(){
        return this.wrapped.ogId;
    }

    @Field(() => String)
    get transactionHash(){
        return this.wrapped.transactionHash;
    }

    @Field(() => GraphQLEthereumWallet, { nullable: true })
    get owner(){
        return this.wrapped.owner;
    }

    @Field(() => GraphQLJSONObject, { defaultValue: {} } )
    get metadataContent(){
        if(this.wrapped.locked){
            return this.wrapped.lockedContent;
        }

        return this.wrapped.metadataContent;
    }

    constructor(wrap:UserToken) {
        this.wrapped = wrap;
    }
}