import * as sigUtil from '@metamask/eth-sig-util';
import * as bip39 from "bip39";
import { hdkey } from 'ethereumjs-wallet';
import Web3 from "web3";

import { getContract, getContractDeployAddress, getEthereumConfig, web3CallThrottle } from "@edenholdings/web3-libs";
import { getDropInfo, ScheduleDropInfo } from '../lib';

export const DomainType = [
    { name: "verifyingContract", type: "address" },
    { name: "chainId", type: "uint256" }
];

export const MetaTransactionType = [
    { name: "nonce", type: "uint256" },
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "functionSignature", type: "bytes" },
    { name: "payment", type: "uint256" },
];

export const getMnemonicAddresses = async(mnemonic:string, addressIndex:number = 0, numAddresses:number = 20, derivationpath = "m/44'/60'/0'/0/", password?:string) => {

    const addresses:{
      address: {
          buffer: Buffer;
          string: string;
      };
      privateKey: {
          buffer: Buffer;
          string: string;
      };
      publicKey: {
          buffer: Buffer;
          string: string;
      };
    }[] = [];
    const seed = await bip39.mnemonicToSeed(mnemonic, password);
    const hdwallet = await hdkey.fromMasterSeed(seed);
  
    for (let i = addressIndex; i < addressIndex + numAddresses; i++){
      const wallet = hdwallet.derivePath(derivationpath + i).getWallet();
      // const addr = '0x' + wallet.getAddress().toString('hex');
      
      addresses.push({
          address: {
              string: Web3.utils.toChecksumAddress(wallet.getAddressString()),
              buffer: wallet.getAddress(),
          },
          privateKey: {
              string: wallet.getPrivateKeyString(),
              buffer: wallet.getPrivateKey(),
          },
          publicKey: {
              string: wallet.getPrivateKeyString(),
              buffer: wallet.getPublicKey()
          }
      });
    }
  
    return addresses;
  }

  export const getTypedSignatureParams = (signature:string, web3:Web3) => {
    if (!web3.utils.isHexStrict(signature)) {
      throw new Error(
        'Given value "'.concat(signature, '" is not a valid hex string.')
      );
    }
    
    var r = signature.slice(0, 66);
    var s = "0x".concat(signature.slice(66, 130));
    var v:string | number = web3.utils.toDecimal(`0x${signature.slice(130, 132)}`)  + 27; 
    
    v = "0x".concat(signature.slice(130, 132));
    v = web3.utils.hexToNumber(v);
    if (![27, 28].includes(v)) v += 27;
    
    return {
      r: r,
      s: s,
      v: v,
    };
  };

const cacheValues:{
    [varName:string]: any;
} = {};

export const createBuyString = async (recipient:string, dropId:number, quantity: number, mintUnlocked: boolean = false) => {
    const dropInfo = new ScheduleDropInfo(dropId);
    await dropInfo.load();

    const contractName = process.env.OGF_CONTRACT || 'OGFans';
    
    const chainConfig = getEthereumConfig( process.env.PRIMARY_WEB3_CONNECTION || 'eth-rinkeby' );
    const contractDeploymentInfo = getContractDeployAddress(contractName, chainConfig.networkId);
    const { contract, web3, json } = getContract(contractName, chainConfig, {}, contractDeploymentInfo?.address);

    const [ orderCreator, ...accounts ] = await web3.eth.getAccounts();
    
    contract.options.from = orderCreator;
    
    const functionCall = web3.eth.abi.encodeFunctionSignature({
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "dropId",
          "type": "uint256"
        },
        {
          "internalType": "uint16",
          "name": "count",
          "type": "uint16"
        },
        {
          "internalType": "bool",
          "name": "unlocked",
          "type": "bool"
        }
      ],
      "name": "mintDrop",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    });
  
    const payment = web3.utils.toBN(dropInfo.dropMintingPrice.toString()).mul( web3.utils.toBN(quantity) );

    console.log('Price per mint', dropInfo.dropMintingPrice.toString());
    console.log('Price', payment.toString());

    if(!cacheValues.chainId){
        cacheValues.chainId = await web3CallThrottle(async () => {
            return await contract.methods.getChainId().call();
        });
    }

    const nonce:number = await web3CallThrottle(async () => {
        return await contract.methods.getNonce(recipient).call();
    });
    
    console.log('recipient', recipient);
    console.log('drop', dropId);

    const parameters = web3.eth.abi.encodeParameters(
        ['address', 'uint256', 'uint16', 'bool'],
        [ recipient, dropId, quantity, mintUnlocked ]
    );

    const mintNFTCall = `${functionCall}${parameters.substring(2)}`;

    const primaryType: "MetaTransaction" | "EIP712Domain" = "MetaTransaction";
    const dataToSign = {
      types: {
        EIP712Domain: DomainType,
        MetaTransaction: MetaTransactionType
      },
      primaryType,
      domain: {
        verifyingContract: `${contractDeploymentInfo?.address}`,
        chainId: cacheValues.chainId,
      },
      message: {
        nonce: nonce,
        from: orderCreator,
        to: recipient,
        functionSignature: mintNFTCall,
        payment: payment.toString(),
      }
    };

    console.log('Sign Data', JSON.stringify(dataToSign, undefined, 2));

    const fromMnemonic = await getMnemonicAddresses( `${chainConfig.walletOptions.mnemonic?.phrase}` );
    const minterWallet = fromMnemonic.find(wallet => wallet.address.string.toLowerCase() === orderCreator.toLowerCase());

    let buyString = "";
    if(minterWallet){
        const signature = sigUtil.signTypedData({ 
            privateKey: minterWallet.privateKey.buffer, 
            data: dataToSign,
            version: sigUtil.SignTypedDataVersion.V4
          });

        const { r, s, v } = getTypedSignatureParams(signature, web3);

        buyString = web3.eth.abi.encodeParameters(
            ["uint256", "uint256", "address", "bytes", "bytes32", "bytes32", "uint8"],
            [dropId, payment, orderCreator, mintNFTCall, r, s, v ]
        );
    }

    (web3.currentProvider || web3.givenProvider).engine?.stop();

    return buyString;
}

export const getDropAvailableTokens = async (dropId:number):Promise<number> => {
    /* const dropInfo = await getDropInfo(dropId);

    if(dropInfo){
        return dropInfo.getDropCount() - dropInfo.getSoldCount();
    } else {
        return 0n;
    } */

    const dropInfo = await getDropInfo(dropId);

    if(dropInfo){
        console.log('dropInfo', dropInfo);
        console.log('OgID', dropInfo.getOGID());
        console.log('getDropTime', dropInfo.getDropTime());
        console.log('getRevealTime', dropInfo.getRevealTime());
        console.log('getWhitelistTime', dropInfo.getWhitelistTime());
        console.log('getDropCount', dropInfo.getDropCount());
        console.log('getMintLimit', dropInfo.getMintLimit());
        console.log('getSoldCount', dropInfo.getSoldCount());

        return dropInfo.getDropCount() - dropInfo.getSoldCount();
    } else {
        return 0;
    }
}