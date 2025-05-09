import { Field, ObjectType } from "type-graphql";
import { OGProfile } from "../../../../lib";

@ObjectType('OgProfile')
export default class OgProfileType {
    private wrapped: OGProfile;

    constructor(wrap: OGProfile){
        this.wrapped = wrap;
    }

    @Field(type => BigInt)
    get OgId() {
        return this.wrapped.ogId;
    };

    @Field(type => String)
    get Name() {
        return this.wrapped.ogName;
    };

    @Field(type => String, { nullable: true })
    get Details() {
        return this.wrapped.ogDetails;
    };

    @Field(type => String, { nullable: true })
    get Image() {
        return this.wrapped.ogImage;
    };

    @Field(type => String, { nullable: true })
    get Website() {
        return this.wrapped.ogWebsite;
    };
}