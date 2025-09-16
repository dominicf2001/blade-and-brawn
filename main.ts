import { ActivityStandards, LevelCalculator, Standards } from "./calculator/calc.ts";
import { ActivityPerformance, Player } from "./calculator/util.ts";
import { Printful } from "./commerce/printful.ts"
import { Webflow } from "./commerce/webflow.ts";
import rawStandards from "./data/standards.json" assert { type: "json" }

interface CalcRequest {
    player: Player,
    activityPerformances: ActivityPerformance[]
}

export class ClientResponse extends Response {
    constructor(body?: BodyInit | null, init: ResponseInit = {}) {
        const headers = new Headers(init.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
        super(body, { ...init, headers });
    }

    static json(data: unknown, init: ResponseInit = {}) {
        const body = JSON.stringify(data);
        const headers = new Headers(init.headers);
        headers.set("Content-Type", "application/json");
        return new ClientResponse(body, { ...init, headers });
    }
}

const MAIN_STANDARDS = new Standards(rawStandards as ActivityStandards);

const server = Bun.serve({
    idleTimeout: 180,
    routes: {
        "/calc": {
            OPTIONS() {
                return new ClientResponse(undefined, { status: 204 });
            },
            async POST(req) {
                const calcReq: CalcRequest = await req.json();
                const { player, activityPerformances } = calcReq;

                const levelCalculator = new LevelCalculator(MAIN_STANDARDS);

                return ClientResponse.json({
                    levels: levelCalculator.calculate(player, activityPerformances)
                })
            }
        },
        "/products/sync": {
            OPTIONS() {
                return new ClientResponse(undefined, { status: 204 });
            },
            async POST(req) {
                const printfulProducts = await Printful.Products.getAll();

                // handle update/create
                for (const printfulProduct of printfulProducts) {
                    const webflowProductExists = await Webflow.Products.exists(printfulProduct.sync_product.external_id);
                    if (webflowProductExists) {
                        await Webflow.Products.updateUsingPrintful(printfulProduct);
                    }
                    else {
                        await Webflow.Products.createUsingPrintful(printfulProduct);
                    }
                    console.log("DONE");
                }

                // handle delete (TODO)

                return ClientResponse.json({});
            }
        },
        "/webhook/printful": {
            OPTIONS() {
                return new ClientResponse(undefined, { status: 204 });
            },
            async POST(req) {
                const payload: Printful.Webhook.EventPayload = await req.json()
                try {
                    switch (payload.type) {
                        // ADD/UPDATE
                        case Printful.Webhook.Event.ProductUpdated: {
                            const printfulProduct = await Printful.Products.get(payload.data.sync_product.id);
                            const webflowProductExists = await Webflow.Products.exists(printfulProduct.sync_product.external_id);
                            if (webflowProductExists) {
                                await Webflow.Products.updateUsingPrintful(printfulProduct);
                            }
                            else {
                                await Webflow.Products.createUsingPrintful(printfulProduct);
                            }
                            break;
                        }
                        // DELETE
                        case Printful.Webhook.Event.ProductDeleted: {
                            const webflowProductId = payload.data.sync_product.external_id;
                            await Webflow.Products.remove(webflowProductId);
                            break;
                        }
                    }
                }
                catch (error) {
                    console.error(error);
                    ClientResponse.error();
                }

                return ClientResponse.json("");
            }
        }
    },
    development: true
})

console.log(`Listening on ${server.url}`);
