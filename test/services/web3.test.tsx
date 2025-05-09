import { getEthereumConfig, getHDWalletProvider } from "@edenholdings/web3-libs";
import { SignTypedDataVersion } from "@metamask/eth-sig-util";
import chai from "chai";
import chaiHttp from "chai-http";
import fs from 'fs';
import Web3 from "web3";
import { hotPlugFile, SessionDomain, SESSION_DOMAIN } from "../../dist/services/auth/web3";

require('dotenv').config();

chai.use(chaiHttp);

const app = require('../../dist/services/index');
const vars = require('../test.vars');

const should = chai.should();
const expect = chai.expect;

const USER_MNEMONIC = vars.test_mnemonic;

const rootEthConfig = getEthereumConfig( process.env.PRIMARY_WEB3_CONNECTION );
const userEthConfig = JSON.parse(JSON.stringify(rootEthConfig));

userEthConfig.walletOptions.mnemonic.phrase = USER_MNEMONIC;

describe('POST /v1/auth/web3/login', () => {
  it(`should return the user account of properly signed with ${SignTypedDataVersion.V4}`, (done) => {
    const hdwallet = getHDWalletProvider(userEthConfig);

    const web3 = new Web3(hdwallet);

    const wallet = hdwallet.getAddress(0);

    web3.eth.net.getNetworkType().then(network => {

      const msgParams = {
        types: {
          EIP712Domain: SessionDomain,
          Message: [{name:'message', type: 'string'}]
        },
        primaryType: 'Message',
        domain: SESSION_DOMAIN,

        message:{ 
          message: "Login Test"
        }
      };
      
      hdwallet.sendAsync({
        method: "eth_signTypedData_v4",
        params: [msgParams, wallet],
        from: wallet,
      }, (err, result) => {
        if(err){
          //console.log(err);
          done(err);
        } else {
          
          chai
          .request(app)
          .post('/auth/web3/login')
          .set('content-type', 'application/x-www-form-urlencoded')
          .send({ address: wallet, message: JSON.stringify(msgParams), signed: result.result, type: 'typed' })
          .then((res) => {
            // console.log("Response", res.body, res.status);

            res.should.have.status(200);

            expect(res.body.address).to.be.equal(wallet);

            done();
          })
          .catch(err => {
            //console.log(err);
            done(err);
          });
        }
      });
    });
  }).timeout(0);

  it('should return the user account of properly signed with personal_sign', (done) => {
    const hdwallet = getHDWalletProvider(userEthConfig);

    const web3 = new Web3(hdwallet);

    const wallet = hdwallet.getAddress(0);

    web3.eth.net.getNetworkType().then(network => {
      const msgParams = "Hello OG Fans!";
      
      hdwallet.sendAsync({
        method: "personal_sign",
        params: [web3.utils.asciiToHex(msgParams), wallet],
        from: wallet,
      }, (err, result) => {
        if(err){
          //console.log(err);
          done(err);
        } else {
          /* const recovered = sigUtil.recoverPersonalSignature({
            data: web3.utils.asciiToHex(msgParams),
            sig: result.result
          }); */

          chai
          .request(app)
          .post('/auth/web3/login')
          .set('content-type', 'application/x-www-form-urlencoded')
          .send({ address: wallet, message: web3.utils.asciiToHex(msgParams), signed: result.result, type: 'personal' })
          .then((res) => {
            //console.log("Response", res.body, res.status);
            res.should.have.status(200);
            expect(res.body.address).to.be.equal(wallet);

            done();
          })
          .catch(err => {
            //console.log(err);
            done(err);
          });
        }
      });
    });
  }).timeout(0);
});

describe('Web3 Auth Maintenance Mode', function(){
  it('should return error code when maintenance mode is on', (done) => {
    fs.closeSync(fs.openSync(hotPlugFile, 'w'));

    chai
      .request(app)
      .get('/v1/auth/web3/login')
      .then((res) => {
        //console.log("Response", res.body, res.status);
        res.should.have.status(404);

        fs.unlinkSync(hotPlugFile);
        done();
      })
      .catch(err => {
        //console.log(err);
        fs.unlinkSync(hotPlugFile);
        done(err);
      }).finally(() => {
        
      });
  });
});