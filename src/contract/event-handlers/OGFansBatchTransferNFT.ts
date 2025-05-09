import Web3 from "web3";
import { BlockTransactionObject } from "web3-eth";
import { Contract, EventData } from "web3-eth-contract";

import { getBunyanLogger, web3CallThrottle } from "@edenholdings/web3-libs";

import { TransferBatchEvent } from "../../lib/contract/events/ERC1155Events";
import { processNFTTransfer } from "./OGFansTransferNFT";

/**
 * 
 * @param block 
 * @param event 
 * @returns boolean whether it was created or not
 */
const processBatchTransferNFT = async ({ web3, contract }: { contract: Contract, web3: Web3 }, event: EventData, blockInfo?: BlockTransactionObject) => {
    const logger = getBunyanLogger('transfer-batch-handler', { env: process.env.NODE_ENV });

    const { to, ids, values } = event.returnValues as TransferBatchEvent;

    const block: BlockTransactionObject = blockInfo || (await web3CallThrottle(async () => {
        return await web3.eth.getBlock(event.blockNumber);
    }));

    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const value = values[i];

        // check if nft supply is 1
        const supply = await web3CallThrottle(async () => {
            return await contract.methods.totalSupply(id).call();
        });

        if (Number(supply) !== 1 && value.eq(web3.utils.toBN(1))) {
            logger.info(`Token ${id} is probably not an NFT. Skipping!`);
            continue;
        }

        logger.info(`Detected NFT transfer of Token ${id} to ${to}`);

        await processNFTTransfer(id, contract, event, block, logger);
    }

    return true;
}

export default processBatchTransferNFT;