import { GraphQLEthereumWallet } from "@edenholdings/web3-libs";
import { Field, ObjectType } from "type-graphql";

import { ScheduleDropSellOff } from "../../../../lib/dynamodb/models/index";

@ObjectType('DropScheduleSellOff')
export class DropScheduleSellOffType {
    private wrapped: ScheduleDropSellOff;

    @Field(() => BigInt)
    get dropId(){
        return this.wrapped.dropId;
    }

    @Field(() => BigInt)
    get dropEventTime(){
        return this.wrapped.dropEventTime;
    }

    @Field(type => GraphQLEthereumWallet)
    get dropBuyer(){
        return this.wrapped.dropBuyer;
    }

    @Field(() => GraphQLEthereumWallet, { nullable: true })
    get dropSigner(){
        return this.wrapped.dropSigner;
    }

    @Field(() => BigInt)
    get dropTokenId(){
        return this.wrapped.dropTokenId;
    }

    constructor(wrap:ScheduleDropSellOff) {
        this.wrapped = wrap;
    }
}