import { treaty } from "@elysiajs/eden";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { LevelCalculator, Standards, type ActivityStandards } from "$lib/services/calculator/main";
import type { ActivityPerformance, Player } from "$lib/services/calculator/util";
import rawStandards from "$lib/data/standards.json" assert { type: "json" }
import { Printful } from "./services/commerce/util/types";
import WebflowService from "./services/commerce/webflow";
import SyncService from "./services/commerce/sync";
import PrintfulService from "./services/commerce/printful";

export const app = new Elysia({ prefix: "/api" })
	.use(cors({
		origin: '*'
	}))

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
	}, {
		error({ error }) {
			console.error(error);
			return {
				message: "Failed to calculate",
				error
			}
		}
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
			}, {
				error({ error }) {
					console.error(error);
					return {
						message: "Failed to sync product(s)",
						error
					}
				}
			})
		)
		.get("/:printfulProductId", async ({ params }) => {
			const printfulProductId = +params.printfulProductId;
			const printfulProduct = await PrintfulService.Products.get(printfulProductId);

			const webflowProductId = printfulProduct.sync_product.external_id.split("-")[0];
			const webflowProduct = await WebflowService.Products.get(webflowProductId);

			return { printfulProduct, webflowProduct };
		})
	)

	// WEBHOOKS
	.post("/webhook/printful", async ({ body }) => {
		const payload = body as Printful.Webhook.EventPayload;
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
		}
	}, {
		error({ error }) {
			console.error(error);
			return {
				message: "Failed to execute webhook",
				error
			}
		}
	});

export const api = treaty<typeof app>("localhost:5173").api;

