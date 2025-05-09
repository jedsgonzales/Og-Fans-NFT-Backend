import { Field, ObjectType } from "type-graphql";

import { OGProfile, ScheduleDropInfo } from "../../../../lib/dynamodb/models/index";
import OgProfileType from "./OgProfileType";

@ObjectType('ScheduleDropInfo')
export default class ScheduleDropInfoType {
    private wrapped:ScheduleDropInfo;

    constructor(wrap:ScheduleDropInfo){
        this.wrapped = wrap;
    }

    @Field(type => BigInt)
    get DropId() {
        return this.wrapped.dropId;
    };

    @Field(type => BigInt)
    get OgId() {
        return this.wrapped.ogListId;
    };

    @Field(() => BigInt)
    get DropSchedule() {
        return this.wrapped.dropScheduleTime;
    }

    @Field(() => BigInt)
    get DropEventTime(){
        return this.wrapped.dropEventTime;
    }

    @Field(() => BigInt)
    get DropOGId() {
        return this.wrapped.ogListId;
    }

    @Field(() => BigInt)
    get DropAllocation() {
        return this.wrapped.dropAllocation;
    }

    @Field(() => Number)
    get DropMintLimit() {
        return this.wrapped.dropMintingLimit;
    }

    @Field(() => BigInt)
    get DropMintPrice() {
        return this.wrapped.dropMintingPrice;
    }

    @Field(() => BigInt)
    get DropSellOffs() {
        return this.wrapped.dropSellOffs;
    }

    @Field(() => String)
    get DropScheduler(){
        return this.wrapped.dropScheduler;
    }

    @Field(() => Boolean)
    get DropIsPaused() {
        return this.wrapped.dropIsPaused;
    }

    @Field(() => Boolean)
    get DropIsSoldOut(){
        return this.wrapped.dropIsSoldOut;
    }

    @Field(() => Number, { nullable: true})
    get DropPausedOn(){
        return this.wrapped.dropPausedOn;
    }

    @Field(() => Number, { nullable: true})
    get DropSoldOutOn(){
        return this.wrapped.dropIsSoldOutOn;
    }

    @Field(() => String)
    get CollectionName(){
        return this.wrapped.collectionName || 'Unnamed Collection';
    }
    
    @Field(() => String, { nullable: true})
    get CollectionDetails(){
        return this.wrapped.collectionDetails;
    }

    @Field(() => String, { nullable: true})
    get DetailMarkup(){
        return this.wrapped.collectionDetailMarkup;
    }

    @Field(() => String)
    get StartTimestamp(){
        return this.wrapped.startTimestamp;
    }

    @Field(() => String)
    get OgName(){
        return this.wrapped.collectionOgName;
    }

    @Field(() => String, { nullable: true })
    get OgPicture(){
        return (this.wrapped.ogProfile && this.wrapped.ogProfile.ogImage) || this.wrapped.collectionOgImage;
    }

    @Field(() => String, { nullable: true })
    get CollectionImage(){
        return this.wrapped.collectionImage || (this.wrapped.ogProfile && this.wrapped.ogProfile.ogImage);
    }

    @Field(() => OgProfileType, { nullable: true })
    get OGProfile(){
        return new OgProfileType(this.wrapped.ogProfile || new OGProfile());
    }
}