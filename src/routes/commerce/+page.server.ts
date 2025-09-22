import { Printful } from '$lib/services/commerce/printful';
import { Webflow } from '$lib/services/commerce/webflow';
import type { PageServerLoad } from './$types';

export const load = async ({ }: Parameters<PageServerLoad>[0]) => {
	return {
		products: {
			printful: Printful.Products.getAll(),
			webflow: Webflow.Products.getAll(),
		}
	};
};
