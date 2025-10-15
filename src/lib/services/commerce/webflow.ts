import type { Webflow } from "./util/types";
import { FetchError, type DeepPartial } from "./util/misc";

export default class WebflowService {
    static Products = class {
        static Skus = class {
            static async create(webflowProductId: string, skus: DeepPartial<Webflow.Products.Skus.Sku>[]) {
                const res = await fetch(`${env().API_SITES_URL}/products/${webflowProductId}/skus`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...env().AUTH_HEADER
                    },
                    body: JSON.stringify({
                        "skus": skus
                    })
                });

                if (!res.ok) {
                    throw await FetchError.createAndParse("Failed to create Webflow product SKU", res);
                }
            }

            static async update(webflowProductId: string, webflowSkuId: string, webflowSku: DeepPartial<Webflow.Products.Skus.Sku>) {
                const res = await fetch(`${env().API_SITES_URL}/products/${webflowProductId}/skus/${webflowSkuId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...env().AUTH_HEADER
                    },
                    body: JSON.stringify({
                        "sku": webflowSku
                    })
                });
                if (!res.ok) {
                    throw await FetchError.createAndParse("Failed to update Webflow product SKU", res);
                }
            }
        }

        static async create(webflowProductAndSku: DeepPartial<Webflow.Products.ProductAndSku>) {
            const res = await fetch(`${env().API_SITES_URL}/products`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...env().AUTH_HEADER
                },
                body: JSON.stringify(webflowProductAndSku)
            });

            if (!res.ok) {
                throw await FetchError.createAndParse("Failed to create Webflow product", res);
            }

            const createdWebflowProduct = await res.json();
            return createdWebflowProduct.product.id
        }

        static async getAll(): Promise<Webflow.Products.ProductAndSkus[]> {
            const res = await fetch(`${env().API_SITES_URL}/products`, {
                method: "GET",
                headers: {
                    ...env().AUTH_HEADER,
                }
            });

            if (!res.ok) {
                throw await FetchError.createAndParse("Failed to get all Webflow products", res);
            }

            const payload = await res.json();
            return payload.items as Webflow.Products.ProductAndSkus[];
        }

        static async get(webflowProductId: string): Promise<Webflow.Products.ProductAndSkus | undefined> {
            const res = await fetch(`${env().API_SITES_URL}/products/${webflowProductId}`, {
                method: "GET",
                headers: {
                    ...env().AUTH_HEADER,
                }
            });

            if (res.status === 404 || res.status === 400) {
                return;
            }

            if (!res.ok) {
                throw await FetchError.createAndParse("Failed to get Webflow product", res);
            }

            const payload = await res.json();
            return payload as Webflow.Products.ProductAndSkus;
        }

        static async update(webflowProductId: string, webflowProduct: DeepPartial<Webflow.Products.ProductAndSku>) {
            const res = await fetch(`${env().API_SITES_URL}/products/${webflowProductId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...env().AUTH_HEADER
                },
                body: JSON.stringify(webflowProduct)
            });

            if (!res.ok) {
                throw await FetchError.createAndParse("Failed to update Webflow product", res);
            }
        }

        static async remove(webflowProductId: string) {
            const res = await fetch(`${env().API_COLLECTIONS_URL}/items/${webflowProductId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    ...env().AUTH_HEADER
                },
                body: JSON.stringify({})
            });

            if (!res.ok) {
                throw await FetchError.createAndParse("Failed to remove Webflow product", res);
            }
        }
    }
}

const env = () => {
    if (typeof Bun === "undefined") {
        throw new Error("Must be in a server context. Make sure to run using --bun.");
    }

    const vars = {
        SITE_ID: Bun.env.WEBFLOW_SITE_ID,
        COLLECTIONS_ID: Bun.env.WEBFLOW_COLLECTION_ID,
        AUTH_TOKEN: Bun.env.WEBFLOW_AUTH,
    };

    return {
        ...vars,
        API_SITES_URL: `https://api.webflow.com/v2/sites/${vars.SITE_ID}`,
        API_COLLECTIONS_URL: `https://api.webflow.com/v2/collections/${vars.COLLECTIONS_ID}`,
        AUTH_HEADER: { "Authorization": `bearer ${vars.AUTH_TOKEN}` }
    };
};

