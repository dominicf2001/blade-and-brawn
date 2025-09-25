import type { Printful } from "./util/types";
import { type DeepPartial } from "./util/misc";

export default class PrintfulService {
    static Products = class {
        static async getAll(offset: number = 0): Promise<Printful.Products.SyncProduct[]> {
            const allSyncProducts: Printful.Products.SyncProduct[] = [];

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

                    const payload: Printful.Products.MetaDataMulti<Printful.Products.SyncProduct> = await res.json();

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

        static async get(printfulProductId: number): Promise<Printful.Products.Product> {
            const res = await fetch(`${env().API_URL}/store/products/${printfulProductId}`, {
                method: "GET",
                headers: { ...env().AUTH_HEADERS }
            });

            if (!res.ok) {
                console.error("Printful product update failed:", res.statusText);
                throw new Error("Failed to update Printful product");
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
                console.error("Printful product update failed:", res.statusText);
                throw new Error("Failed to update Printful product");
            }
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
