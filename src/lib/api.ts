import { treaty } from "@elysiajs/eden";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { LevelCalculator, Standards, type ActivityStandards } from "$lib/services/calculator/main";
import type { ActivityPerformance, Player } from "$lib/services/calculator/util";
import rawStandards from "$lib/data/standards.json" assert { type: "json" }
import { Printful } from "./services/commerce/util/types";
import WebflowService from "./services/commerce/webflow";
import PrintfulService from "./services/commerce/printful";
import SyncService from "./services/commerce/sync";

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
				SyncService.state.isSyncing = true;
				SyncService.state.printfulProductId = params.printfulProductId ?
					+params.printfulProductId :
					undefined;

				const printfulProducts = params.printfulProductId ?
					[(await PrintfulService.Products.get(+params.printfulProductId)).sync_product] :
					await PrintfulService.Products.getAll();

				await SyncService.sync(printfulProducts);
				return "";
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
	)

	// WEBHOOKS
	.post("/webhook/printful", async ({ body }) => {
		const payload = body as Printful.Webhook.EventPayload;
		switch (payload.type) {
			case Printful.Webhook.Event.ProductUpdated: {
				const printfulProduct = payload.data.sync_product;
				await SyncService.sync([printfulProduct]);
				break;
			}
			case Printful.Webhook.Event.ProductDeleted: {
				await WebflowService.Products.remove(payload.data.sync_product.external_id);
				break;
			}
		}
		return "";
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

