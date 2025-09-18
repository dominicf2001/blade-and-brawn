import { app } from "$lib/api"

type RequestHandler = (v: { request: Request }) => Response | Promise<Response>
export const fallback: RequestHandler = ({ request }) => app.handle(request)
