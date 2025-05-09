import { registerEnumType } from "type-graphql";

export enum UserNftScope {
    ALL = "ALL",
    OPENED = "UNLOCKED",
    LOCKED = "LOCKED"
}

registerEnumType(UserNftScope, {
    name: "UserNFTQueryScope", // this one is mandatory
    description: "Scope for querying user NFTs", // this one is optional
});