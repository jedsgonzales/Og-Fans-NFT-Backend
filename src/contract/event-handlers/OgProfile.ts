import Web3 from "web3";
import { Contract, EventData } from "web3-eth-contract";
import { BlockTransactionObject } from "web3-eth";

import { getBunyanLogger, web3CallThrottle } from "@edenholdings/web3-libs";

import { Metadata, OGCelebMetadata, ScheduleDropInfo } from "../../lib/dynamodb/models";
import { DropCreatedEvent, OGProfileEvent } from "../../lib/contract/events/OGFansEvents";
import { OGProfile } from "../../lib/dynamodb/models/profile";

const logger = getBunyanLogger('dropschedule-create-event', { env: process.env.NODE_ENV });

/**
 * 
 * @param block 
 * @param event 
 * @returns boolean whether it was created or not
 */
 const processOGProfile = async ({ web3, contract }:{ contract:Contract, web3:Web3 }, event:EventData, blockInfo?: BlockTransactionObject) => {
    logger.debug(`Processing Event`, event);

    const { ogId, ogName } = event.returnValues as OGProfileEvent;
    
    const block:BlockTransactionObject = blockInfo || (await web3CallThrottle(async () => {
        return await web3.eth.getBlock(event.blockNumber);
    }));

    const dbEntry = new OGProfile(Number(ogId.toString()));

    logger.debug(`Loading Object`, dbEntry, ogId, ogName);

    const exists = await dbEntry.load();

    if(!exists){
        logger.debug(`Object Is Verified New`, dbEntry);
    } else {
        logger.debug(`Loaded Object - Updating`, dbEntry);
    }

    dbEntry.ogName = ogName;
    dbEntry.updatedOnBlock = event.blockNumber;
    if(!dbEntry.transactionHash){
        dbEntry.transactionHash = event.transactionHash;
    }
    
    await dbEntry.save();

    // check if metadata exists and create it
    const token = new OGCelebMetadata(Number(ogId.toString()));
    if( !(await token.load()) ){
        
        // create default metadata profile
        const metadata = new Metadata(`OG#${ogId.toString()}`, 'OGCeleb');
        metadata.metadataContent = JSON.stringify({
            name: dbEntry.ogName,
            description: `${dbEntry.ogDetails}`,
            image: dbEntry.ogImage,
        });
        metadata.transactionHash = event.transactionHash;
        metadata.ogId = Number(ogId.toString());

        await metadata.save();
    }
}

export default processOGProfile;