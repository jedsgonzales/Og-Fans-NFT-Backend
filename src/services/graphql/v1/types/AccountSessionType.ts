import { GraphQLEthereumWallet } from "@edenholdings/web3-libs";
import { GraphQLJSONObject } from "graphql-scalars";
import { Field, ObjectType } from "type-graphql";
import { AccountSession } from "../../../../lib/dynamodb/models/index";

@ObjectType('AccountSession')
export class AccountSessionType {
    private wrapped: AccountSession;

    @Field(() => GraphQLEthereumWallet)
    get ethWallet(){
        return this.wrapped.ethWallet;
    }

    @Field(() => String)
    get signHash(){
        return this.wrapped.signHash;
    }

    @Field(() => String)
    get secretHash(){
        return this.wrapped.secretHash;
    }

    @Field(() => String)
    get loginHash(){
        return this.wrapped.loginHash;
    }

    @Field(() => String)
    get sessionToken(){
        return this.wrapped.sessionToken;
    }

    @Field(() => String)
    get sessionTime(){
        return this.wrapped.sessionTime;
    }

    @Field(() => String)
    get displayName(){
        return this.wrapped.displayName;
    }

    @Field(() => GraphQLJSONObject, { defaultValue: {} })
    get userPref(){
        return this.wrapped.userPref;
    }

    constructor(wrap:AccountSession) {
        this.wrapped = wrap;
    }
}