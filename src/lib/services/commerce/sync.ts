import type { Printful, Webflow } from "./util/types";
import { formatSlug, type DeepPartial } from "./util/misc";
import WebflowService from "./webflow";
import PrintfulService from "./printful";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const R2_WORKER_URL = "https://r2-worker.xominus.workers.dev";
export const WEBSITE_MEDIA_URL = "https://website-media.bladeandbrawn.com";

export default class SyncService {
    static state = {
        isSyncing: false,
        printfulProductId: undefined as undefined | number
    }

    static async sync(printfulProducts: Printful.Products.SyncProduct[]) {
        this.state.isSyncing = true;
        try {
            const webflowProducts = await WebflowService.Products.getAll();

            const mainPrintfulProducts: Printful.Products.SyncProduct[] = [];
            for (const printfulProduct of printfulProducts) {
                if (this.isSpecialPrintfulVariant(printfulProduct)) {
                    const mainProductName = this.getMainProductName(printfulProduct.name);
                    const mainProductAlreadyInserted = mainPrintfulProducts
                        .some(p => p.name.includes(mainProductName));
                    if (!mainProductAlreadyInserted) {
                        mainPrintfulProducts.push(printfulProduct);
                    }
                }
                else {
                    mainPrintfulProducts.push(printfulProduct);
                }
            }

            for (const printfulProduct of mainPrintfulProducts) {
                this.state.isSyncing = true;
                this.state.printfulProductId = printfulProduct.id;
                await sleep(2000);

                const fullPrintfulProduct = await PrintfulService.Products.get(printfulProduct.id);
                const printfulVariants = fullPrintfulProduct.sync_variants;
                const webflowVariants = this.convertPrintfulVariantsToWebflowSkus(printfulVariants);

                const foundColors = Array.from(new Set(printfulVariants.map(v => v.color)));
                const foundSizes = Array.from(new Set(printfulVariants.map(v => v.size)));

                // SYNC PRODUCT DATA
                let webflowProduct = webflowProducts
                    .find(webflowProduct => webflowProduct.product.id === printfulProduct.external_id);
                if (webflowProduct) {
                    // SYNC PRODUCT UPDATE
                    const webflowProductId = fullPrintfulProduct.sync_product.external_id;
                    WebflowService.Products.update(webflowProductId, {
                        "product": {
                            "fieldData": {
                                "name": fullPrintfulProduct.sync_product.name,
                                "slug": formatSlug(fullPrintfulProduct.sync_product.name),
                                "shippable": true,
                                "tax-category": "standard-taxable",
                                "sku-properties": [
                                    {
                                        "id": "color",
                                        "name": "Color",
                                        "enum": foundColors.map(color => ({
                                            "id": color,
                                            "slug": formatSlug(color),
                                            "name": color
                                        }))
                                    },
                                    {
                                        "id": "size",
                                        "name": "Size",
                                        "enum": foundSizes.map(size => ({
                                            "id": size,
                                            "slug": formatSlug(size),
                                            "name": size
                                        }))
                                    },
                                ]
                            }
                        }
                    });

                    // Update webflow product SKUs
                    const webflowProduct = await WebflowService.Products.get(webflowProductId);
                    if (!webflowProduct) {
                        console.error("Missing webflow product");
                        throw new Error("Failed to create Webflow product");
                    }

                    for (let i = 0; i < webflowProduct.skus.length; ++i) {
                        const webflowSkuId = printfulVariants[i].external_id;
                        await WebflowService.Products.Skus.update(webflowProductId, webflowSkuId, webflowProduct.skus[i]);
                    }
                }
                else {
                    // SYNC PRODUCT CREATE 
                    const webflowProductId = await WebflowService.Products.create({
                        "product": {
                            "fieldData": {
                                "name": fullPrintfulProduct.sync_product.name,
                                "slug": formatSlug(fullPrintfulProduct.sync_product.name),
                                "shippable": true,
                                "tax-category": "standard-taxable",
                                "sku-properties": [
                                    {
                                        "id": "color",
                                        "name": "Color",
                                        "enum": foundColors.map(color => ({
                                            "id": color,
                                            "slug": formatSlug(color),
                                            "name": color
                                        }))
                                    },
                                    {
                                        "id": "size",
                                        "name": "Size",
                                        "enum": foundSizes.map(size => ({
                                            "id": size,
                                            "slug": formatSlug(size),
                                            "name": size
                                        }))
                                    },
                                ]
                            }
                        },
                        "sku": webflowVariants[0],
                    });

                    // create webflow product SKUs 
                    await WebflowService.Products.Skus.create(webflowProductId, webflowVariants.slice(1));

                    webflowProduct = await WebflowService.Products.get(webflowProductId);
                    if (!webflowProduct) {
                        console.error("Missing webflow product");
                        throw new Error("Failed to create Webflow product");
                    }

                    await PrintfulService.Products.update(printfulProduct.id, {
                        "sync_product": {
                            "external_id": String(webflowProductId)
                        },
                        "sync_variants": webflowProduct.skus.map((sku, i) => ({
                            "id": Number(printfulVariants[i].id), // printful variant id
                            "external_id": String(sku.id),     // webflow variant id
                        }))
                    });
                }

                // SYNC IMAGES
                const productSlug = webflowProduct.product.fieldData.slug;
                const productImageUrls = await this.getProductImageUrls(productSlug);
                for (const sku of webflowProduct.skus) {
                    sku.fieldData["main-image"] = productImageUrls[0] ?? sku.fieldData["main-image"];
                    sku.fieldData["more-images"] = productImageUrls.slice(1).map(url => ({ url }));
                    await WebflowService.Products.Skus.update(webflowProduct.product.id, sku.id, sku);
                }
            }
        }
        catch (error) {
            throw error;
        }
        finally {
            this.state.isSyncing = false;
            this.state.printfulProductId = undefined;
        }

    }

    private static convertPrintfulVariantsToWebflowSkus(printfulVariants: Printful.Products.SyncVariant[]) {
        const getVariantMainImage = (syncVariant: Printful.Products.SyncVariant): string => {
            const previewFile = syncVariant.files.find(f => f.type === "preview");
            return previewFile?.preview_url ?? syncVariant.product.image;
        }

        const webflowVariants: DeepPartial<Webflow.Products.Skus.Sku>[] = [];
        for (const printfulVariant of printfulVariants) {
            webflowVariants.push({
                "fieldData": {
                    "name": printfulVariant.name,
                    "slug": formatSlug(printfulVariant.name),
                    "sku-values": {
                        "color": printfulVariant.color,
                        "size": printfulVariant.size,
                    },
                    "price": {
                        "value": +printfulVariant.retail_price * 100,
                        "unit": printfulVariant.currency,
                        "currency": printfulVariant.currency
                    },
                    "main-image": getVariantMainImage(printfulVariant)
                }
            });
        }
        return webflowVariants;
    }

    private static getProductImageUrls = async (slug: string) => {
        const res = await (fetch(`${R2_WORKER_URL}/product-images/${slug}`));
        if (!res.ok) {
            console.error("Failed to get product image keys:", res.statusText);
            throw new Error("Failed to get product image keys");
        }
        const productImageKeys: string[] = await res.json();
        return productImageKeys.map(key => `${WEBSITE_MEDIA_URL}/${key}`);
    }

    private static findColorInProductName = (productName: string): string | undefined => {
        const m = productName.match(/\[([^\]]+)\]$/);
        return m ? m[1] : undefined;
    };

    private static isSpecialPrintfulVariant = (printfulProduct: Printful.Products.SyncProduct) => {
        const colorInName = this.findColorInProductName(printfulProduct.name);
        return !!colorInName;
    }

    private static getMainProductName = (productName: string) => {
        const colorInName = this.findColorInProductName(productName);
        if (colorInName) {
            return productName.replace(colorInName, "").trimEnd();
        }
        else {
            return productName;
        }
    };
}
