import { Field, ObjectType } from "type-graphql";

@ObjectType('BuyDrop')
export class BuyDropType {

    @Field(() => String)
    buyData: string = "";

    @Field(() => String)
    price: string = '0';

    @Field(() => [String], { nullable: true })
    proof?: string[];

    constructor() {
        
    }
}
