import { createTypedSignature, getBunyanLogger, getEthereumConfig, getHDWalletProvider, getWeb3 } from "@edenholdings/web3-libs";
import { MessageTypes, recoverTypedSignature, SignTypedDataVersion, TypedMessage } from "@metamask/eth-sig-util";
import express, { Request, Response } from "express";
import fs from 'fs';
import { DateTime } from "luxon";
import os from 'os';
import { Authenticator } from 'passport';
import path from 'path';
import Web3 from "web3";
import { createSessionTokenParams } from "../../lib";
import { AccountSession, loadAccountSession } from "../../lib/dynamodb/models/user-account";
import Web3Strategy from "../../middlewares/passport-web3";
import { LoadableService, ServiceParams } from "../../types";
import { AuthService } from "../../types/auth-service";
import { addAdmin, getAdmins, LOGIN_EXPIRED, registerAuthModule, UNEXPECTED_ERROR } from ".";

export const INVALID_WALLET_ID = "Invalid Wallet Address";

const logger = getBunyanLogger('web3-auth-api', { env: process.env.NODE_ENV });
const tmpdir = os.tmpdir();

// our eth system wallet's web3
let web3Instance:Web3 | null = null;
const startWeb3 = () => {
  web3Instance = getWeb3(getEthereumConfig(process.env.PRIMARY_WEB3_CONNECTION || 'eth-rinkeby'));
  return web3Instance;
}

const stopWeb3 = () => {
  if(web3Instance){
    (web3Instance.currentProvider || web3Instance.givenProvider).engine?.stop();
  }
}

export const hotPlugFile = path.join(tmpdir, 'Web3AuthServiceDisabled');
export default class Web3AuthService implements LoadableService, AuthService {
  constructor(args: any) {}

  serviceName() {
    return "Web3AuthService";
  }

  version() {
    return 1.0;
  }

  hotPlugControlFile() {
    return hotPlugFile;
  }

  public createService({ middlewareChainMap, middlewares }: ServiceParams) {
    logger.info(`Service register`, this.serviceName());

    //find passport middleware
    if (middlewares && middlewares.passport && middlewares.passport instanceof Authenticator) {
      const passport = middlewares.passport;

      const web3Auth = express();

      //set default response type to json
      web3Auth.use(function (req: Request, res: Response, next: Function) {
        res.header("Content-Type", 'application/json');
        next();
      });

      web3Auth.use(function (req: Request, res: Response, next: Function) {
        if (fs.existsSync(hotPlugFile)) {
          res.status(404).send({ message: 'Under Maintenance' });
        } else {
          next();
        }
      });

      //attach login strategy
      passport.use(new Web3Strategy(this.loginCallback, { passReqToCallback: true }));

      passport.serializeUser(function (user: any, done) {
        done(null, user.ethWallet);
      });

      passport.deserializeUser(async (id: string, done) => {
        let retval = null;
        let error = null;

        await loadAccountSession(id).then(account => {
          retval = account;
        }).catch(err => {
          error = err;
        });

        return done(error, retval);
      });

      web3Auth.post(`/login`, [passport.authenticate('web3')], middlewareChainMap.public, this.login);
      // web3Auth.get(`/salt`, middlewareChainMap.public, this.getUserSecret);

      middlewareChainMap.authenticated.push(this.authorizationFilter);
      // middlewareChainMap.adminOnly.push(this.adminFilter);

      // populate admin list
      if (getAdmins().length === 0) {
        const chainConfigs = [process.env.PRIMARY_WEB3_CONNECTION || 'eth-rinkeby'];
        for (const chainConfig of chainConfigs) {
          if (chainConfig) {
            const wallet = getHDWalletProvider(chainConfig);
            addAdmin(...wallet.getAddresses());
            wallet.engine.stop();
          }
        }
      }

      // register auth module
      registerAuthModule('web3Auth', this);

      return web3Auth;

    } else {
      logger.error("Please provide the instance of passport middleware");
    }

    return false;
  }

  async loginCallback(req: Request, address: string, message: string, signed: string, done: Function) {
    const web3 = startWeb3();

    await loadAccountSession(address).then(async account => {
      const userAccount = account;

      const sessionLength = Number(process.env.SESSION_TIMEOUT || 3600);
      const expiry = DateTime.utc().plus({ seconds: sessionLength });

      //this is for compatibility with legacy API clients

      //generate token header for user
      const messageString = message.startsWith("0x") ? Web3.utils.hexToAscii(message) : message;

      logger.debug('Login message', messageString);

      const sessionTokenParams = createSessionTokenParams({
        address,
        signed,
        message: messageString
      });

      const sessionToken = await createTypedSignature(sessionTokenParams, web3.givenProvider || web3.currentProvider);

      if (sessionToken) {
        userAccount.sessionTime = expiry.valueOf().toString();
        userAccount.signHash = messageString;
        userAccount.sessionToken = signed;
        // userAccount.secretHash = userAccount.loginHash = messageString;


        logger.debug('Login result', userAccount);
        await userAccount.save();

        req.body.serverSig = sessionToken;

      } else {
        logger.warn(`${address} login: session token resulted to false.`);

      }

      return done(null, userAccount);

    }).catch(err => {
      logger.error("Web3 Strategy Callback: Error retrieving wallet account!", err);

      //account does not exist on DB, but ok since the signature is valid
      return done(err);
    });

    stopWeb3();
  }

  async login(req: Request, res: Response) {
    const account = req.user as AccountSession;

    /**
     * dev must send `${tokenId} ${ethWallet}` as value 
     * for authorization header for succeeding requests
     */
    res.send({
      address: account.ethWallet,
      tokenId: req.body.serverSig,
      sessionExpiry: account.sessionTime
    });
  }

  async getUserSecret(req: Request, res: Response) {
    const { address } = req.query;
    const userAddress = Array.isArray(address) ? address[0] : address;

    if (!userAddress || userAddress === "") {
      res.status(500).send({ error: INVALID_WALLET_ID });
    } else {
      const ethAddress = `${userAddress}`;

      await loadAccountSession(ethAddress).then(async (account) => {
        const userAccount = account;

        //generate secret hash
        userAccount.loginHash = Web3.utils.randomHex(32).replace('0x', '');

        await userAccount.save();

        res.send({ message: 'Welcome', date: (new Date()).toUTCString(), hash: userAccount.loginHash });

      }).catch(err => {
        logger.error("Error retrieving wallet account", err);
        res.status(500).send({ error: UNEXPECTED_ERROR });
      });
    }
  }

  async authorizationFilter(req: Request, res: Response, next: Function) {
    logger.debug(`Web3 Auth Filter`);

    const web3 = startWeb3();
    
    try {
      const account = await loadSessionCredential(req, web3);

      logger.info(`Web3 Auth Filter`, account);

      stopWeb3();

      if (!account) {
        res.status(401).send({ error: LOGIN_EXPIRED });

      } else {
        // bump session expiry
        const sessionLength = Number(process.env.SESSION_TIMEOUT || 3600);
        const expiry = DateTime.utc().plus({ seconds: sessionLength });

        account.sessionTime = expiry.valueOf().toString();
        await account.save();
        
        return next();
      }

    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }   
  }

  async loadUserCredential(req: Request){
    logger.debug('Web3: Loading Creds from Request');

    const web3 = startWeb3();
    const result = await loadSessionCredential(req, web3);
    stopWeb3();

    return result;
  }

  /* async adminFilter(req: Request, res: Response, next: Function) {
    const web3 = startWeb3();

    const account = await loadSessionCredential(req, web3);

    stopWeb3();

    if (!account || !isAdmin(account.ethWallet)) {
      res.status(403).send({ error: ACCOUNT_NOT_PERMITTED });
    } else {
      return next();
    }
  } */
}

//function to load user credential / profile
export const loadSessionCredential = async (req: Request, web3: Web3) => {
  logger.debug(`loading session credentials`, req.user);
  logger.debug(`loading session credentials headers`, req.headers);

  //load user account from session
  const reqUser: any = req.user;

  if (!reqUser) {
    logger.debug('Bringing up session from token...');

    // user account does not exists in session
    // try loading it via header tokens, if submitted
    const { authorization } = req.headers;

    const has_authorization = !!authorization && authorization?.trim() !== "" && authorization?.split(' ').length === 2;

    logger.debug('Authorization found?', authorization, has_authorization);

    if (!has_authorization) {
      return false;
    }

    const [tokenId, ethWallet] = authorization.split(' ');
    const account = await loadAccountSession(ethWallet);

    if (account && !!account.sessionToken && !!account.sessionTime && !!account.signHash) {
      if (account.sessionTime < DateTime.utc().valueOf().toString()) {
        logger.debug('Session expired', account.sessionTime, DateTime.utc().valueOf().toString());
        return false; //session expired
      }

      if (req.session && req.session?.userAuthId &&
        req.session?.userAuthId === tokenId) {
        logger.debug('Session verified by session userAuthId', req.session?.userAuthId);
        req.user = account;
        return account;
      }

      logger.debug('Session verification by signarure decoding');
      //form the session token params from profile
      const sessionTokenParams = createSessionTokenParams({
        address: ethWallet,
        signed: account.sessionToken,
        message: account.signHash
      });

      // validation requires that the recovered address must match the system's wallet
      // which was then encoded using signedType method
      const recovered = recoverTypedSignature({
        data: sessionTokenParams,
        signature: tokenId,
        version: SignTypedDataVersion.V4
      });

      logger.debug('Session verification by signarure decoding, recovered', recovered);

      if (recovered === (web3.givenProvider || web3.currentProvider).getAddress()) {
        logger.debug('Session verification by signarure decoding, success');

        // save the token ID in session 
        // this means that we acknowledged 
        // this authorization for next requests
        if (req.session) {
          const session = req.session;
          session.userAuthId = tokenId;
        };

        req.user = account;

        return account;
      }
    }

  } else {
    logger.debug('Session exists, loading account from session store');
    // user retrieved from session
    const account = await loadAccountSession(reqUser.ethWallet);
    req.user = account;
    return account;
  }

  return false;
}