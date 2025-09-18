import { api } from "$lib";
import type { ActivityStandards } from "../../../services/calculator/main";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ }) => {
	const { data: allStandardsRaw } = await api.data.standards.get();

	return {
		allStandardsRaw: allStandardsRaw as ActivityStandards
	};
};
