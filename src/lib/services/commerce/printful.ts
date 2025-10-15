import type { Printful } from "./util/types";
import { FetchError, type DeepPartial } from "./util/misc";

export default class PrintfulService {
    static Products = class {
        static Variants = class {
            static async get(variantId: number | string): Promise<Printful.Products.SyncVariant | undefined> {
                const res = await fetch(`${env().API_URL}/store/variants/${variantId}`, {
                    method: "GET",
                    headers: { ...env().AUTH_HEADERS }
                });

                if (res.status === 404 || res.status === 400) {
                    return;
                }

                if (!res.ok) {
                    throw await FetchError.createAndParse("Failed to get Printful variant", res);
                }

                const payload: Printful.Products.MetaDataSingle<Printful.Products.SyncVariant> = await res.json();
                return payload.result;
            }
        }

        static async getAll(offset: number = 0): Promise<Printful.Products.SyncProduct[]> {
            const allSyncProducts: Printful.Products.SyncProduct[] = [];

            while (true) {
                try {
                    const res = await fetch(`${env().API_URL}/store/products?offset=${offset}`, {
                        method: "GET",
                        headers: { ...env().AUTH_HEADERS }
                    })

                    if (!res.ok) {
                        throw await FetchError.createAndParse("Failed to get all Printful products", res);
                    }

                    const payload: Printful.Products.MetaDataMulti<Printful.Products.SyncProduct> = await res.json();

                    allSyncProducts.push(...payload.result);
                    offset = allSyncProducts.length;

                    if (allSyncProducts.length >= payload.paging.total)
                        break;
                } catch (error) {
                    throw error;
                }
            }

            return allSyncProducts;
        }

        static async get(productId: number | string): Promise<Printful.Products.Product | undefined> {
            const res = await fetch(`${env().API_URL}/store/products/${productId}`, {
                method: "GET",
                headers: { ...env().AUTH_HEADERS }
            });

            if (res.status === 404 || res.status === 400) {
                return;
            }

            if (!res.ok) {
                throw await FetchError.createAndParse("Failed to get Printful product", res);
            }

            const payload: Printful.Products.MetaDataSingle<Printful.Products.Product> = await res.json();
            return payload.result;
        }

        static async update(printfulProductId: number, printfulProduct: DeepPartial<Printful.Products.Product>) {
            const res = await fetch(`${env().API_URL}/store/products/${printfulProductId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...env().AUTH_HEADERS
                },
                body: JSON.stringify(printfulProduct)
            });

            if (!res.ok) {
                throw await FetchError.createAndParse("Failed to update Printful product", res);
            }
        }
    }

    static Util = class {
        static getVariantMainImage(syncVariant: Printful.Products.SyncVariant): string {
            const previewFile = syncVariant.files.find(f => f.type === "preview");
            return previewFile?.preview_url ?? syncVariant.product.image;
        }
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
