import { formatSlug, type DeepPartial } from "./util";
import type { Webflow } from "./webflow";

export namespace Printful {
    export namespace Webhook {
        // meta
        interface MetaData {
            created: number;
            retries: number;
            store: number;
        }

        export enum Event {
            ProductUpdated = "product_updated",
            ProductDeleted = "product_deleted"
        }

        // product updated
        export interface ProductUpdated extends MetaData {
            type: Event.ProductUpdated,
            data: {
                sync_product: {
                    id: number;
                    external_id: string;
                    name: string;
                    variants: number;
                    synced: number;
                    thumbnail_url: string;
                    is_ignored: boolean;
                };
            }
        }

        // product deleted
        export interface ProductDeleted extends MetaData {
            type: Event.ProductDeleted,
            data: {
                sync_product: {
                    id: number;
                    external_id: string;
                    name: string;
                };
            }
        }

        export type EventPayload = ProductUpdated | ProductDeleted
    }

    export namespace Products {
        export interface MetaDataSingle<T = any> {
            code: number;
            result: T;
        }

        export interface MetaDataMulti<T = any> {
            code: number;
            result: T[];
            paging: {
                total: number,
                offset: number,
                limit: number
            }
        }

        type Option = {
            id: string;
            value: string;
        }

        type File = {
            type: string;
            id: number;
            url: string;
            options: Option[];
            hash: string;
            filename: string;
            mime_type: string;
            size: number;
            width: number;
            height: number;
            dpi: number;
            status: string;
            created: number;
            thumbnail_url: string;
            preview_url: string;
            visible: boolean;
            is_temporary: boolean;
            stitch_count_tier: string;
        }

        export type Product = {
            sync_product: SyncProduct,
            sync_variants: SyncVariant[]
        }

        export type SyncProduct = {
            id: number;
            external_id: string;
            name: string;
            variants: number;
            synced: number;
            thumbnail_url: string;
            is_ignored: boolean;
        }

        export type SyncVariant = {
            id: number;
            external_id: string;
            sync_product_id: number;
            name: string;
            synced: boolean;
            variant_id: number;
            retail_price: string;
            currency: string;
            is_ignored: boolean;
            sku: string;
            product: {
                variant_id: number;
                product_id: number;
                image: string;
                name: string;
            };
            files: File[];
            options: Option[];
            main_category_id: number;
            warehouse_product_id: number;
            warehouse_product_variant_id: number;
            size: string;
            color: string;
            availability_status: string;
        }

        export async function getAll(offset: number = 0): Promise<SyncProduct[]> {
            const allSyncProducts: SyncProduct[] = [];

            while (true) {
                try {
                    const res = await fetch(`${env().API_URL}/store/products?offset=${offset}`, {
                        method: "GET",
                        headers: { ...env().AUTH_HEADERS }
                    })

                    if (!res.ok) {
                        console.log(await res.json());
                        throw new Error("Failed to get all Printful products",);
                    }

                    const payload: MetaDataMulti<SyncProduct> = await res.json();

                    allSyncProducts.push(...payload.result);
                    offset = allSyncProducts.length;

                    if (allSyncProducts.length >= payload.paging.total)
                        break;
                } catch (error) {
                    console.error("Printful product get all failed:", error);
                    throw new Error("Failed to get all Printful products",);
                }
            }

            return allSyncProducts;
        }

        export async function get(printfulProductId: number): Promise<Product> {
            const res = await fetch(`${env().API_URL}/store/products/${printfulProductId}`, {
                method: "GET",
                headers: { ...env().AUTH_HEADERS }
            });

            if (!res.ok) {
                console.error("Printful product update failed:", res.statusText);
                throw new Error("Failed to update Printful product");
            }

            const payload: MetaDataSingle<Product> = await res.json();
            return payload.result;
        }

        export async function update(printfulProductId: number, printfulProduct: DeepPartial<Product>) {
            const res = await fetch(`${env().API_URL}/store/products/${printfulProductId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...env().AUTH_HEADERS
                },
                body: JSON.stringify(printfulProduct)
            });

            if (!res.ok) {
                console.error("Printful product update failed:", res.statusText);
                throw new Error("Failed to update Printful product");
            }
        }

        export function convertVariantsToWebflowSkus(printfulVariants: SyncVariant[]) {
            const getVariantMainImage = (syncVariant: SyncVariant): string => {
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
    }

    export const env = () => {
        if (typeof Bun === "undefined") {
            throw new Error("Must be in a server context. Make sure to run using --bun.");
        }

        const vars = {
            API_URL: "https://api.printful.com",
            AUTH_TOKEN: Bun.env.PRINTFUL_AUTH,
            STORE_ID: Bun.env.PRINTFUL_STORE_ID
        };

        return {
            ...vars,
            AUTH_HEADERS: {
                "Authorization": `Bearer ${vars.AUTH_TOKEN}`,
                "X-PF-Store-Id": `${vars.STORE_ID}`
            }
        };
    };
}
