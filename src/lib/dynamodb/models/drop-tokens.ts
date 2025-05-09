import { DynamoDbTable, DynamoDbTableAttr, DynamoDbTableHash, DynamoDbTableRange, IDynamoDbTable } from "@edenholdings/web3-libs";
import { DateTime } from "luxon";

/** table for available drop items */
@DynamoDbTable('OGDropTokens')
export class DropScheduleToken {
    @DynamoDbTableHash()
    metadataId: string;

    @DynamoDbTableRange()
    dropId: number = 0;

    @DynamoDbTableAttr()
    name: string = '';

    @DynamoDbTableAttr()
    description: string = '';

    @DynamoDbTableAttr()
    image: string = '';

    @DynamoDbTableAttr()
    webImage: string = '';

    @DynamoDbTableAttr()
    background_color?: string;

    @DynamoDbTableAttr()
    external_url?: string;

    @DynamoDbTableAttr()
    animation_url?: string;

    @DynamoDbTableAttr()
    youtube_url?: string;

    @DynamoDbTableAttr()
    attributes: string = '[]'; // json string array

    @DynamoDbTableAttr()
    properties: string = '{}'; //json string

    constructor(metadataId:string = "", dropId:number = 0) {
        this.metadataId = metadataId ? metadataId : `${DateTime.local().toMillis()}${dropId > 0 ? `-${dropId}` : ''}`;
        this.dropId = dropId;
    }

    toMetadataObject(){
        return {
            name: this.name,
            description: this.description,
            image: this.webImage,
            background_color: this.background_color,
            external_url: this.external_url,
            animation_url: this.animation_url,
            youtube_url: this.youtube_url,
            attributes: JSON.parse(this.attributes),
            properties: JSON.parse(this.properties),
        }
    }
}

export interface DropScheduleToken extends IDynamoDbTable<any> {}
