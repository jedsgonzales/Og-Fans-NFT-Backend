
import Web3 from "web3";
import { BlockTransactionObject } from "web3-eth";
import { Contract, EventData } from "web3-eth-contract";

import { getBunyanLogger, web3CallThrottle } from "@edenholdings/web3-libs";

import { TokenUnlocked } from "../../lib/contract/events/OGFansEvents";
import { Metadata, TokenMetadata } from "../../lib/dynamodb/models";

const logger = getBunyanLogger('unlock-token-handler', { env: process.env.NODE_ENV });

export const processUnlock = async ({ web3, contract }: { contract: Contract, web3: Web3 }, event: EventData, blockInfo?: BlockTransactionObject) => {
    const { tokenId } = event.returnValues as TokenUnlocked;

    const block: BlockTransactionObject = blockInfo || (await web3CallThrottle(async () => {
        return await web3.eth.getBlock(event.blockNumber);
    }));

    logger.info(`Token ${tokenId.toString()} unlocked @ ${block.number} ${block.hash}`);

    // update metadata owner if needed
    const token = new TokenMetadata(Number(tokenId.toString()));
    if( await token.load()){
        const metadata = new Metadata(token.metadataId, 'Token');
        await metadata.load();
        metadata.locked = false;
        await metadata.save();
    } else {
        logger.error(`Token ${tokenId.toString()} Metadata not Found!!`);
    }
}

export default processUnlock;