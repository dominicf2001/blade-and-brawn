import { Printful } from "$lib/services/commerce/printful"
import { formatSlug, getProductImageUrls, type DeepPartial } from "./util";

export namespace Webflow {
    const SITE_ID = typeof Bun === "undefined" ? "" : Bun.env.WEBFLOW_SITE_ID;
    const COLLECTIONS_ID = typeof Bun === "undefined" ? "" : Bun.env.WEBFLOW_COLLECTION_ID;
    const AUTH_TOKEN = typeof Bun === "undefined" ? "" : Bun.env.WEBFLOW_AUTH;

    export const API_SITES_URL = `https://api.webflow.com/v2/sites/${SITE_ID}`;
    export const API_COLLECTIONS_URL = `https://api.webflow.com/v2/collections/${COLLECTIONS_ID}`;

    const AUTH_HEADER = { "Authorization": `bearer ${AUTH_TOKEN}` };

    export namespace Products {
        export namespace Skus {
            export type Sku = {
                id: string,
                fieldData: {
                    name: string;
                    slug: string;
                    "sku-values"?: Record<string, string>,
                    price: {
                        value: number;
                        unit: string;
                        currency: string;
                    };
                    "main-image"?: string;
                    "more-images"?:
                    {
                        fileId?: string,
                        url: string,
                        alt?: string,
                    }[]
                }
            }

            export async function create(webflowProductId: string, skus: DeepPartial<Sku>[]) {
                const res = await fetch(`${Webflow.API_SITES_URL}/products/${webflowProductId}/skus`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...AUTH_HEADER
                    },
                    body: JSON.stringify({
                        "skus": skus
                    })
                });

                if (!res.ok) {
                    console.error("Webflow product SKU create failed:", res.statusText);
                    throw new Error("Failed to create Webflow product SKU");
                }
            }

            export async function update(webflowProductId: string, webflowSkuId: string, webflowSku: DeepPartial<Sku>) {
                const res = await fetch(`${Webflow.API_SITES_URL}/products/${webflowProductId}/skus/${webflowSkuId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...AUTH_HEADER
                    },
                    body: JSON.stringify({
                        "sku": webflowSku
                    })
                });
                if (!res.ok) {
                    console.error("Webflow product SKU update failed:", await res.json());
                    throw new Error("Failed to update Webflow product SKU");
                }
            }
        }

        export type Product = {
            id: string,
            fieldData: {
                name: string;
                slug: string;
                description?: string;
                shippable?: boolean;
                "tax-category"?: string;
                "sku-properties": {
                    id: string;
                    name: string;
                    enum: {
                        id: string;
                        name: string;
                        slug: string;
                    }[];
                }[];
            }
        }

        export interface ProductAndSkus {
            product: Product
            skus: Skus.Sku[]
        }

        export interface ProductAndSku {
            product: Product;
            sku: Skus.Sku;
            publishStatus?: "staging" | "live";
        }

        export async function create(webflowProductAndSku: DeepPartial<ProductAndSku>) {
            const res = await fetch(`${Webflow.API_SITES_URL}/products`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...AUTH_HEADER
                },
                body: JSON.stringify(webflowProductAndSku)
            });

            if (!res.ok) {
                console.error("Webflow product create failed:", res.statusText);
                console.log(await res.json());
                throw new Error("Failed to create Webflow product");
            }

            const createdWebflowProduct = await res.json();
            return createdWebflowProduct.product.id
        }

        export async function createUsingPrintful(printfulProduct: Printful.Products.Product): Promise<Webflow.Products.ProductAndSkus> {
            const printfulVariants = printfulProduct.sync_variants;
            const webflowVariants = Printful.Products.convertVariantsToWebflowSkus(printfulVariants);

            const foundColors = Array.from(new Set(printfulVariants.map(v => v.color)));
            const foundSizes = Array.from(new Set(printfulVariants.map(v => v.size)));

            const webflowProductId = await Webflow.Products.create({
                "product": {
                    "fieldData": {
                        "name": printfulProduct.sync_product.name,
                        "slug": formatSlug(printfulProduct.sync_product.name),
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

            // CREATE WEBFLOW PRODUCT SKUs
            await Webflow.Products.Skus.create(webflowProductId, webflowVariants.slice(1));

            const webflowProduct = await Webflow.Products.get(webflowProductId);
            if (!webflowProduct) {
                console.error("Missing webflow product");
                throw new Error("Failed to create Webflow product");
            }

            const printfulProductId = printfulProduct.sync_product.id;
            await Printful.Products.update(printfulProductId, {
                "sync_product": {
                    "external_id": String(webflowProductId)
                },
                "sync_variants": webflowProduct.skus.map((sku, i) => ({
                    "id": Number(printfulVariants[i].id), // printful variant id
                    "external_id": String(sku.id),     // webflow variant id
                }))
            });

            return webflowProduct;
        }

        export async function getAll(): Promise<ProductAndSkus[]> {
            const res = await fetch(`${Webflow.API_SITES_URL}/products`, {
                method: "GET",
                headers: {
                    ...AUTH_HEADER,
                }
            });

            if (!res.ok) {
                console.error("Webflow product get all failed:", res.statusText);
                throw new Error("Failed to get all Webflow products");
            }

            const payload = await res.json();
            return payload.items as ProductAndSkus[];
        }

        export async function get(webflowProductId: string): Promise<ProductAndSkus | undefined> {
            const res = await fetch(`${Webflow.API_SITES_URL}/products/${webflowProductId}`, {
                method: "GET",
                headers: {
                    ...AUTH_HEADER,
                }
            });

            if (res.status === 404 || res.status === 400) {
                return;
            }

            if (!res.ok) {
                console.error("Webflow product get failed:", res.statusText);
                throw new Error("Failed to get Webflow product");
            }

            const payload = await res.json();
            return payload as ProductAndSkus;
        }

        export async function update(webflowProductId: string, webflowProduct: DeepPartial<ProductAndSku>) {
            const res = await fetch(`${Webflow.API_SITES_URL}/products/${webflowProductId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...AUTH_HEADER
                },
                body: JSON.stringify(webflowProduct)
            });

            if (!res.ok) {
                console.error("Webflow product update failed:", res.statusText);
                throw new Error("Failed to update Webflow product");
            }
        }

        export async function updateUsingPrintful(printfulProduct: Printful.Products.Product) {
            const webflowProductId = printfulProduct.sync_product.external_id;

            const printfulVariants = printfulProduct.sync_variants;

            const foundColors = Array.from(new Set(printfulVariants.map(v => v.color)));
            const foundSizes = Array.from(new Set(printfulVariants.map(v => v.size)));

            // Update product
            Webflow.Products.update(webflowProductId, {
                "product": {
                    "fieldData": {
                        "name": printfulProduct.sync_product.name,
                        "slug": formatSlug(printfulProduct.sync_product.name),
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

            // Update SKUs
            const webflowProduct = await Webflow.Products.get(webflowProductId);
            if (!webflowProduct) {
                console.error("Missing webflow product");
                throw new Error("Failed to create Webflow product");
            }

            for (let i = 0; i < webflowProduct.skus.length; ++i) {
                const webflowSkuId = printfulVariants[i].external_id;
                await Webflow.Products.Skus.update(webflowProductId, webflowSkuId, webflowProduct.skus[i]);
            }
        }

        export async function remove(webflowProductId: string) {
            const res = await fetch(`${Webflow.API_COLLECTIONS_URL}/items/${webflowProductId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    ...AUTH_HEADER
                },
                body: JSON.stringify({})
            });

            if (!res.ok) {
                console.error("Webflow product remove failed:", res.statusText);
                throw new Error("Failed to remove Webflow product");
            }
        }

        export async function syncImages(webflowProductAndSkus: ProductAndSkus) {
            const productSlug = webflowProductAndSkus.product.fieldData.slug;
            console.log(productSlug);
            const productImageUrls = await getProductImageUrls(productSlug);
            console.log(productImageUrls);
            for (const sku of webflowProductAndSkus.skus) {
                sku.fieldData["main-image"] = productImageUrls[0] ?? sku.fieldData["main-image"];
                sku.fieldData["more-images"] = productImageUrls.slice(1).map(url => ({ url }));
                console.log(sku.fieldData["more-images"]);
                await Webflow.Products.Skus.update(webflowProductAndSkus.product.id, sku.id, sku);
            }
        }
    }
}

