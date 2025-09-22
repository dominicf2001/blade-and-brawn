import { treaty } from "@elysiajs/eden";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { LevelCalculator, Standards, type ActivityStandards } from "$lib/services/calculator/main";
import type { ActivityPerformance, Player } from "$lib/services/calculator/util";
import { Webflow } from "$lib/services/commerce/webflow";
import { Printful } from "$lib/services/commerce/printful";
import rawStandards from "$lib/data/standards.json" assert { type: "json" }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

	.post("/products/sync", async ({ body, set }) => {
		console.log("Syncing...");
		const printfulProducts = await Printful.Products.getAll();
		const webflowProducts = await Webflow.Products.getAll();
		for (const printfulProduct of printfulProducts) {
			await sleep(2000);
			console.log(printfulProduct.name, printfulProduct.id, printfulProduct.external_id);
			const fullPrintfulProduct = await Printful.Products.get(printfulProduct.id);

			let webflowProduct = webflowProducts
				.find(webflowProduct => webflowProduct.product.id === printfulProduct.external_id);
			if (webflowProduct)
				await Webflow.Products.updateUsingPrintful(fullPrintfulProduct);
			else
				webflowProduct = await Webflow.Products.createUsingPrintful(fullPrintfulProduct);
			await Webflow.Products.syncImages(webflowProduct);
		}
		console.log("Done");
		return "";
	}, {
		error({ error }) {
			console.error(error);
			return {
				message: "Failed to sync products",
				error
			}
		}
	})

	// WEBHOOKS

	.post("/webhook/printful", async ({ body, set }) => {
		const payload = body as Printful.Webhook.EventPayload;
		switch (payload.type) {
			case Printful.Webhook.Event.ProductUpdated: {
				const printfulProduct = await Printful.Products.get(payload.data.sync_product.id);

				let webflowProduct = await Webflow.Products.get(printfulProduct.sync_product.external_id);
				if (webflowProduct)
					await Webflow.Products.updateUsingPrintful(printfulProduct);
				else
					webflowProduct = await Webflow.Products.createUsingPrintful(printfulProduct);
				await Webflow.Products.syncImages(webflowProduct);

				break;
			}
			case Printful.Webhook.Event.ProductDeleted: {
				await Webflow.Products.remove(payload.data.sync_product.external_id);
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

export type App = typeof app;

const apiWrapper = treaty<App>(app);
export const api = apiWrapper.api;

