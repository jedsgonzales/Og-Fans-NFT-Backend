import { GraphQLEthereumWallet } from "@edenholdings/web3-libs";
import { Field, ObjectType } from "type-graphql";
import { AccountData } from "../../../../lib/index";

@ObjectType('AccountData')
export class AccountDataType {
    private wrapped: AccountData;

    @Field(() => GraphQLEthereumWallet)
    get ethWallet(){
        return this.wrapped.ethWallet;
    }

    @Field(() => String, {nullable: true})
    get firstName(){
        return this.wrapped.firstName;
    }

    @Field(() => String, {nullable: true})
    get lastName(){
        return this.wrapped.lastName;
    }

    @Field(() => String, {nullable: true})
    get displayName(){
        return this.wrapped.displayName;
    }

    @Field(() => String)
    get id():string {
        return this.ethWallet;
    }

    constructor(wrap:AccountData) {
        this.wrapped = wrap;
    }
}