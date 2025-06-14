import { calcAttributeLevels, calcPlayerLevel, computeLevels } from "./calculator/calc.ts";
import { activities, Activity, BenchmarkPerformance, Gender, genders } from "./calculator/util.ts";
import { productRecords } from "./data/product-records.ts";
import { Printful } from "./printful.ts"
import { Webflow } from "./webflow.ts";

interface CalcRequest {
    player: {
        age: number,
        weightKG: number,
        gender: Gender
    }
    performances: {
        activity: Activity,
        performance: number,
    }[]
}

const server = Bun.serve({
    routes: {
        "/calc": {
            async GET(req) {
                const calcReq: CalcRequest = await req.json();
                const { player, performances } = calcReq;

                console.log(calcReq);

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

                return Response.json({
                    levels: {
                        attributes: calcAttributeLevels(computedPerformances),
                        player: calcPlayerLevel(computedPerformances)
                    }
                });
            }
        },
        "/webhook/printful": {
            async POST(req) {
                const payload: Printful.Webhook.EventPayload = await req.json()
                console.log(JSON.stringify(payload));
                console.log("PRINTFUL WEBHOOK: " + payload.type);
                try {
                    switch (payload.type) {
                        // ADD/UPDATE
                        case Printful.Webhook.Event.ProductUpdated: {
                            const printfulProduct = await Printful.getSyncProduct(payload.data.sync_product.id);
                            const productRecord = productRecords.findFromPrintful(payload.data.sync_product.id);

                            if (productRecord) {
                                await Webflow.updateProductFromPrintful(printfulProduct);
                            }
                            else {
                                await Webflow.createProductFromPrintful(printfulProduct);
                            }
                            break;
                        }
                        // DELETE
                        case Printful.Webhook.Event.ProductDeleted: {
                            await Webflow.deleteProductFromPrintful(payload.data.sync_product.id);
                            break;
                        }
                    }
                }
                catch (error) {
                    console.error(error);
                    Response.error();
                }

                return Response.json("");
            }
        }
    },
    development: true
})

console.log(`Listening on ${server.url}`);
