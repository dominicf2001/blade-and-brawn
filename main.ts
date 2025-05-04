import { Printful } from "./printful.ts"
import { ProductRecords } from "./database/product-records.ts"
import { Webflow } from "./webflow.ts";

const productRecords = new ProductRecords();

const server = Bun.serve({
    routes: {
        "/test": {
            async GET(req){
                return Response.json("Hello world");
            }
        },
        "/webhook/printful": {
            async POST(req) {
                const payload: Printful.Webhook.EventPayload = await req.json()
                switch (payload.type) {
                    case Printful.Webhook.Event.ProductUpdated:
                        const printfulProduct = await Printful.getSyncProduct(payload.data.sync_product.id)
                        const productRecord = productRecords.findFromPrintful(payload.data.sync_product.id)

                        if (productRecord) {
                            await Webflow.createProduct(printfulProduct, productRecords);
                        }
                        else {

                        }
                        break;
                    case Printful.Webhook.Event.ProductDeleted:
                        break;
                }

                return Response.json("Hello world")
            }
        }
    },
    development: true
})

console.log(`Listening on ${server.url}`);
