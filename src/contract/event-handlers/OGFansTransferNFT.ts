
import Web3 from "web3";
import { BlockTransactionObject } from "web3-eth";
import { Contract, EventData } from "web3-eth-contract";

import { getBunyanLogger, web3CallThrottle } from "@edenholdings/web3-libs";

import BN from "bn.js";
import Logger from "bunyan";
import { TransferSingleEvent } from "../../lib/contract/events/ERC1155Events";
import { Metadata, TokenMetadata } from "../../lib/dynamodb/models";

/**
 * 
 * @param block 
 * @param event 
 * @returns boolean whether it was created or not
 */



const processTransferNFT = async ({ web3, contract }: { contract: Contract, web3: Web3 }, event: EventData, blockInfo?: BlockTransactionObject) => {
    const logger = getBunyanLogger('transfer-single-handler', { env: process.env.NODE_ENV });

    const { to, id, value } = event.returnValues as TransferSingleEvent;

    const block: BlockTransactionObject = blockInfo || (await web3CallThrottle(async () => {
        return await web3.eth.getBlock(event.blockNumber);
    }));

    if (Number(value.toString()) !== 1) {
        logger.info(`Token ${id} is probably not an NFT. Skipping!`);
    }

    logger.info(`Detected NFT transfer of Token ${id} to ${to}`);

    await processNFTTransfer(id, contract, event, block, logger);

    return true;
}

export const processNFTTransfer = async (id: BN, contract: Contract, event: EventData, block: BlockTransactionObject, logger: Logger) => {
    const { to } = event.returnValues as TransferSingleEvent;

    // update metadata owner if needed
    const token = new TokenMetadata(id.toNumber());
    if( await token.load() && token.owner.toLowerCase() !== to.toLowerCase() ){
        const metadata = new Metadata(token.metadataId, 'Token');
        await metadata.load();
        metadata.owner = to.toLowerCase();
        await metadata.save();
    } else {
        logger.error(`Token ${id.toString()} Metadata not Found!!`);
    }
}

export default processTransferNFT;