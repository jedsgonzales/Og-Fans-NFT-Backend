import { getBunyanLogger, queryMappedClass, web3CallThrottle } from "@edenholdings/web3-libs";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { DateTime } from "luxon";
import Web3 from "web3";
import { BlockTransactionObject } from "web3-eth";
import { Contract, EventData } from "web3-eth-contract";
import { DropMinted } from "../../lib/contract/events/OGFansEvents";
import { DropScheduleToken, Metadata, ScheduleDropInfo, TokenMetadata } from "../../lib/dynamodb/models";



const logger = getBunyanLogger('CelebrityDropSoldEvent');

const dropTokenCache: {
    [dropId: string]: {
        last: number;
        pool: DropScheduleToken[];
    };
} = {};

/**
 * 
 * @param param0 
 * @param event 
 * @param blockInfo 
 */
 const processDropSellOff = async ({ web3, contract }:{ contract:Contract, web3:Web3 }, event:EventData, blockInfo?: BlockTransactionObject) => {
    const { buyer, dropId: _dropId, ids, sellCount: si, locked, ogIndexes } = event.returnValues as DropMinted;
    const block:BlockTransactionObject = blockInfo || (await web3CallThrottle(async () => {
        return await web3.eth.getBlock(event.blockNumber);
    }));

    const dropId = Number(_dropId.toString());
    const sellCount = Number(si.toString());

    const dropInfo = new ScheduleDropInfo(dropId);
    const dropInfoExists = await dropInfo.load();

    if(!dropInfoExists){
        throw new Error(`Drop ${dropId} does not exists in DB.`);
    }

    // update dropInfo
    logger.info(`Drop ${dropId} Progress`, sellCount, dropInfo.dropAllocation, `${((sellCount / dropInfo.dropAllocation) * 100).toFixed(2)}%`);
    dropInfo.dropSellOffs = sellCount;
    dropInfo.dropIsSoldOut = sellCount >= dropInfo.dropAllocation;
    await dropInfo.save();

    for(let i = 0; i < ids.length; i++){
        const tokenId = ids[i];

        // check if token metadata does not exists yet
        const token = new TokenMetadata(tokenId.toNumber());
        if( await token.load() ){
            // token metadata exists, so skip!
            continue;
        }

        const dropKey = dropInfo.dropId.toString();
        if(!dropTokenCache[dropKey] || dropTokenCache[dropKey].pool.length < 100 || (DateTime.now().toSeconds() - dropTokenCache[dropKey].last) > 60000 ){
            dropTokenCache[dropKey] ||= {
                last: DateTime.now().toSeconds(),
                pool: [],
            };

            // grab a drop token metadata and assign it to the NFT ID as metadata
            const params:Omit<DocumentClient.ScanInput, 'TableName'> = {
                FilterExpression: "#dropIdCol = :dropIdCol",
                ExpressionAttributeNames: {
                    "#dropIdCol": "dropId",
                },
                ExpressionAttributeValues: {
                    ":dropIdCol": dropId,
                }
            };

            const scanned = queryMappedClass(params, DropScheduleToken);
            for await(const dropToken of scanned){
                dropTokenCache[dropKey].pool.push(dropToken);

                // keep only 100 items on cache
                if(dropTokenCache[dropKey].pool.length >= 100){
                    break;
                }
            }

            dropTokenCache[dropKey].last = DateTime.now().toSeconds();
        }
        
        if(dropTokenCache[dropKey].pool.length > 0){
            const selectIndex = Number(Math.floor( Math.random() * dropTokenCache[dropKey].pool.length ).toFixed(0));
            const selectedToken = dropTokenCache[dropKey].pool.splice(selectIndex, 1).pop();

            if(selectedToken){
                // create metadata record
                const metadataObj = selectedToken.toMetadataObject();

                if(dropInfo){
                    // modify name based on OG's NFT count
                    metadataObj.name = `${dropInfo.collectionOgName} #${ogIndexes[i].toString()}`;

                    metadataObj.properties.OG = {
                        drop: {
                            id: dropId,
                            name: dropInfo.collectionName,
                        },
                        celebrity: {
                            id: dropInfo.ogListId,
                            name: dropInfo.collectionOgName,
                        }
                    };
                }
                
                const metadata = new Metadata(`Token#${tokenId.toString()}${dropInfo ? `/Drop#${dropId}/OG#${dropInfo.ogListId}` : ''}`, 'Token');
                metadata.metadataContent = JSON.stringify(metadataObj);
                metadata.transactionHash = event.transactionHash;
                metadata.tokenId = tokenId.toNumber();
                metadata.dropId = dropId;
                metadata.ogId = dropInfo.ogListId;
                metadata.owner = buyer.toLowerCase();
                metadata.locked = locked;

                if(locked){
                    metadata.lockedContent = JSON.stringify({
                        ...metadataObj,
                        description: '',
                        image: dropInfo.collectionImage || dropInfo.collectionOgImage,
                        attributes: [],
                        properties: {
                            locked: true,
                            OG: {
                                ...metadataObj.properties.OG
                            }
                        }
                    });
                }

                // save metadata
                await metadata.save();

                // remove record from db records to avoid re-selection
                await selectedToken.destroy();
            }
        } else {
            // pool is exhausted
            // TODO: ALERT ADMIN

            // TODO: SOFT PAUSE DROP, LET DEVS RESOLVE
            dropInfo.dropIsPaused = true;
            dropInfo.dropPausedOn = DateTime.utc().toSeconds();
            await dropInfo.save();

            // throw tantrum intentionally to halt processing
            throw new Error('Exhausted drop tokens!');
        }
    }

    
}

export default processDropSellOff;