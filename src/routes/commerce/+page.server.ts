import { Printful } from '$lib/services/commerce/printful';
import { Webflow } from '$lib/services/commerce/webflow';
import type { PageServerLoad } from './$types';

const productsStore = {
	cache: {
		printful: undefined as Printful.Products.SyncProduct["sync_product"][] | undefined,
		webflow: undefined as Webflow.Products.Product[] | undefined,
	},
	getPrintfulProducts: async () => {
		if (!productsStore.cache.printful) {
			productsStore.cache.printful = await Printful.Products.getAll()
		}
		return productsStore.cache.printful;
	},
	getWebflowProducts: async () => {
		if (!productsStore.cache.webflow) {
			productsStore.cache.webflow = await Webflow.Products.getAll()
		}
		return productsStore.cache.webflow;
	}
};

export const load = async ({ }: Parameters<PageServerLoad>[0]) => {
	return {
		products: {
			printful: productsStore.getPrintfulProducts(),
			webflow: productsStore.getWebflowProducts(),
		}
	};
};
