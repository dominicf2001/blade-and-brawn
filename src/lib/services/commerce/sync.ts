import type { Printful, Webflow } from "./util/types";
import { formatSlug, type DeepPartial } from "./util/misc";
import WebflowService from "./webflow";
import PrintfulService from "./printful";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const R2_WORKER_URL = "https://r2-worker.xominus.workers.dev";
export const WEBSITE_MEDIA_URL = "https://website-media.bladeandbrawn.com";

type MainProduct = {
    name: string,
    externalId: string,
    colors: Set<string>,
    variants: {
        color: string,
        product: Printful.Products.Product
    }[]
}

export default class SyncService {
    static state = {
        isSyncing: false,
        syncingIds: [] as number[]
    }

    static async sync(printfulProductId: number | undefined) {
        console.log("Syncing...");
        this.state.isSyncing = true;
        try {
            let printfulProducts = await PrintfulService.Products.getAll();
            if (printfulProductId) {
                const printfulProduct = printfulProducts.find(p => p.id === printfulProductId);
                if (printfulProduct) {
                    const mainProductName = this.getMainProductName(printfulProduct.name);
                    printfulProducts = printfulProducts.filter(p => p.name.includes(mainProductName));
                }
            }
            const webflowProducts = await WebflowService.Products.getAll();

            // Generate main printful products
            console.log("Generating main products...");
            const mainPrintfulProducts: MainProduct[] = [];
            for (const printfulProduct of printfulProducts) {
                const mainProductName = this.getMainProductName(printfulProduct.name);

                let mainPrintfulProduct = mainPrintfulProducts
                    .find(mp => mp.name.includes(mainProductName));
                if (!mainPrintfulProduct) {
                    mainPrintfulProduct = {
                        name: mainProductName,
                        variants: [],
                        externalId: printfulProduct.external_id,
                        colors: new Set()
                    }
                    mainPrintfulProducts.push(mainPrintfulProduct);
                }

                const productColor = this.findColorInProductName(printfulProduct.name);
                mainPrintfulProduct.variants.push({
                    color: productColor,
                    product: await PrintfulService.Products.get(printfulProduct.id)
                });
                mainPrintfulProduct.colors.add(productColor);
            }

            // TODO: Validate main printful products

            // Sync the main printful products
            for (const mainPrintfulProduct of mainPrintfulProducts) {
                this.state.isSyncing = true;
                this.state.syncingIds = mainPrintfulProduct.variants.map(v => v.product.sync_product.id);

                const foundColors = mainPrintfulProduct.colors;
                const foundSizes: Set<string> = new Set();

                const webflowSkus: DeepPartial<Webflow.Products.Skus.Sku>[] = [];

                for (const specialVariant of mainPrintfulProduct.variants) {
                    for (const printfulVariant of specialVariant.product.sync_variants) {
                        // check if this variant size is in all other special variants
                        let sizeIsInAllVariants = true;
                        for (const specialVariant of mainPrintfulProduct.variants) {
                            const sizes = specialVariant.product.sync_variants.map(v => v.size);
                            if (!sizes.includes(printfulVariant.size))
                                sizeIsInAllVariants = false;
                        }

                        if (sizeIsInAllVariants) {
                            foundSizes.add(printfulVariant.size);

                            webflowSkus.push({
                                "id": printfulVariant.external_id,
                                "fieldData": {
                                    "name": printfulVariant.name,
                                    "slug": formatSlug(printfulVariant.name),
                                    "sku-values": {
                                        "color": specialVariant.color,
                                        "size": printfulVariant.size,
                                    },
                                    "price": {
                                        "value": Math.floor(+printfulVariant.retail_price * 100),
                                        "unit": printfulVariant.currency,
                                        "currency": printfulVariant.currency
                                    },
                                    "main-image": PrintfulService.Util.getVariantMainImage(printfulVariant)
                                }
                            })
                        }
                    }
                }

                // SYNC PRODUCT DATA
                let existingWebflowProduct = webflowProducts
                    .find(webflowProduct => webflowProduct.product.id === mainPrintfulProduct.externalId.split("-")[0]);
                if (existingWebflowProduct) {
                    // SYNC PRODUCT UPDATE
                    const webflowProductId = mainPrintfulProduct.externalId.split("-")[0];
                    WebflowService.Products.update(webflowProductId, {
                        "product": {
                            "fieldData": {
                                "name": mainPrintfulProduct.name,
                                "slug": formatSlug(mainPrintfulProduct.name),
                                "shippable": true,
                                "tax-category": "standard-taxable",
                                "sku-properties": [
                                    {
                                        "id": "color",
                                        "name": "Color",
                                        "enum": Array.from(foundColors).map(color => ({
                                            "id": color,
                                            "slug": formatSlug(color),
                                            "name": color
                                        }))
                                    },
                                    {
                                        "id": "size",
                                        "name": "Size",
                                        "enum": Array.from(foundSizes).map(size => ({
                                            "id": size,
                                            "slug": formatSlug(size),
                                            "name": size
                                        }))
                                    },
                                ]
                            }
                        },
                        "sku": webflowSkus[0]
                    });

                    for (const webflowSku of webflowSkus.slice(1)) {
                        const existingWebflowSku = existingWebflowProduct.skus.find(sku => sku.id === webflowSku.id);
                        if (webflowSku.id && existingWebflowSku) {
                            await WebflowService.Products.Skus.update(webflowProductId, webflowSku.id, webflowSku);
                        }
                        else {
                            await WebflowService.Products.Skus.create(webflowProductId, [webflowSku]);
                        }
                    }
                }
                else {
                    // SYNC PRODUCT CREATE 
                    const webflowProductId = await WebflowService.Products.create({
                        "product": {
                            "fieldData": {
                                "name": mainPrintfulProduct.name,
                                "slug": formatSlug(mainPrintfulProduct.name),
                                "shippable": true,
                                "tax-category": "standard-taxable",
                                "sku-properties": [
                                    {
                                        "id": "color",
                                        "name": "Color",
                                        "enum": Array.from(foundColors).map(color => ({
                                            "id": color,
                                            "slug": formatSlug(color),
                                            "name": color
                                        }))
                                    },
                                    {
                                        "id": "size",
                                        "name": "Size",
                                        "enum": Array.from(foundSizes).map(size => ({
                                            "id": size,
                                            "slug": formatSlug(size),
                                            "name": size
                                        }))
                                    },
                                ]
                            }
                        },
                        "sku": webflowSkus[0],
                    });

                    // create webflow product SKUs 
                    await WebflowService.Products.Skus.create(webflowProductId, webflowSkus.slice(1));

                    existingWebflowProduct = await WebflowService.Products.get(webflowProductId);
                    if (!existingWebflowProduct) {
                        console.error("Missing webflow product");
                        throw new Error("Failed to create Webflow product");
                    }

                    for (const specialVariant of mainPrintfulProduct.variants) {
                        const newPrintfulVariants: DeepPartial<Printful.Products.SyncVariant>[] = [];
                        for (const printfulVariant of specialVariant.product.sync_variants) {
                            const associatedWebflowSku = existingWebflowProduct.skus
                                .find(sku => sku.fieldData["sku-values"]?.["color"] === printfulVariant.color &&
                                    sku.fieldData["sku-values"]?.["size"] === printfulVariant.size);
                            if (associatedWebflowSku) {
                                newPrintfulVariants.push({
                                    "id": printfulVariant.id,                       // printful variant id
                                    "external_id": String(associatedWebflowSku.id), // webflow variant id
                                });
                            }
                        }

                        await sleep(10000);
                        await PrintfulService.Products.update(specialVariant.product.sync_product.id, {
                            "sync_product": {
                                "id": specialVariant.product.sync_product.id,
                                "external_id": `${webflowProductId}-${specialVariant.color}`
                            },
                            "sync_variants": newPrintfulVariants
                        });
                    }
                }

                // SYNC IMAGES
                for (const sku of existingWebflowProduct.skus) {
                    const skuColor = sku.fieldData["sku-values"]?.["color"]?.toLowerCase() ?? "None";
                    const skuSlug = `${existingWebflowProduct.product.fieldData.slug}-${skuColor}`;
                    const skuImageUrls = await this.getProductImageUrls(skuSlug);

                    sku.fieldData["main-image"] = skuImageUrls[0] ?? sku.fieldData["main-image"];
                    sku.fieldData["more-images"] = skuImageUrls.slice(1).map(url => ({ url }));

                    await WebflowService.Products.Skus.update(existingWebflowProduct.product.id, sku.id, sku);
                }
            }
        }
        catch (error) {
            console.error(error);
            throw error;
        }
        finally {
            this.state.isSyncing = false;
            this.state.syncingIds = [];
        }
    }

    private static getProductImageUrls = async (slug: string) => {
        const res = await (fetch(`${R2_WORKER_URL}/product-images/${slug}`));
        if (!res.ok) {
            console.error("Failed to get product image keys:", await res.json());
            throw new Error("Failed to get product image keys");
        }
        const productImageKeys: string[] = await res.json();
        return productImageKeys.map(key => `${WEBSITE_MEDIA_URL}/${key}`);
    }

    public static findColorInProductName = (productName: string): string => {
        const m = productName.match(/\[([^\]]+)\]/);
        return m ? m[1] : "N/A";
    };

    public static getMainProductName = (productName: string) => {
        const colorInName = this.findColorInProductName(productName);
        if (colorInName) {
            return productName.replace(`[${colorInName}]`, "").trimEnd();
        }
        else {
            return productName;
        }
    };
}
