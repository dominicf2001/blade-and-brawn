import { treaty } from "@elysiajs/eden";
import { app, type App } from "../../../api";

const apiWrapper = treaty<App>(app);
export const api = apiWrapper.api;

