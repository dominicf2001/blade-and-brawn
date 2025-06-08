import { ProductRecords } from "./data/product-records";
import { Printful } from "./printful"

export namespace Webflow {
    export const API_SITES_URL = `https://api.webflow.com/v2/sites/${Bun.env.WEBFLOW_SITE_ID}`;
    export const API_COLLECTIONS_URL = `https://api.webflow.com/v2/collections/${Bun.env.WEBFLOW_COLLECTION_ID}`;

    const formatSlug = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '-')      // replace illegal chars with dashes
            .replace(/^-+/, '')                // remove leading dashes
            .replace(/-+$/, '')                // remove trailing dashes
            .replace(/--+/g, '-')              // collapse multiple dashes
            .replace(/^([^a-z0-9_])/, '_$1');  // if it starts with an invalid char, prefix underscore
    };

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

    export async function deleteProduct(printfulProductId: number, productRecords: ProductRecords) {
        const webflowProductId = productRecords.findFromPrintful(printfulProductId)?.webflowProductId;
        if (webflowProductId){
            const res = await fetch(`${Webflow.API_COLLECTIONS_URL}/items/${webflowProductId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `bearer ${Bun.env.WEBFLOW_AUTH}`
                },
                body: JSON.stringify({})
            });
            productRecords.deleteFromWebflow(webflowProductId);
        }
    }

    export async function updateProduct(printfulProduct: Printful.Products.SyncProduct, productRecords: ProductRecords) {
        const webflowProductId = productRecords.findFromPrintful(printfulProduct.result.sync_product.id)?.webflowProductId;
        if (!webflowProductId) {
            throw new Error("Product is not recognized");
        }

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
                    // TODO: sync image
                    "main-image": "https://www.example.com/image.jpg"
                }
            });
        }


        const variantColors = printfulVariants.map(v => v.color);
        const variantSizes = printfulVariants.map(v => v.size);
        const variantExternalIds = printfulVariants.map(v => v.external_id);

        const foundColors = Array.from(new Set(variantColors));
        const foundSizes = Array.from(new Set(variantSizes));

        let updateProductResponse = await fetch(`${Webflow.API_SITES_URL}/products/${webflowProductId}`, {
            method: "PATCH",
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
                "sku": webflowVariants[0]
            })
        });
        updateProductResponse = await updateProductResponse.json();

        const getProductResponse = await fetch(`${Webflow.API_SITES_URL}/products/${webflowProductId}`, {
            method: "GET",
            headers: {
                "Authorization": `bearer ${Bun.env.WEBFLOW_AUTH}`
            }
        });
        const webflowProduct = await getProductResponse.json();

        for (let i = 0; i < webflowProduct["skus"].length; ++i) {
            const webflowSkuId = variantExternalIds[i];

            const res = await fetch(`${Webflow.API_SITES_URL}/products/${webflowProductId}/skus/${webflowSkuId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `bearer ${Bun.env.WEBFLOW_AUTH}`
                },
                body: JSON.stringify({
                    "sku": webflowVariants[i]
                })
            });
            console.log(JSON.stringify((await res.json())));
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
                    // TODO: sync image
                    "main-image": "https://www.example.com/image.jpg"
                }
            });
        }

        const foundColors = Array.from(new Set(printfulVariants.map(v => v.color)));
        const foundSizes = Array.from(new Set(printfulVariants.map(v => v.size)));

        // CREATE WEBFLOW PRODUCT
        let addProductResponse = await fetch(`${Webflow.API_SITES_URL}/products`, {
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
        if (!addProductResponse?.product?.id) {
            console.error("Webflow product creation failed:", addProductResponse);
            throw new Error("Failed to create Webflow product");
        }

        const webflowProductId = addProductResponse["product"]["id"];
        const printfulProductId = printfulProduct.result.sync_product.id;

        // CREATE WEBFLOW PRODUCT SKUs
        let createSkuResponse = await fetch(`${Webflow.API_SITES_URL}/products/${webflowProductId}/skus`, {
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

        const responseSkus = [addProductResponse["sku"], ...createSkuResponse["skus"]];

        // SYNC WEBFLOW/PRINTFUL PRODUCT AND VARIANT IDs
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
                    "external_id": String(sku.id),     // webflow variant id
                }))
            })
        });
        modifyPrintfulProductResponse = await modifyPrintfulProductResponse.json();

        // CACHE WEBFLOW/PRINTFUL PRODUCT ASSOCIATION
        productRecords.add({ printfulProductId, webflowProductId });
    }
}

