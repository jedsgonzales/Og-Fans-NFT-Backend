import { BuildSchemaOptions } from "type-graphql";
import ContractResolver from "./ContractResolver";
import ScheduleDropResolver from "./ScheduleDropResolver";
import OgProfileResolver from "./OgProfileResolver";
import InventoryResolver from "./InventoryResolver";

const resolvers:BuildSchemaOptions['resolvers'] = [
    ContractResolver,
    ScheduleDropResolver,
    OgProfileResolver,
    InventoryResolver,
];

export default resolvers;