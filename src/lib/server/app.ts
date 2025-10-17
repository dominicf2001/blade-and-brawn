import { Elysia, NotFoundError } from "elysia";
import { cors } from "@elysiajs/cors";
import { LevelCalculator, Standards, type ActivityStandards } from "$lib/services/calculator/main";
import type { ActivityPerformance, Player } from "$lib/services/calculator/util";
import rawStandards from "$lib/data/standards.json" assert { type: "json" }
import { Printful, Webflow } from "../services/commerce/util/types";
import WebflowService from "../services/commerce/webflow";
import SyncService from "../services/commerce/sync";
import PrintfulService from "../services/commerce/printful";
import { FetchError, getStateFromZip } from "../services/commerce/util/misc";

export const app = new Elysia({ prefix: "/api" })
	.use(cors({ origin: '*' }))

	.error({
		FetchError
	})

	.onError(async ({ code, error }) => {
		switch (code) {
			case "FetchError":
				console.error(error.message, await error.parse());
				return error;
		}
	})

	.get("/", () => "Hello world")

	// CALCULATOR

	.post("/calculate", async ({ body }) => {
		const MAIN_STANDARDS = new Standards(rawStandards as ActivityStandards);
		interface CalcRequest {
			player: Player;
			activityPerformances: ActivityPerformance[];
		}
		const { player, activityPerformances } = body as CalcRequest;
		const levelCalculator = new LevelCalculator(MAIN_STANDARDS);
		return { levels: levelCalculator.calculate(player, activityPerformances) };
	})

	// COMMERCE
	.group("/products", app => app
		.group("/sync", app => app
			.get("/", async ({ }) => SyncService.state)
			.post("/:printfulProductId?", async ({ params }) => {
				const printfulProductId = params.printfulProductId ?
					+params.printfulProductId :
					undefined;
				await SyncService.sync(printfulProductId);
			})
		)
		.get("/:printfulProductId", async ({ params }) => {
			const printfulProductId = +params.printfulProductId;
			const printfulProduct = await PrintfulService.Products.get(printfulProductId);
			if (!printfulProduct) {
				return new NotFoundError();
			}

			const webflowProductId = printfulProduct.sync_product.external_id.split("-")[0];
			const webflowProduct = await WebflowService.Products.get(webflowProductId);

			return { printfulProduct, webflowProduct };
		})
	)

	// WEBHOOKS
	.post("/webhook/printful", async ({ body }) => {
		const payload = body as Printful.Webhook.EventPayload;

		console.log("Hit webhook", payload.type);

		switch (payload.type) {
			case Printful.Webhook.Event.ProductUpdated: {
				const printfulProduct = payload.data.sync_product;
				await SyncService.sync(printfulProduct.id);
				break;
			}
			case Printful.Webhook.Event.ProductDeleted: {
				await WebflowService.Products.remove(payload.data.sync_product.external_id);
				break;
			}
			case Printful.Webhook.Event.PackageShipped: {
				const webflowOrderId = payload.data.order.external_id;
				const shipInfo = payload.data.shipment;

				await WebflowService.Orders.update(webflowOrderId, {
					shippingTrackingURL: shipInfo.tracking_url,
					shippingTracking: shipInfo.tracking_number,
					shippingProvider: shipInfo.carrier
				});
				await WebflowService.Orders.fulfill(webflowOrderId, { sendOrderFulfilledEmail: true });
				break;
			}
		}
	})
	.post("/webhook/webflow", async ({ request, body, set }) => {
		if (!WebflowService.Util.verifyWebflowSignature(request, body)) {
			set.status = 400;
			return "Invalid signature";
		}

		const payload = body as Webflow.Webhook.EventPayload;

		switch (payload.triggerType) {
			case Webflow.Webhook.Event.OrderCreated: {
				const webflowOrder = payload.payload;

				await PrintfulService.Orders.create({
					external_id: webflowOrder.orderId,
					// TODO: derive from webflow
					shipping: "STANDARD",
					recipient: {
						name: webflowOrder.shippingAddress.addressee,
						address1: webflowOrder.shippingAddress.line1,
						address2: webflowOrder.shippingAddress.line2,
						city: webflowOrder.shippingAddress.city,
						state_code: getStateFromZip(webflowOrder.shippingAddress.postalCode),
						country_code: webflowOrder.shippingAddress.country,
						zip: webflowOrder.shippingAddress.postalCode
					},
					items: webflowOrder.purchasedItems.map(webflowOrderSku => ({
						external_variant_id: webflowOrderSku.variantId,
						quantity: webflowOrderSku.count
					}))
				});

				console.log("Complete");

				break;
			}
		}
	});
