import { calcAttributeLevels, calcPlayerLevel, computeLevels } from "./calculator/calc.ts";
import { Activity, BenchmarkPerformance, Player } from "./calculator/util.ts";
import { productRecords } from "./commerce/product-records.ts";
import { Printful } from "./commerce/printful.ts"
import { Webflow } from "./commerce/webflow.ts";

interface CalcRequest {
    player: Player,
    performances: {
        activity: Activity,
        performance: number,
    }[]
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
    routes: {
        "/calc": {
            OPTIONS() {
                return new ClientResponse(undefined, { status: 204 });
            },
            async POST(req) {
                const calcReq: CalcRequest = await req.json();
                const { player, performances } = calcReq;

                const computedPerformances: BenchmarkPerformance[] = [];
                for (const p of performances) {
                    computedPerformances.push({
                        activity: p.activity,
                        performance: p.performance,
                        levels: computeLevels(
                            player.age,
                            player.weightKG,
                            player.gender,
                            p.activity
                        )
                    })
                }

                return ClientResponse.json({
                    levels: {
                        attributes: calcAttributeLevels(player, computedPerformances),
                        player: calcPlayerLevel(player, computedPerformances)
                    }
                })
            }
        },
        "/products/sync": {
            OPTIONS() {
                return new ClientResponse(undefined, { status: 204 });
            },
            async POST(req) {
                const printfulProducts = await Printful.Products.getSyncProducts();

                // handle update/create
                for (const printfulProduct of printfulProducts) {
                    const productRecord = productRecords.findUsingPrintful(printfulProduct.sync_product.id);
                    if (productRecord) {
                        await Webflow.updateProductUsingPrintful(printfulProduct);
                    }
                    else {
                        await Webflow.createProductUsingPrintful(printfulProduct);
                    }
                }

                // handle delete
                // for (const productRecord of productRecords.all()) {
                //     const existsInPrintful = printfulProducts
                //         .some(printfulProduct => printfulProduct.sync_product.id === productRecord.printfulProductId);
                //     if (!existsInPrintful) {
                //         await Webflow.deleteProductUsingPrintful(productRecord.printfulProductId);
                //     }
                // }

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
                            const printfulProduct = await Printful.Products.getSyncProduct(payload.data.sync_product.id);
                            const productRecord = productRecords.findUsingPrintful(payload.data.sync_product.id);

                            if (productRecord) {
                                await Webflow.updateProductUsingPrintful(printfulProduct);
                            }
                            else {
                                await Webflow.createProductUsingPrintful(printfulProduct);
                            }
                            break;
                        }
                        // DELETE
                        case Printful.Webhook.Event.ProductDeleted: {
                            await Webflow.deleteProductUsingPrintful(payload.data.sync_product.id);
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
