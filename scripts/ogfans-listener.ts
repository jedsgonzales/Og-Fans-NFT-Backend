import runContractEventPoller from "../dist/monitoring/contractEventPoller";
import processDropScheduleInfo from "../dist/contract/event-handlers/DropCreated";
import processDropSellOff from "../dist/contract/event-handlers/DropMinted";
import processTransferNFT from "../dist/contract/event-handlers/OGFansTransferNFT";
import processBatchTransferNFT from "../dist/contract/event-handlers/OGFansBatchTransferNFT";
import processDropSchedulePauseEvent from "../dist/contract/event-handlers/DropSchedPause";
import processOGProfile from "../dist/contract/event-handlers/OgProfile";
import processUnlock from "../dist/contract/event-handlers/TokenUnlocked";

import { pause } from "@edenholdings/web3-libs";

let exitProcess = false;
let onPause = false;
function exitHandler() {
    if(onPause){
        process.exit(1);
    } else {
        console.log(`finishing before exit...`);
        exitProcess = true;
    }
}

process.on('SIGINT', exitHandler);
// process.on('SIGKILL', exitHandler);
// process.on('SIGBREAK', exitHandler);

async function main() {
    while(!exitProcess){
        try {
            const pauseTime = await runContractEventPoller(process.env.OGF_CONTRACT || 'OGFans', 
            {
                'DropCreated': processDropScheduleInfo,
                'DropMinted': processDropSellOff,
                'TransferSingle': processTransferNFT,
                'TransferBatch': processBatchTransferNFT,
                'DropPauseStatus': processDropSchedulePauseEvent,
                'OGProfileSet': processOGProfile,
                'TokenUnlocked': processUnlock,
            });

            onPause = true;
            console.log('pausing for ', pauseTime);
            await pause(pauseTime);
            onPause = false;
        } catch(error) {
            console.log(`CelebrityNFTDao event listener crashed`, error);
            
            await pause(10000);
        }
        
        
    }

    process.exit();
}

main();