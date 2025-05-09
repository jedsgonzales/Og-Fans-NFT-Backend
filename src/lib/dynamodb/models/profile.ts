import { DynamoDbTable, DynamoDbTableAttr, DynamoDbTableHash, DynamoDbTableRange, IDynamoDbTable } from "@edenholdings/web3-libs";

export const OG_PROFILE_INFO = "OGProfileData";

const OGProfileRecordTypes = [OG_PROFILE_INFO ] as const;
export type OGProfileRecordType = typeof OGProfileRecordTypes[number];

@DynamoDbTable('OGProfiles')
export class OGProfile {
    get id():number {
        return this.ogId;
    }

    constructor(id:number = 0){
        this.ogId = id;
    }

    @DynamoDbTableHash()
    ogId: number = 0;

    @DynamoDbTableRange()
    recordSubId: string = OG_PROFILE_INFO;

    @DynamoDbTableAttr()
    ogName: string = '';

    @DynamoDbTableAttr()
    updatedOnBlock: number = 0;

    @DynamoDbTableAttr()
    transactionHash: string = '';

    @DynamoDbTableAttr()
    disabled: boolean = false;

    // Manually Supplied Attributes
    @DynamoDbTableAttr()
    ogDetails: string = '';

    @DynamoDbTableAttr()
    ogImage: string = '';

    @DynamoDbTableAttr()
    ogWebsite: string = '';

}

export interface OGProfile extends IDynamoDbTable<any> {}