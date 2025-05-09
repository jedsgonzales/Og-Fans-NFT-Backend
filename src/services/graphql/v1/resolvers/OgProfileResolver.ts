import { getBunyanLogger, scanMappedClass } from "@edenholdings/web3-libs";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Arg, Int, Query, Resolver } from "type-graphql";
import { OGProfile } from "../../../../lib";
import OgProfileType from "../types/OgProfileType";

@Resolver()
export default class OgProfileResolver {
    private logger;

    constructor(){
        this.logger = getBunyanLogger('og-profile-resolver');
    }

    @Query(returns => [OgProfileType])
    async getProfile(
        @Arg("OGID", () => Int, { nullable: true }) ogID: number | null
    ) {
        const result: OgProfileType[] = [];

        if(ogID && ogID !== 0){
            const profile = new OGProfile(ogID);
            await profile.load();
            result.push(new OgProfileType(profile));
        } else {
            const scanParams: Omit<DocumentClient.ScanInput, "TableName"> = {
                FilterExpression: "attribute_not_exists(#001) OR #001 = :001",
                ExpressionAttributeValues: {
                    ":001": false,
                },
                ExpressionAttributeNames: {
                    "#001": 'disabled',
                }
            };
            const i = scanMappedClass(scanParams, OGProfile);
            for await(const profile of i){
                result.push(new OgProfileType(profile));
            }
        }

        return result;
    }
}