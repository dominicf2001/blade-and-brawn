import { productRecords } from "./data/product-records.ts";
import { Printful } from "./printful.ts"
import { Webflow } from "./webflow.ts";

const server = Bun.serve({
    routes: {
        "/test": {
            async GET(req) {
                return Response.json("Hello world");
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

                return Response.json("Hello world");
            }
        }
    },
    development: true
})

console.log(`Listening on ${server.url}`);
