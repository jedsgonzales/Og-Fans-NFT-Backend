import { DynamoDbTable, DynamoDbTableAttr, DynamoDbTableHash, DynamoDbTableRange, IDynamoDbTable } from "@edenholdings/web3-libs";

@DynamoDbTable('AppVars')
export class AppVar {
    @DynamoDbTableHash()
    appName: string = "";

    @DynamoDbTableRange()
    varName: string = "";

    @DynamoDbTableAttr()
    varValue: string = "";

    constructor(appName:string = "", varName:string = "") {
        this.appName = appName;
        this.varName = varName.toUpperCase().replaceAll(/\s+/g, '_');
    }
}

export interface AppVar extends IDynamoDbTable<any> {}