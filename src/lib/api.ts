import { treaty } from "@elysiajs/eden";
import type { App } from "./server/types";

const baseURL =
	import.meta.env.PROD
		? "https://blade-and-brawn.fly.dev"
		: "http://localhost:5173";

export const api = treaty<App>(baseURL).api;
