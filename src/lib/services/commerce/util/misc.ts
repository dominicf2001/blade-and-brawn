export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export const formatSlug = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')      // replace illegal chars with dashes
        .replace(/^-+/, '')                // remove leading dashes
        .replace(/-+$/, '')                // remove trailing dashes
        .replace(/--+/g, '-')              // collapse multiple dashes
        .replace(/^([^a-z0-9_])/, '_$1');  // if it starts with an invalid char, prefix underscore
};

export class FetchError extends Error {
    public payload: Object | undefined;

    constructor(message: string, public response: Response) {
        super(message);
        this.name = "FetchError";
    }

    static async createAndParse(message: string, response: Response): Promise<FetchError> {
        const fetchError = new FetchError(message, response);
        try {
            fetchError.payload = await fetchError.response.clone().json();
        } catch {
            fetchError.payload = await fetchError.response.text().catch(() => undefined);
        }
        finally {
            return fetchError;
        }
    }
}

