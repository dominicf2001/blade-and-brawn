import { treaty } from "@elysiajs/eden";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { LevelCalculator, Standards, type ActivityStandards } from "$lib/services/calculator/main";
import type { ActivityPerformance, Player } from "$lib/services/calculator/util";
import { Webflow } from "$lib/services/commerce/webflow";
import { Printful } from "$lib/services/commerce/printful";
import rawStandards from "$lib/data/standards.json" assert { type: "json" }

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
	})

	// COMMERCE

	.post("/products/sync", async () => {
		const printfulProducts = await Printful.Products.getAll();
		for (const p of printfulProducts) {
			const exists = await Webflow.Products.exists(p.sync_product.external_id);
			if (exists) await Webflow.Products.updateUsingPrintful(p);
			else await Webflow.Products.createUsingPrintful(p);
		}
		return {};
	})

	// WEBHOOKS

	.post("/webhook/printful", async ({ body, set }) => {
		const payload = body as Printful.Webhook.EventPayload;
		try {
			switch (payload.type) {
				case Printful.Webhook.Event.ProductUpdated: {
					const prod = await Printful.Products.get(payload.data.sync_product.id);
					const exists = await Webflow.Products.exists(prod.sync_product.external_id);
					if (exists) await Webflow.Products.updateUsingPrintful(prod);
					else await Webflow.Products.createUsingPrintful(prod);
					break;
				}
				case Printful.Webhook.Event.ProductDeleted: {
					await Webflow.Products.remove(payload.data.sync_product.external_id);
					break;
				}
			}
		} catch (error) {
			console.error(error);
			set.status = 500;
			return { error: "internal_error" };
		}
		return "";
	});

export type App = typeof app;

const apiWrapper = treaty<App>(app);
export const api = apiWrapper.api;

