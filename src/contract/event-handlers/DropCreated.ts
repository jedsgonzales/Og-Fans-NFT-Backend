import Web3 from "web3";
import { Contract, EventData } from "web3-eth-contract";
import { BlockTransactionObject } from "web3-eth";

import { getBunyanLogger, web3CallThrottle } from "@edenholdings/web3-libs";

import { DropMetadata, Metadata, OGProfile, ScheduleDropInfo } from "../../lib/dynamodb/models";
import { DropCreatedEvent } from "../../lib/contract/events/OGFansEvents";
import { DateTime } from "luxon";

const logger = getBunyanLogger('dropschedule-create-event', { env: process.env.NODE_ENV });

/**
 * 
 * @param block 
 * @param event 
 * @returns boolean whether it was created or not
 */
 const processDropScheduleInfo = async ({ web3, contract }:{ contract:Contract, web3:Web3 }, event:EventData, blockInfo?: BlockTransactionObject) => {
    logger.debug(`Processing Event`, event);

    const { dropId, ogId, dropCount, dropTime, mintPrice, mintLimit, scheduler, whitelistTime } = event.returnValues as DropCreatedEvent;
    
    const block:BlockTransactionObject = blockInfo || (await web3CallThrottle(async () => {
        return await web3.eth.getBlock(event.blockNumber);
    }));

    const collectionId = Number(dropId.toString());
    const dbEntry = new ScheduleDropInfo(collectionId);

    logger.debug(`Loading Object`, dbEntry);

    const exists = await dbEntry.load();

    if(!exists){
        logger.debug(`Object Is Verified New`, dbEntry);
    } else {
        logger.debug(`Loaded Object - Updating`, dbEntry);
    }

    dbEntry.ogListId = Number(ogId.toString());
    dbEntry.dropScheduleTime = Number(dropTime);
    dbEntry.dropEventTime = Number(block.timestamp.toString());
    dbEntry.dropMintingPrice = mintPrice.toString();
    dbEntry.dropMintingLimit = Number(mintLimit.toString());
    dbEntry.dropAllocation = Number(dropCount.toString());
    dbEntry.dropScheduler = scheduler;
    // dbEntry.dropRevealTime = Number(revealTime);
    dbEntry.dropWhitelistTime = Number(whitelistTime);

    // load OgProfile
    const ogProfile = new OGProfile(dbEntry.ogListId);
    await ogProfile.load();

    dbEntry.collectionOgName = ogProfile.ogName;
    dbEntry.collectionOgImage = ogProfile.ogImage;
    dbEntry.collectionImage = ogProfile.ogImage;
    dbEntry.collectionName = `${ogProfile.ogName}, OGFans Collection #${dropId.toString()}`;

    await dbEntry.save();

    // check if metadata exists and create it
    const token = new DropMetadata(collectionId);
    if( !(await token.load()) ){
        
        // create default metadata profile
        const metadata = new Metadata(`DropCollection#${dropId}/OG#${dbEntry.ogListId}`, 'DropCollection');
        metadata.metadataContent = JSON.stringify({
            name: dbEntry.collectionName,
            description: `Drop Collection by ${ogProfile.ogName}`,
            image: ogProfile.ogImage,
            properties: {
                schedule: DateTime.fromSeconds(dbEntry.dropScheduleTime, { zone: 'utc' }).toISO(),
                allowlist: `Until ${DateTime.fromSeconds(dbEntry.dropWhitelistTime, { zone: 'utc' }).toISO()}`,
            }
        });
        metadata.transactionHash = event.transactionHash;
        metadata.dropId = collectionId;
        metadata.ogId = Number(ogId.toString());

        await metadata.save();
    }
}

export default processDropScheduleInfo;