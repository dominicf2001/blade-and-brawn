import PrintfulService from "$lib/services/commerce/printful";
import WebflowService from "$lib/services/commerce/webflow";
import type { PageServerLoad } from "./$types";

export const load = async ({}: Parameters<PageServerLoad>[0]) => {
    return {
        products: {
            printful: PrintfulService.Products.getAll(),
            webflow: WebflowService.Products.getAll(),
        },
    };
};
