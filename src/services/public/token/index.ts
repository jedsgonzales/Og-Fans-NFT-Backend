import { getBunyanLogger } from "@edenholdings/web3-libs";
import express, { Express, Request, Response } from "express";
import { DropMetadata, OGCelebMetadata, OGProfile, ScheduleDropInfo, TokenMetadata } from "../../../lib";
import { LoadableService, ServiceParams } from "../../../types";

const logger = getBunyanLogger('og-metadata-api', { env: process.env.NODE_ENV });

export default class OGMetadataService implements LoadableService {
    constructor(args: any) { }

    serviceName() {
        return "TokenMetadataService";
    }

    version() {
        return 1.0;
    }

    hotPlugControlFile() {
        return '';
    }

    public createService({ middlewareChainMap, middlewares }: ServiceParams) {
        logger.info(`Service register`, this.serviceName());

        const ogMetadataService = express();

        //set default response type to json
        ogMetadataService.use(function (req: Request, res: Response, next: Function) {
            res.header("Content-Type", 'application/json');
            next();
        });

        ogMetadataService.get(`/:id.json`, middlewareChainMap.public, this.getMetadata);

        return ogMetadataService;
    }

    async getMetadata(req: Request, res: Response) {
        const { id } = req.params;

        const token = new TokenMetadata(Number(id));
        if( await token.load() ){
            const metadata = JSON.parse(token.locked ? (token.lockedContent || "{}") : token.metadataContent);

            // use drop metadata as 1st fallback
            const dropSchedule = !!token.dropId && new ScheduleDropInfo(Number(token.dropId));

            // use og profile metadata as 2nd fallback
            const ogProfile = !!token.ogId && new OGProfile(Number(token.ogId));

            res.send({
                ...metadata,
                name: metadata.name || ( dropSchedule && dropSchedule.collectionName ) || ( ogProfile && `${ogProfile.ogName} Collection` ) || `NFT #${id}`,
                description: metadata.description ( dropSchedule && dropSchedule.collectionDetails ) || ( ogProfile && ogProfile.ogDetails ) || ``,
                image: metadata.image ( dropSchedule && dropSchedule.collectionImage ) || ( ogProfile && ogProfile.ogImage ) || ``,
            });
        } else {
            res.status(404).send('Token Metadata Does Not Exists');
        }
      }
}