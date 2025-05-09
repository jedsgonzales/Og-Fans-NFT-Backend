import { getBunyanLogger, queryMappedItem, scanMappedClass, Wallet } from "@edenholdings/web3-libs";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { utils } from "ethers";
import { BigIntResolver } from "graphql-scalars";
import { DateTime } from "luxon";
import { Arg, Authorized, Ctx, ID, Int, Query, Resolver } from "type-graphql";
import Web3 from "web3";
import { createBuyString } from "../../../../contract/index";
import { ScheduleDropInfo, ScheduleDropWhitelist } from "../../../../lib/dynamodb/models";
import { RequestContext } from "../../../../types/index";
import DropTokenProvider from "../../../singletons/drop-token-provider";
import { DropScheduleQueryScope } from "../enums/DropScheduleQueryScope";
import { BuyDropType } from "../types/BuyDropType";
import ScheduleDropInfoType from "../types/DropScheduleInfoType";


@Resolver()
export default class ScheduleDropResolver {
    private logger;

    constructor(){
        this.logger = getBunyanLogger('sched-drop-resolver');
    }

    @Query(returns => [ScheduleDropInfoType])
    async getDropSchedules(
        @Arg("OGID", { nullable: true, defaultValue: '0' }) ogID: string,
        @Arg("DropScope", type => DropScheduleQueryScope, { defaultValue: DropScheduleQueryScope.ALL }) dropScope: DropScheduleQueryScope
        
    ) {
        const result:ScheduleDropInfoType[] = [];

        let scanParams: Omit<DocumentClient.ScanInput, "TableName"> = {};

        switch(dropScope){
            case DropScheduleQueryScope.ACTIVE:
                scanParams = {
                    FilterExpression: "#001 = :001 AND #002 = :002 AND #003 < :003",
                    ExpressionAttributeValues: {
                        ":001": false,
                        ":002": false,
                        ":003": Math.round(DateTime.utc().toSeconds()),
                    },
                    ExpressionAttributeNames: {
                        "#001": 'dropIsPaused',
                        "#002": 'dropIsSoldOut',
                        "#003": 'dropScheduleTime'
                    }
                };

                break;
            case DropScheduleQueryScope.UPCOMING:
                scanParams = {
                    FilterExpression: "#001 > :001",
                    ExpressionAttributeValues: {
                        ":001": Math.round(DateTime.utc().toSeconds())
                    },
                    ExpressionAttributeNames: {
                        "#001": 'dropScheduleTime'
                    }
                };

                break;
            case DropScheduleQueryScope.PAST:
                scanParams = {
                    FilterExpression: "#001 = :001",
                    ExpressionAttributeValues: {
                        ":001": true
                    },
                    ExpressionAttributeNames: {
                        "#001": 'dropIsSoldOut'
                    }
                };

                break;
            case DropScheduleQueryScope.ALL:
            default:
                break;
        }

        if(ogID && ogID !== '0'){
            scanParams.FilterExpression = `${scanParams.FilterExpression ? `${scanParams.FilterExpression} AND ` : ''}#111 = :111`;
            scanParams.ExpressionAttributeNames = {
                ...scanParams.ExpressionAttributeNames,
                '#111': 'ogListId',
            };
            scanParams.ExpressionAttributeValues = {
                ...scanParams.ExpressionAttributeValues,
                ':111': Number(ogID),
            };
        }

        const i = scanMappedClass(scanParams, ScheduleDropInfo);
        for await(const schedule of i){
            await schedule.loadOgProfile();
            result.push(new ScheduleDropInfoType(schedule));
        }

        // sort from newest to oldest
        result.sort((s1, s2) => Number(s2.DropEventTime) - Number(s1.DropEventTime));

        return result;
    }

    @Query(returns => ScheduleDropInfoType, { nullable: true })
    async getDropSchedule(
        @Arg("DropID", type => Int, { nullable: false }) dropId: number
    ) {
        const schedule = new ScheduleDropInfo(dropId);
        await schedule.load();
        await schedule.loadOgProfile();
        
        return schedule ? new ScheduleDropInfoType(schedule) : null;
    }

    @Query(returns => Boolean)
    @Authorized()
    async isUserDropWhitelisted(
        @Arg("DropID", type => Int, { nullable: false }) dropId: number,
        @Ctx() ctx: RequestContext
    ) {
        const whitelist = new ScheduleDropWhitelist(dropId);
        if(await whitelist.load() && ctx.user){
            return whitelist.whitelistAddress.includes(ctx.user && ctx.user.id);
        } else {
            return false;
        }
    }

    private whiteListCache: {
        [dropId: string]: {
            data: ScheduleDropWhitelist,
            time: DateTime;
        };
    } = {};

    /**
     * invalidates cached values older than 5 minutes
     */
    private sweepCache(){
        for(const dropId in this.whiteListCache){
            if(this.whiteListCache[dropId].time.diffNow("minutes").minutes >= 5){
                delete(this.whiteListCache[dropId]);
            }
        }
    }

    @Query(returns => BuyDropType)
    @Authorized()
    async createBuyDropCmd(
        @Arg("DropID", type => Int, { nullable: false }) dropId: number,
        @Arg("OrderQty", type => Int, { nullable: false }) qty: number,
        // @Arg("Unlocked", type => Boolean, { nullable: true }) unlocked: boolean = false,
        @Ctx() ctx: RequestContext
    ) {
        console.log(`User ${ctx.user && ctx.user?.id} requesting to acquire ${qty} from drop ${dropId}`);

        // mandatory cleanup
        this.sweepCache();

        const dropInfo = new ScheduleDropInfo(dropId);
        const dropWhitelist = this.whiteListCache[dropId]?.data || new ScheduleDropWhitelist(dropId);

        if(! await dropInfo.load()){
            this.logger.error(`Drop Schedule ${dropId} does not exists.`);
            throw new Error(`Drop Schedule ${dropId} does not exists.`);
        } else {
            if(!this.whiteListCache[dropId]){
                await dropWhitelist.load();
                this.whiteListCache[`${dropId}`] = {
                    data: dropWhitelist,
                    time: DateTime.now()
                };
            }
        }

        const buyerWallet = new Wallet(`${ctx.user && ctx.user?.id}`);
        const tokenProvider = DropTokenProvider.getProvider();

        this.logger.debug(`User ${buyerWallet} requesting to acquire ${qty} from drop ${dropId}`);

        // get available tokens
        const availableTokens = await tokenProvider.acquireTokens(dropId, qty, buyerWallet.$, dropWhitelist.isWhitelisted(buyerWallet.$));
        
        const result = new BuyDropType();

        if(availableTokens === 0){
            result.buyData = "SOLDOUT";
        } else {
            const price = Web3.utils.toBN(dropInfo.dropMintingPrice).mul( Web3.utils.toBN(availableTokens) );
            // generate meta transaction
            // const tokenURIs = availableTokens.map(t => t.tokenURI);
            const buyData = await createBuyString(
                buyerWallet.$,
                dropId,
                availableTokens,
                false );

            
            result.buyData = buyData;
            result.price = price.toString();

            // compute merkleproof if whitelisted
            if(dropWhitelist.isWhitelisted(buyerWallet.$)){
                result.proof = dropWhitelist.getHexProof( buyerWallet.$ );
            }
        }

        return result;
    }
}