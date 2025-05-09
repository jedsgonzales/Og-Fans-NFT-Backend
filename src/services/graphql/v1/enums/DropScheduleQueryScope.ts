import { registerEnumType } from "type-graphql";

export enum DropScheduleQueryScope {
    ALL = "ALL",
    ACTIVE = "ACTIVE",
    UPCOMING = "UPCOMING",
    PAST = "PAST",
}

registerEnumType(DropScheduleQueryScope, {
    name: "DropScheduleQueryScope", // this one is mandatory
    description: "Scope for querying DropSchedules", // this one is optional
});