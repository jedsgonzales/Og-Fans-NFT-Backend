import { getBunyanLogger } from "@edenholdings/web3-libs";
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { ApolloServer, AuthenticationError } from 'apollo-server-express';
import { BigIntResolver, JSONMock, JSONObjectResolver } from 'graphql-scalars';
import os from 'os';
import path from 'path';
import { buildSchema, ResolverData } from 'type-graphql';
import { LoadableService, RequestContext, ServiceParams } from "../../../types";
import { isAdmin, loadUserCredential } from '../../auth';
import resolvers from './resolvers';

const logger = getBunyanLogger('graphql', { env: process.env.NODE_ENV });

const tmpdir = os.tmpdir();

export const hotPlugFile = path.join(tmpdir, 'GraphQLServiceDisabled');

export default class GraphQLService implements LoadableService {
  
  constructor(args:any){
    
  }

  serviceName() {
    return "GraphQLService";
  }

  version() {
    return 1.0;
  }

  hotPlugControlFile(){
    return hotPlugFile;
  }

  public createService({expressApp, httpServer}:ServiceParams) {
    logger.info(`Service register`, this.serviceName());

    const metadataSvc:false = false; //express();

    const roleCheckCache:{
      [id:string]: {
        [role:string]: boolean;
      }
    } = {};

    buildSchema({
      resolvers,
      scalarsMap: [
        { type: BigInt, scalar: BigIntResolver },
        { type: JSONMock, scalar: JSONObjectResolver }
      ],
      authChecker: ({ root, args, context: { user }, info }:ResolverData<RequestContext>, roles:string[]) => {
        // TODO
    
        // here we can read the user from context
        // and check his permission in the db against the `roles` argument
        // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]

        // if roles are defined on model, use it
        // otherwise:
        //  check from auth isAdmin
        //  check contract for role
        let allowed = false;

        if(user){
          roleCheckCache[`${user.id}`] ||= {};

          if(roles.length > 0){
            for(const role of roles){
              // consult cache first
              if(roleCheckCache[`${user.id}`][role] !== undefined){
                allowed = allowed || roleCheckCache[user.id][role];

              } else { // load and save to cache
                let pass = false;
                switch(role){
                  case "ADMIN":
                  case "ADMINISTRATOR":
                  case "ROOT":
                    pass = isAdmin(user.id);
                    // important: no-break here, this is not a mistake
                  default:
                    pass = (user.roles || []).includes(role) || pass;
                    break;
                }

                allowed = allowed || pass;
  
                roleCheckCache[user.id][role] = pass;
              }
            }
          } else {
            return true;
          }
        }

        return allowed;
      },
    })
      .then(schema => {
        const setHttpPlugin = {
          async requestDidStart() {
            return {
              async willSendResponse({ response }: any) {
                // response.http.headers.set('Custom-Header', 'hello');
                response?.errors?.forEach((error: any) => {
                  if (error.message.indexOf('Access denied')) {
                    response.http.status = 401;
                  }
                });
              }
            };
          }
        };
        
        const graphqlServer = new ApolloServer({
          schema,
          plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), setHttpPlugin],
          context: async ({ req, res }) => {
            // Note: This example uses the `req` argument to access headers,
            // but the arguments received by `context` vary by integration.
            // This means they vary for Express, Koa, Lambda, etc.
            //
            // To find out the correct arguments for a specific integration,
            // see https://www.apollographql.com/docs/apollo-server/api/apollo-server/#middleware-specific-context-fields
        
            // Try to retrieve a user with the token
            const user = await loadUserCredential(req); // AccountSession class
            logger.debug('User', user);
        
            // Add the user to the context
            return { user };
          },
          cache: "bounded",
          introspection: true,
        });

        graphqlServer.start()
          .then(() => {
            graphqlServer.applyMiddleware({ app: expressApp });
            logger.info(`🚀 GraphQL Server ready at ${graphqlServer.graphqlPath}`);
          })
          .catch(eee => {
            logger.error(eee);
          });
      });

    return metadataSvc;
  }

}

