export namespace Printful {
    export const API_URL = "https://api.printful.com/store";

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
        interface MetaData<T = any> {
            code: number;
            result: T;
        }

        interface Option {
            id: string;
            value: string;
        }

        interface File {
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

        interface SyncProductData {
            sync_product: {
                id: number;
                external_id: string;
                name: string;
                variants: number;
                synced: number;
                thumbnail_url: string;
                is_ignored: boolean;
            },
            sync_variants: {
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

            }[]
        }
        export type SyncProduct = MetaData<SyncProductData>;
    }

    export async function getSyncProduct(syncProductId: number): Promise<Products.SyncProduct> {
        const payload: Products.SyncProduct = await (
            await fetch(`${API_URL}/products/${syncProductId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${Bun.env.PRINTFUL_AUTH}`,
                    "X-PF-Store-Id": `${Bun.env.PRINTFUL_STORE_ID}`
                }
            })
        ).json();

        return payload;
    }
}
