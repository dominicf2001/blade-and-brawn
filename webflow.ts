import { ProductRecords } from "./data/product-records";
import { Printful } from "./printful"

export namespace Webflow {
    export const API_URL = `https://api.webflow.com/v2/sites/${Bun.env.WEBFLOW_SITE_ID}`;

    const formatSlug = name => name.replaceAll(" ", "-").replaceAll("/", "").toLowerCase();

    namespace Products {
        export interface Sku {
            fieldData: {
                name: string;
                slug: string;
                "sku-values"?: Record<string, string>,
                price: {
                    value: number;
                    unit: string;
                    currency: string;
                };
                "main-image": string;
            }
        }

        export interface CreateProduct {
            product: {
                fieldData: {
                    name: string;
                    slug: string;
                    description: string;
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
            };
            sku: Sku;
            publishStatus: string;
        }
    }

    export async function createProduct(printfulProduct: Printful.Products.SyncProduct, productRecords: ProductRecords) {
        const printfulVariants = printfulProduct.result.sync_variants;

        const webflowVariants: Products.Sku[] = [];
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
                    // TODO
                    "main-image": "https://www.example.com/image.jpg"
                }
            });
        }

        const foundColors = Array.from(new Set(printfulVariants.map(v => v.color)));
        const foundSizes = Array.from(new Set(printfulVariants.map(v => v.size)));

        // CREATE WEBFLOW PRODUCT
        console.log("CREATE WEBFLOW PRODUCT");
        let addProductResponse = await fetch(`${API_URL}/products`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `bearer ${Bun.env.WEBFLOW_AUTH}`,
            },
            body: JSON.stringify({
                "product": {
                    "fieldData": {
                        "name": printfulProduct.result.sync_product.name,
                        "slug": formatSlug(printfulProduct.result.sync_product.name),
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
            })
        });
        addProductResponse = await addProductResponse.json();
        console.log(JSON.stringify(addProductResponse));

        const webflowProductId = addProductResponse["product"]["id"];
        const printfulProductId = printfulProduct.result.sync_product.id;

        // CREATE WEBFLOW PRODUCT SKUs
        console.log("CREATE SKUS");
        let createSkuResponse = await fetch(`${API_URL}/products/${webflowProductId}/skus`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `bearer ${Bun.env.WEBFLOW_AUTH}`
            },
            body: JSON.stringify({
                "skus": webflowVariants.slice(1)
            })
        });
        createSkuResponse = await createSkuResponse.json();
        console.log(JSON.stringify(createSkuResponse));

        const responseSkus = [addProductResponse["sku"], ...createSkuResponse["skus"]];

        // SYNC WEBFLOW/PRINTFUL PRODUCT AND VARIANT IDs
        console.log("SYNC PRODUCT IDs");
        let modifyPrintfulProductResponse = await fetch(`${Printful.API_URL}/store/products/${printfulProductId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Bun.env.PRINTFUL_AUTH}`,
                "X-PF-Store-Id": Bun.env.PRINTFUL_STORE_ID ?? ""
            },
            body: JSON.stringify({
                "sync_product": {
                    "external_id": String(webflowProductId)
                },
                "sync_variants": responseSkus.map((sku, i) => ({
                    "id": Number(printfulVariants[i].id), // printful variant id
                    "external_id": String(sku["id"]),     // webflow variant id
                }))
            })
        });
        modifyPrintfulProductResponse = await modifyPrintfulProductResponse.json();
        console.log(JSON.stringify(modifyPrintfulProductResponse));

        // CACHE WEBFLOW/PRINTFUL PRODUCT ASSOCIATION
        console.log("CACHING PRODUCT ASSOCIATION");
        productRecords.add({ printfulProductId, webflowProductId });
    }
}
