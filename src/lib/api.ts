import { treaty } from "@elysiajs/eden";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { LevelCalculator, Standards, type ActivityStandards } from "$lib/services/calculator/main";
import type { ActivityPerformance, Player } from "$lib/services/calculator/util";
import { Webflow } from "$lib/services/commerce/webflow";
import { Printful } from "$lib/services/commerce/printful";
import rawStandards from "$lib/data/standards.json" assert { type: "json" }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const syncProduct = async (printfulProduct: Printful.Products.Product) => {
	let webflowProduct = await Webflow.Products.get(printfulProduct.sync_product.external_id);
	if (webflowProduct)
		await Webflow.Products.updateUsingPrintful(printfulProduct);
	else
		webflowProduct = await Webflow.Products.createUsingPrintful(printfulProduct);
	await Webflow.Products.syncImages(webflowProduct);
};

export const app = new Elysia({ prefix: "/api" })
	.use(cors({
		origin: '*'
	}))

	.get("/", () => "Hello world")

	// CALCULATOR

	.post("/calculate", async ({ body, store }) => {
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
			.state("job", {
				isSyncing: false,
				printfulProductId: undefined as undefined | number
			})
			.get("/", async ({ store }) => {
				return store.job;
			})
			.post("/:printfulProductId?", async ({ params, store }) => {
				if (store.job.isSyncing) return "";
				store.job.isSyncing = true;
				try {
					if (params.printfulProductId) {
						const printfulProductId = +params.printfulProductId;

						store.job.printfulProductId = printfulProductId;

						const printfulProduct = await Printful.Products.get(printfulProductId);
						await syncProduct(printfulProduct);
					}
					else {
						console.log("Syncing all products...");

						const printfulProducts = await Printful.Products.getAll();
						const webflowProducts = await Webflow.Products.getAll();
						for (const printfulProduct of printfulProducts) {
							store.job.printfulProductId = printfulProduct.id;

							await sleep(2000);
							const fullPrintfulProduct = await Printful.Products.get(printfulProduct.id);

							let webflowProduct = webflowProducts
								.find(webflowProduct => webflowProduct.product.id === printfulProduct.external_id);
							if (webflowProduct)
								await Webflow.Products.updateUsingPrintful(fullPrintfulProduct);
							else
								webflowProduct = await Webflow.Products.createUsingPrintful(fullPrintfulProduct);
							await Webflow.Products.syncImages(webflowProduct);
						}
					}
					console.log("Done");
					return "";
				}
				catch (error) {
					throw error;
				}
				finally {
					store.job.isSyncing = false;
					store.job.printfulProductId = undefined;
				}
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

	.post("/webhook/printful", async ({ body, set }) => {
		const payload = body as Printful.Webhook.EventPayload;
		switch (payload.type) {
			case Printful.Webhook.Event.ProductUpdated: {
				const printfulProduct = await Printful.Products.get(payload.data.sync_product.id);
				await syncProduct(printfulProduct);
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

export const api = treaty<typeof app>("localhost:5173").api;

