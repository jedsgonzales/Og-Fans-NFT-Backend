export interface GraphQLComposition {
    types: {
        [typeName:string]: string;
    };
    inputs: {
        [inputTypeName:string]: string;
    };
    resolvers: {
        [functionInterface:string]: {
            resultType?: string;
            function: Function;
            middlewares?: Function | Function[];
        }
    }
}

export interface GraphQLManifest {
    [schemaPath:string]: GraphQLComposition;
}

export default GraphQLManifest;