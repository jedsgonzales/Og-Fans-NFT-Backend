import { getBunyanLogger } from "@edenholdings/web3-libs";
import express, { Express, Request, Response } from "express";
import { OGCelebMetadata, OGProfile } from "../../../lib";
import { LoadableService, ServiceParams } from "../../../types";

const logger = getBunyanLogger('og-metadata-api', { env: process.env.NODE_ENV });

export default class OGMetadataService implements LoadableService {
    constructor(args: any) { }

    serviceName() {
        return "OGMetadataService";
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

        ogMetadataService.get(`/:ogid.json`, middlewareChainMap.public, this.getMetadata);

        return ogMetadataService;
    }

    async getMetadata(req: Request, res: Response) {
        const { ogid } = req.params;

        const ogProfile = new OGProfile(Number(ogid));
        if( await ogProfile.load() ){
            const metadata = new OGCelebMetadata(Number(ogid));
            await metadata.load();

            const metadataJSON = JSON.parse(metadata.metadataContent);

            res.send({
                ...metadataJSON,
                name: metadataJSON.name || ogProfile.ogName,
                description: metadataJSON.description || ogProfile.ogDetails,
                image: metadataJSON.image || ogProfile.ogImage,
            });
        } else {
            res.status(404).send('OG Profile Does Not Exists');
        }
      }
}