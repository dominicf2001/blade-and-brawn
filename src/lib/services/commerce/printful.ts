export namespace Printful {
    export const API_URL = "https://api.printful.com";

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

        export interface SyncProduct {
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

        export async function get(syncProductId: number): Promise<SyncProduct> {
            const payload: MetaDataSingle<SyncProduct> = await (
                await fetch(`${Printful.API_URL}/store/products/${syncProductId}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${Bun.env.PRINTFUL_AUTH}`,
                        "X-PF-Store-Id": `${Bun.env.PRINTFUL_STORE_ID}`
                    }
                })
            ).json();

            return payload.result;
        }

        export async function getAll(offset: number = 0): Promise<SyncProduct["sync_product"][]> {
            const allSyncProducts: SyncProduct["sync_product"][] = [];

            while (true) {
                try {
                    const payload: MetaDataMulti<SyncProduct["sync_product"]> = await (
                        await fetch(`${Printful.API_URL}/store/products?offset=${offset}`, {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${Bun.env.PRINTFUL_AUTH}`,
                                "X-PF-Store-Id": `${Bun.env.PRINTFUL_STORE_ID}`
                            }
                        })
                    ).json();

                    allSyncProducts.push(...payload.result);
                    offset = allSyncProducts.length;

                    if (allSyncProducts.length >= payload.paging.total)
                        break;
                } catch (error) {
                    break;
                }
            }

            return allSyncProducts;
        }


        export function getVariantPreviewUrl(syncVariant: Printful.Products.SyncProduct["sync_variants"][number]): string {
            const previewFile = syncVariant.files.find(f => f.type === "preview");
            return previewFile?.preview_url ?? syncVariant.product.image;
        }
    }
}
