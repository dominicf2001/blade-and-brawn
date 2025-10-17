import type { DeepPartial } from "./misc";

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

    export namespace Orders {
        export type Order = {
            external_id: string,
            shipping: string
            recipient: {
                name: string
                company?: string
                address1: string
                address2: string
                city: string
                state_code: string
                state_name?: string
                country_code: string
                country_name?: string
                zip: string
                phone?: string
                email?: string
                tax_number?: string
            }
            items: Array<{ external_variant_id: string, quantity: number }>
        }
    }

    export namespace Webhook {
        // meta
        interface MetaData<E extends Event, D> {
            type: E;
            created: number;
            retries: number;
            store: number;
            data: D
        }

        export enum Event {
            ProductUpdated = "product_updated",
            ProductDeleted = "product_deleted",
            PackageShipped = "package_shipped"
        }

        export interface ProductUpdated extends MetaData<Event.ProductUpdated, {
            sync_product: {
                id: number;
                external_id: string;
                name: string;
                variants: number;
                synced: number;
                thumbnail_url: string;
                is_ignored: boolean;
            };
        }> { }

        export interface ProductDeleted extends MetaData<Event.ProductDeleted, {
            sync_product: {
                id: number;
                external_id: string;
                name: string;
            };
        }> { }

        export interface PackageShipped extends MetaData<Event.PackageShipped, {
            shipment: {
                id: number
                status: string
                store_id: number
                tracking_number: string
                tracking_url: string
                created_at: string
                ship_date: string
                shipped_at: string
                delivered_at: string
                reshipment: boolean
            }
            order: {
                id: number
                external_id: string
                status: string
                store_id: number
                dashboard_url: string
                created_at: string
                updated_at: string
            }
        }> { }

        export type EventPayload = ProductUpdated | ProductDeleted | PackageShipped
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

    export namespace Orders {
        export type Order = {
            orderId: string
            status: "pending" | "unfulfilled" | "fulfilled" | "disputed" | "dispute-lost" | "refunded"
            comment: string
            orderComment: string
            acceptedOn: string
            fulfilledOn: string | null
            refundedOn: string | null
            disputedOn: string | null
            disputeUpdatedOn: string | null
            disputeLastStatus: string | null
            customerPaid: {
                unit: string
                value: string
                string: string
            }
            netAmount: {
                unit: string
                value: string
                string: string
            }
            applicationFee: {
                unit: string
                value: string
                string: string
            }
            allAddresses: Array<{
                type: string
                addressee: string
                line1: string
                line2: string
                city: string
                state: string
                country: string
                postalCode: string
            }>
            shippingAddress: {
                type: string
                japanType: string
                addressee: string
                line1: string
                line2: string
                city: string
                state: string
                country: string
                postalCode: string
            }
            billingAddress: {
                type: string
                addressee: string
                line1: string
                line2: string
                city: string
                state: string
                country: string
                postalCode: string
            }
            shippingProvider: string
            shippingTracking: string
            shippingTrackingURL: string
            customerInfo: {
                fullName: string
                email: string
            }
            purchasedItems: Array<{
                count: number
                rowTotal: {
                    unit: string
                    value: string
                    string: string
                }
                productId: string
                productName: string
                productSlug: string
                variantId: string
                variantName: string
                variantSlug: string
                variantSKU: string
                variantImage: {
                    url: string
                    file: {
                        size: number;
                        originalFileName: string;
                        createdOn: string;
                        contentType: string;
                        width: number;
                        height: number;
                        variants: {
                            size: number;
                            url: string,
                            originalFileName: string;
                            width: number;
                            height: number;
                        }[]
                    }
                }
                variantPrice: {
                    unit: string
                    value: string
                    string: string
                }
                weight: number
                width: number
                height: number
                length: number
            }>
            purchasedItemsCount: number
            stripeDetails: {
                subscriptionId: string | null
                paymentMethod: string
                paymentIntentId: string
                customerId: string
                chargeId: string
                disputeId: string | null
                refundId: string
                refundReason: string
            }
            stripeCard: {
                last4: string
                brand: string
                ownerName: string
                expires: {
                    year: number
                    month: number
                }
            }
            paypalDetails: Object
            customData: Array<Object>
            metadata: {
                isBuyNow: boolean
                hasDownloads: boolean
                paymentProcessor: string
            }
            isCustomerDeleted: boolean
            isShippingRequired: boolean
            totals: {
                subtotal: {
                    unit: string
                    value: string
                    string: string
                }
                extras: Array<{
                    type: string
                    name: string
                    description: string
                    price: {
                        unit: string
                        value: string
                        string: string
                    }
                }>
                total: {
                    unit: string
                    value: string
                    string: string
                }
            }
            downloadFiles: Array<{
                id: string
                name: string
                url: string
            }>
        }
    }

    export namespace Webhook {
        interface MetaData<E extends Event, D> {
            triggerType: E;
            payload: D
        }

        export enum Event {
            OrderCreated = "ecomm_new_order",
            OrderUpdated = "ecomm_order_changed"
        }

        export interface OrderCreated extends MetaData<Event.OrderCreated, Orders.Order> { }
        export interface OrderUpdated extends MetaData<Event.OrderUpdated, Orders.Order> { }

        export type EventPayload = OrderCreated | OrderUpdated;
    }
}
