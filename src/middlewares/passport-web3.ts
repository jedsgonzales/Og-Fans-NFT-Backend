import passport from "passport-strategy";
import { Accounts } from "web3-eth-accounts";

import { Request } from "express";

import * as sigUtil from "@metamask/eth-sig-util";
import { SignTypedDataVersion } from "@metamask/eth-sig-util";

interface ReqMap {
    addressField?: string;
    messageField?: string;
    signedField?: string;
    signTypeField?: string;
    passReqToCallback?: boolean;
}

interface AuthenticateOpts {
    badRequestMessage?: string;
}

const lookup = (obj: any, field: string) => {
    if (!obj) { return null; }
    const chain = field.split(']').join('').split('[');
    for (let i = 0, len = chain.length; i < len; i++) {
        const prop = obj[chain[i]];
        if (typeof (prop) === 'undefined') { return null; }
        if (typeof (prop) !== 'object') { return prop; }
        obj = prop;
    }
    return null;
};


/**
 * `Strategy` constructor.
 * 
 * This library was based on passport-dapp-web3 by phsychobunny with added typed signing support.
 *
 * The web3 authentication strategy authenticates requests based on the
 * credentials submitted via a POST request.
 *
 * Applications must supply a `verify` callback which accepts `address`, `message` and
 * `signed` message fields, and then calls the `done` callback supplying a
 * `user`, which should be set to `false` if the credentials are not valid.
 * If an exception occurred, `err` should be set.
 *
 * Optionally, `options` can be used to change the fields in which the
 * credentials are found.
 *
 * Options:
 *   - `addressField`  field name where the address is found, defaults to _address_
 *   - `messageField`  field name where the message is found, defaults to _message_
 *   - `signedField`  field name where the signed message is found, defaults to _signed_
 *   - `signTypeField`  field name where the sining method is found, defaults to _type_
 *   - `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *
 * Example:
 *
 *     passport.use(new Web3Strategy(
 *       function(address, message, signed, done) {
 *         User.findOne({ address: address }, function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
export class Strategy extends passport.Strategy {
    _verify: Function;
    _options: ReqMap;
    _addressField: string;
    _messageField: string;
    _signedField: string;
    _signTypeField: string;

    _passReqToCallback: boolean;

    name: string = 'web3';

    constructor(verify: Function, options?: ReqMap) {
        super();

        if (!verify) { throw new TypeError('Web3Strategy requires a verify callback'); }

        this._verify = verify;
        this._options = options || {};

        this._addressField = this._options.addressField || 'address';
        this._messageField = this._options.messageField || 'message';
        this._signedField = this._options.signedField || 'signed';
        this._signTypeField = this._options.signTypeField || 'type';

        passport.Strategy.call(this);
        this._passReqToCallback = this._options.passReqToCallback || false;
    }

    authenticate(req: Request, options: AuthenticateOpts) {
        options = options || {};

        const address: string = lookup(req.body, this._addressField) || lookup(req.query, this._addressField);
        const message: string = lookup(req.body, this._messageField) || lookup(req.query, this._messageField);
        const signed: string = lookup(req.body, this._signedField) || lookup(req.query, this._signedField);
        const signType: string = lookup(req.body, this._signTypeField) || lookup(req.query, this._signTypeField) || '';

        if (!address || !message || !signed) {
            return this.fail({ message: options.badRequestMessage || 'Missing credentials' }, 400);
        }

        let recovered = "";
        if (signType === 'typed') {
            const params = {
                data: JSON.parse(message),
                signature: signed,
                version: SignTypedDataVersion.V4
            };
            recovered = sigUtil.recoverTypedSignature(params);

        } else if (signType === 'personal') {
            const params = {
                data: message,
                signature: signed
            };
            recovered = sigUtil.recoverPersonalSignature(params);

        } else {
            /*
            This is like, literally the only thing I wrote. Thanks Jared and web3.js!
            -- <3, psychobunny
            */
            var accounts = new Accounts();
            recovered = accounts.recover(message, signed);
            /* if (address === accounts.recover(message, signed)) {
              return this.fail({ message: options.badRequestMessage || 'Ooops. Signed message does not match address and message.' }, 400);
            } */
        }

        if (address.toLowerCase() !== recovered.toLowerCase()) {
            return this.fail({ message: options.badRequestMessage || 'Ooops. Signed message does not match address and message.' }, 400);
        }

        const verified = (err: Error, user: any, info: number) => {
            if (err) { return this.error(err); }
            if (!user) { return this.fail(info); }
            this.success(user, info);
        }

        try {
            if (this._passReqToCallback) {
                this._verify(req, address, message, signed, verified);
            } else {
                this._verify(address, message, signed, verified);
            }
        } catch (ex: any) {
            return this.error(ex);
        }
    }
}

export default Strategy;