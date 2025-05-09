import { queryMappedClass } from "@edenholdings/web3-libs";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Arg, Authorized, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";
import { UserToken } from "../../../../lib";
import { RequestContext } from "../../../../types";
import { UserNftScope } from "../enums/UserNftQueryScope";
import { UserTokenType } from "../types/MetadataCacheType";

@Resolver()
export default class InventoryResolver {
    @Query(returns => [UserTokenType]!)
    async getUserNFTs(
        @Arg("Account") account: string,
        @Arg("Scope", type => UserNftScope, { defaultValue: UserNftScope.ALL }) listScope: UserNftScope
    ) {
        let queryParams: Omit<DocumentClient.QueryInput, "TableName"> = {};
        
        switch(listScope){
            case UserNftScope.LOCKED:
                queryParams = {
                    KeyConditionExpression: "#001 = :001",
                    FilterExpression: "#002 = :002",
                    ExpressionAttributeValues: {
                        ":001": account.toLocaleLowerCase(),
                        ":002": true,
                    },
                    ExpressionAttributeNames: {
                        "#001": 'owner',
                        "#002": 'locked',
                    }
                };
                break;
            case UserNftScope.OPENED:
                queryParams = {
                    KeyConditionExpression: "#001 = :001",
                    FilterExpression: "#002 = :002",
                    ExpressionAttributeValues: {
                        ":001": account.toLocaleLowerCase(),
                        ":002": false,
                    },
                    ExpressionAttributeNames: {
                        "#001": 'owner',
                        "#002": 'locked',
                    }
                };
                break;
            default: // ALL
                queryParams = {
                    KeyConditionExpression: "#001 = :001",
                    ExpressionAttributeValues: {
                        ":001": account.toLocaleLowerCase(),
                    },
                    ExpressionAttributeNames: {
                        "#001": 'owner',
                    }
                };
                break;
        }

        const result: UserTokenType[] = [];

        const i = queryMappedClass(queryParams, UserToken);
        for await(const userToken of i){
            result.push(new UserTokenType(userToken));
        }

        // sort from newest to oldest
        result.sort((s1, s2) => Number(s2.tokenId) - Number(s1.tokenId));

        return result;
    }

    @Mutation()
    @Authorized()
    async updateUserNfts(
        @Arg("IDs", type => [String]!, { nullable: false }) ids: string[], // for easy conversion to BN
        @Ctx() ctx: RequestContext
    ){
        // this is a passive action
    }
}