import Web3 from "web3";
import { Contract, EventData } from "web3-eth-contract";
import { BlockTransactionObject } from "web3-eth";

import { getBunyanLogger, web3CallThrottle } from "@edenholdings/web3-libs";

import { ScheduleDropInfo } from "../../lib/dynamodb/models";
import { DropPauseStatusEvent } from "../../lib/contract/events/OGFansEvents";

const logger = getBunyanLogger('dropschedule-pause-event', { env: process.env.NODE_ENV });

/**
 * 
 * @param block 
 * @param event 
 * @returns boolean whether it was created or not
 */
 const processDropSchedulePauseEvent = async ({ web3, contract }:{ contract:Contract, web3:Web3 }, event:EventData, blockInfo?: BlockTransactionObject) => {
    logger.debug(`Processing Event`, event);

    const { dropId, isPaused } = event.returnValues as DropPauseStatusEvent;
    
    const block:BlockTransactionObject = blockInfo || (await web3CallThrottle(async () => {
        return await web3.eth.getBlock(event.blockNumber);
    }));

    const dbEntry = new ScheduleDropInfo(Number(dropId.toString()));

    logger.debug(`Loading Object`, dbEntry);

    const exists = await dbEntry.load();

    if(exists){
        logger.debug(`Loaded Object - Updating`, dbEntry);

        dbEntry.dropPausedOn = Number(block.timestamp.toString());
        dbEntry.dropIsPaused = Boolean(isPaused);

        await dbEntry.save();
    }   
}

export default processDropSchedulePauseEvent;