import { getBunyanLogger, queryMappedClass, Wallet } from "@edenholdings/web3-libs";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { DateTime } from "luxon";
import { getDropAvailableTokens } from "../../contract";

import { DropScheduleToken } from "../../lib/dynamodb/models/drop-tokens";

export default class DropTokenProvider {
    static instance: DropTokenProvider;

    logger;

    /* private exclusiveStartKey?: {
        dropId: number;
        tokenURI: string;
    }; */

    private constructor() {
        this.logger = getBunyanLogger('token-provider');
        this.logger.debug('DropTokenProvider init.');
        // setTimeout(this.checkAcquired, 5000);
    }

    public static getProvider() {
        if (!DropTokenProvider.instance) {
            DropTokenProvider.instance = new DropTokenProvider();

            // process.on('SIGINT', DropTokenProvider.instance.onSigTerm);
        }

        DropTokenProvider.instance.logger.debug('DropTokenProvider return.');
        return DropTokenProvider.instance;
    }

    /* private exiting: boolean = false;
    public onSigTerm() {
        this.exiting = true;
    } */

    /* private acquired: {
        [tokenURI: string]: {
            dropId: bigint;
            reservedTime: number;
            buyer: string;
        };
    } = {}; */

    public async acquireTokens(dropId: number, tokenQty: number, requestor:string, prioritized: boolean) {
        const reqWallet = new Wallet(requestor);

        const tokens: DropScheduleToken[] = [];

        // contract check
        let availableTokens = await getDropAvailableTokens(dropId);

        if(availableTokens <= 0){
            return 0;
        } else {
            return availableTokens >= tokenQty ? tokenQty : availableTokens;
        }

        /* // get whitelisted tokens for user first
        const whitelistedFilter = "" +
            "( attribute_not_exists(#lockedByBuyer) OR #lockedByBuyer = :emptyBuyer OR (attribute_exists(#buyerLockTimeCol) AND #buyerLockTimeCol < :buyerLockTimeVal) ) " +
            "AND attribute_exists(#reservedForCol) AND #reservedForCol = :reservedForVal";
        const whitelistedAttributeNames = {
            "#dropIdCol": "dropId",
            // "#tokenURICol": "tokenURI",
            "#lockedByBuyer": "buyer",
            "#buyerLockTimeCol": "buyerLockTime",
            "#reservedForCol": "reservedFor"
        };
        const whitelistedAttributeValues = {
            ":dropIdCol": dropId,
            // ":exemptedTokenURIList": Object.keys(this.acquired).join(', '),
            ":emptyBuyer": "",
            ":buyerLockTimeVal": Math.round(DateTime.utc().toSeconds()),
            ":reservedForVal": reqWallet.$.toLowerCase()
        };

        const params = {
            KeyConditionExpression: "#dropIdCol = :dropIdCol", //  AND NOT (#tokenURICol IN (:exemptedTokenURIList))
            FilterExpression: "attribute_not_exists(#lockedByBuyer) OR #lockedByBuyer = :emptyBuyer OR (attribute_exists(#buyerLockTimeCol) AND #buyerLockTimeCol < :buyerLockTimeVal) ",
            ExpressionAttributeNames: {
                "#dropIdCol": "dropId",
                // "#tokenURICol": "tokenURI",
                "#lockedByBuyer": "buyer",
                "#buyerLockTimeCol": "buyerLockTime"
            },
            ExpressionAttributeValues: {
                ":dropIdCol": dropId,
                // ":exemptedTokenURIList": Object.keys(this.acquired).join(', '),
                ":emptyBuyer": "",
                ":buyerLockTimeVal": Math.round(DateTime.utc().toSeconds())
            }
        };
        
        // deal with infinite loop when user is not whitelisted
        // try to get if there are any whitelisted item for requesting wallet
        const byWhiteListParams:Omit<DocumentClient.QueryInput, 'TableName'> = { 
            ...params,
            FilterExpression: whitelistedFilter,
            ExpressionAttributeNames: whitelistedAttributeNames,
            ExpressionAttributeValues: whitelistedAttributeValues
        };

        if(prioritized){
            while (tokens.length < tokenQty && availableTokens > 0) {
                const query = queryMappedClass(byWhiteListParams, DropScheduleToken);
    
                for await (const dropToken of query) {
                    if (tokens.length < tokenQty && availableTokens > 0) {
                        tokens.push(dropToken);
                        availableTokens--;
                    } else {
                        // record where we last stopped
                        // this.exclusiveStartKey = {
                        //     dropId: Number(dropId),
                        //     tokenURI: dropToken.tokenURI,
                        // }
                        break;
                    }
                }

                // this.exclusiveStartKey = undefined;
            }
        }
        
        while (tokens.length < tokenQty && availableTokens > 0) {
            const query = queryMappedClass(params, DropScheduleToken);

            for await (const dropToken of query) {
                if (tokens.length < tokenQty && availableTokens > 0) {
                    tokens.push(dropToken);
                    availableTokens--;
                } else {
                    // record where we last stopped
                    // this.exclusiveStartKey = {
                    //     dropId: Number(dropId),
                    //     tokenURI: dropToken.tokenURI,
                    // }
                    break;
                }
            }

            // this.exclusiveStartKey = undefined;
        }

        this.logger.debug('Result Temp Lock for ' + requestor + '\n\t', tokens.map(t => t.tokenURI).join('\n'));

        // mark temporary lock to items
        for(const token of tokens){
            token.lockedByBuyer = reqWallet.$.toLowerCase();
            token.buyerLockTime = DateTime.utc().plus({ seconds: 30 }).toSeconds();
            await token.save();
        }

        return tokens; */
    }

    /* public async markTokens(buyer: string, dropId: bigint, tokenIds: bigint[]) {
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];

            // set buyer for the token
            if (!this.acquired[tokenId.toString()]) {
                this.acquired[tokenId.toString()] = {
                    dropId,
                    reservedTime: (new Date()).getTime(),
                    buyer,
                };

                const data = new DropScheduleToken(dropId, tokenId);
                await data.load();
                data.buyer = buyer;
                await data.save();
            }
        }
    } */

    /* private async checkAcquired() {
        if (this.exiting) return;

        const tokenAvailabilityTimeout = Number(process.env.TOKEN_RESERVATION_TIMEOUT || (5 * 60 * 1000));
        const contractName = process.env.OGF_CONTRACT || 'OGFans';

        // obtain blockchain connection
        const chainConfig = getEthereumConfig(process.env.PRIMARY_WEB3_CONNECTION || 'eth-rinkeby');
        const contractDeploymentInfo = getContractDeployAddress(contractName, chainConfig.networkId);
        const { contract, web3, json } = getContract(contractName, chainConfig, {}, contractDeploymentInfo?.address);

        const acquiredList = Object.values(this.acquired).map(drop => Object.keys(drop))
            .reduce((pv, cv, ci, arr) => {
                pv.push(...cv);
                return pv;
            }, []);

        const availability: any[] = await web3CallThrottle(async () => {
            return await contract.methods.checkAvailability(acquiredList)
                .call()
                .then((r: any) => r);
        });

        // close web3 connection
        (web3.currentProvider || web3.givenProvider).engine?.stop();

        for (let i = 0; i < availability.length; i++) {
            const tokenId = acquiredList[i].toString();
            const available = Boolean(availability[i]);

            if (available) {
                const nowTs = (new Date()).getTime();
                if ((nowTs - this.acquired[tokenId].reservedTime) >= tokenAvailabilityTimeout) {

                    // let go for next picking
                    delete (this.acquired[tokenId]);

                    // unset buyer data
                    const data = new DropScheduleToken(this.acquired[tokenId].dropId, BigInt(tokenId));
                    await data.load();
                    data.buyer = undefined;
                    await data.save();
                }
            }
        }

        // schedule next check if not exiting
        if (!this.exiting) setTimeout(this.checkAcquired, 90000); // 1 and half minutes
    } */
}