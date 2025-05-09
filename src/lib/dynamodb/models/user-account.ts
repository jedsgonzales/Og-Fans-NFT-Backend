import { ADDRESS_0, DynamoDbTable, DynamoDbTableAttr, DynamoDbTableHash, DynamoDbTableRange, IDynamoDbTable, GraphQLEthereumWallet } from "@edenholdings/web3-libs";

import { UserLike } from "../../../types";

export const AUTH_SESSION_TYPE = "AuthSession";
export const USER_DATA_TYPE = "UserData";

const UserDataTypeValues = [ AUTH_SESSION_TYPE, USER_DATA_TYPE ] as const;
export type UserDataTypes = typeof UserDataTypeValues[number];

const AuthSessionOnly = [ AUTH_SESSION_TYPE ] as const;
export type AccountSessionRecord = typeof AuthSessionOnly[number];

@DynamoDbTable('Accounts')
export class AccountSession {
    @DynamoDbTableHash()
    ethWallet: string = "";

    @DynamoDbTableRange()
    recordSubId: AccountSessionRecord = AUTH_SESSION_TYPE;

    @DynamoDbTableAttr()
    signHash?: string;

    @DynamoDbTableAttr()
    secretHash?: string;

    @DynamoDbTableAttr()
    loginHash?: string;

    @DynamoDbTableAttr()
    sessionToken?: string;

    @DynamoDbTableAttr()
    sessionTime?: string;

    @DynamoDbTableAttr()
    displayName?: string;

    @DynamoDbTableAttr()
    userRoles?: string;

    @DynamoDbTableAttr({ castTo: { type: 'Hash', memberType: Object } })
    userPref?: { [key: string]: Object; };

    get id():string {
        return this.ethWallet;
    }

    get roles():string[] {
        return (this.userRoles || "").split(',');
    }
}

export interface AccountSession extends UserLike, IDynamoDbTable<any> {}

const UserProfileOnly = [ USER_DATA_TYPE ] as const;
export type AccountDataRecord = typeof UserProfileOnly[number];

@DynamoDbTable('Accounts')
export class AccountData {
    @DynamoDbTableHash()
    ethWallet: string = "";

    @DynamoDbTableRange()
    recordSubId: AccountDataRecord = USER_DATA_TYPE;

    @DynamoDbTableAttr()
    firstName?:string;

    @DynamoDbTableAttr()
    lastName?:string;

    @DynamoDbTableAttr()
    displayName?:string;

    @DynamoDbTableAttr()
    userRoles?: string;

    get id():string {
        return this.ethWallet;
    }

    get roles():string[] {
        return (this.userRoles || "").split(',');
    }
}

export interface AccountData extends IDynamoDbTable<any>, UserLike {}

export const loadAccountSession = async (ethWallet: string) => {
    const dataInstance = Object.assign(new AccountSession, { ethWallet });
    await dataInstance.load();

    return dataInstance;
}

export const loadAccountData = async (ethWallet: string) => {
    const dataInstance = Object.assign(new AccountData, { ethWallet });
    await dataInstance.load();

    return dataInstance;
}