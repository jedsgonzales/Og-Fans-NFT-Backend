import { Authorized, Query, Resolver } from "type-graphql";

@Resolver()
export default class ContractResolver {
    @Query(returns => String!)
    @Authorized()
    async createBuyDropCmd() {
        const result:string = '';

        return result;
    }
}