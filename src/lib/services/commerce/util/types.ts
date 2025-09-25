export namespace Printful {
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
    }

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
}

export namespace Webflow {
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
    }
}
