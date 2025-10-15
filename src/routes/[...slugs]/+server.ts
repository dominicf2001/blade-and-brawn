import { app } from "$lib/server/app"

type RequestHandler = (v: { request: Request }) => Response | Promise<Response>
export const fallback: RequestHandler = ({ request }) => app.handle(request)
