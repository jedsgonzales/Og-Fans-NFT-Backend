import dotenv from 'dotenv';
import Web3 from "web3";
import { Contract, EventData } from "web3-eth-contract";
import { BlockTransactionObject } from "web3-eth";

import { getBunyanLogger, getContract, getEthereumConfig, getContractDeployAddress, web3CallThrottle } from "@edenholdings/web3-libs";

import { AppVar } from "../lib/dynamodb/models";

dotenv.config();

const logger = getBunyanLogger('contract-event-poller', { env: process.env.NODE_ENV });

const runContractEventPoller = async (
    contractName:string, 
    handlers: {
        [eventName:string]: (connection:{ contract:Contract, web3:Web3 }, event:EventData, blockInfo?: BlockTransactionObject) => Promise<boolean>;
    }
) => {
    let nextTick = 5000;

    // obtain blockchain connection
    const chainConfig = getEthereumConfig( process.env.PRIMARY_WEB3_CONNECTION || 'eth-rinkeby' );
    const contractDeploymentInfo = getContractDeployAddress(contractName, chainConfig.networkId);
    const { contract, web3, json } = getContract(contractName, chainConfig, {}, contractDeploymentInfo?.address);

    // load vars
    const celebDaoPrevBlock = new AppVar(`${contractName}EventPoller`, `PREVIOUS_BLOCK@${chainConfig.networkId}`);

    await celebDaoPrevBlock.load();
    if(!celebDaoPrevBlock.varValue){
        logger.debug(`AppVar ${contractName}EventPoller PREVIOUS_BLOCK is not set.`);

        // populate block number from contract birth block
        const transactionReceipt = await web3CallThrottle(async () => {
            logger.info('Birth Transaction Hash', contractDeploymentInfo?.transactionHash || (json.networks && json.networks[chainConfig.networkId].transactionHash ));
            return await web3.eth.getTransactionReceipt(contractDeploymentInfo?.transactionHash || (json.networks && json.networks[chainConfig.networkId].transactionHash ));
        });

        logger.info("Birth Block", transactionReceipt.blockNumber);
        celebDaoPrevBlock.varValue = transactionReceipt.blockNumber.toString();
    }

    // get network's current block (to avoid it)
    const currBlock = await web3CallThrottle(async () => {
        return await web3.eth.getBlockNumber();
    });

    const fromBlock = Number(celebDaoPrevBlock.varValue);
    const blockDiff = (currBlock - 1) - fromBlock;

    const fetchBlockSize = blockDiff > 1000 ? 
        ( blockDiff > 1000 ? 1000 : 500 ) : Math.floor(blockDiff / 2); 

    logger.debug(`Block Diff`, blockDiff);
    logger.debug(`Current Block`, currBlock);
    logger.debug(`Fetch Blocks`, fetchBlockSize);

    const toBlock = fromBlock + fetchBlockSize;

    try {
        if(fetchBlockSize > 0){
            const allEvents = await contract.getPastEvents('allEvents', { fromBlock, toBlock });

            logger.debug(`Event Size`, fromBlock, fromBlock + fetchBlockSize, allEvents.length);
    
            for(const event of allEvents){
                const blockInfo = await web3CallThrottle(async () => {
                    return await web3.eth.getBlock(event.blockNumber);
                });

                if(handlers[event.event]){
                    logger.debug('Processing Event', event);
                    const handler = handlers[event.event];
                    await handler({web3, contract}, event, blockInfo);
                } else {
                    logger.info('Ignoring Event', event);
                }
            }

            if(fetchBlockSize <= 10){
                nextTick = 60000;
            }
        } else {
            nextTick = 30000;
        }
    
        celebDaoPrevBlock.varValue = toBlock.toString();
        await celebDaoPrevBlock.save();
    } catch(error:any) {
        logger.error(`Event Poller Error`, error);
    }

    (web3.currentProvider || web3.givenProvider).engine?.stop();

    return nextTick;
}

export default runContractEventPoller;