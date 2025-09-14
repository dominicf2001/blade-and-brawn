import { calcAllAttributeLevels, calcPlayerLevel } from "./calculator/calc.ts";
import { ActivityPerformance, Player } from "./calculator/util.ts";
import { Printful } from "./commerce/printful.ts"
import { Webflow } from "./commerce/webflow.ts";

interface CalcRequest {
    player: Player,
    performances: ActivityPerformance[]
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

const server = Bun.serve({
    idleTimeout: 180,
    routes: {
        "/calc": {
            OPTIONS() {
                return new ClientResponse(undefined, { status: 204 });
            },
            async POST(req) {
                const calcReq: CalcRequest = await req.json();
                const { player, performances } = calcReq;

                return ClientResponse.json({
                    levels: {
                        attributes: calcAllAttributeLevels(player, performances),
                        player: calcPlayerLevel(player, performances)
                    }
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
                            await Webflow.Products.remove(payload.data.sync_product.external_id);
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
