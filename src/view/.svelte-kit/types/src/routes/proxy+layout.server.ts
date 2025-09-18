// @ts-nocheck
import { api } from "$lib";
import type { ActivityStandards } from "../../../services/calculator/main";
import type { LayoutServerLoad } from "./$types";

export const load = async ({ }: Parameters<LayoutServerLoad>[0]) => {
	const { data: allStandardsRaw } = await api.data.standards.get();

	return {
		allStandardsRaw: allStandardsRaw as ActivityStandards
	};
};
