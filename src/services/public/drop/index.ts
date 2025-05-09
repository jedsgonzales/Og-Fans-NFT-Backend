import { getBunyanLogger } from "@edenholdings/web3-libs";
import express, { Express, Request, Response } from "express";
import { DropMetadata, OGCelebMetadata, OGProfile, ScheduleDropInfo } from "../../../lib";
import { LoadableService, ServiceParams } from "../../../types";

const logger = getBunyanLogger('og-metadata-api', { env: process.env.NODE_ENV });

export default class OGMetadataService implements LoadableService {
    constructor(args: any) { }

    serviceName() {
        return "DropMetadataService";
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

        ogMetadataService.get(`/:drop.json`, middlewareChainMap.public, this.getMetadata);

        return ogMetadataService;
    }

    async getMetadata(req: Request, res: Response) {
        const { drop } = req.params;

        const dropSchedule = new ScheduleDropInfo(Number(drop));
        if( await dropSchedule.load() ){
            const metadata = new DropMetadata(Number(drop));
            await metadata.load();

            const metadataJSON = JSON.parse(metadata.metadataContent);

            res.send({
                ...metadataJSON,
                name: metadataJSON.name || dropSchedule.collectionName,
                description: metadataJSON.description || dropSchedule.collectionDetails,
                image: metadataJSON.image || dropSchedule.collectionImage,
            });
        } else {
            res.status(404).send('Drop Collection Does Not Exists');
        }
      }
}