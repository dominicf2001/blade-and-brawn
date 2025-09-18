import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { ActivityStandards, LevelCalculator, Standards } from "./services/calculator/main";
import { ActivityPerformance, Player } from "./services/calculator/util";
import { Printful } from "./services/commerce/printful";
import { Webflow } from "./services/commerce/webflow";
import rawStandards from "./data/standards.json" assert { type: "json" }
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const app = new Elysia({ prefix: "/api" })
    .use(cors())

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


    // DATA

    .get("/data/standards", async () => {
        try {
            return Bun.file(join(__dirname, "data/standards.json")).json();
        } catch (error) {
            console.error(error);
            return new Response("Failed to load standards", { status: 500 });
        }
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

if (import.meta.main) {
    app.listen(3000);
    console.log(
        `Listening at ${app.server?.hostname}:${app.server?.port}`,
    );
}

export type App = typeof app;
