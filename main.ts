import { Printful } from "./printful.ts"
import { ProductRecords } from "./storage.ts"

const productRecords = new ProductRecords();

const server = Bun.serve({
    routes: {
        "/webhook/printful": {
            async POST(req) {
                const payload: Printful.Webhook.EventPayload = await req.json()

                switch (payload.type) {
                    case Printful.Webhook.Event.ProductUpdated:
                        const productRecord = productRecords.findFromPrintful(payload.data.sync_product.id)
                        if (productRecord) {

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
