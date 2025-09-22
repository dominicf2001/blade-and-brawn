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

export const getProductImageUrls = async (slug: string) => {
    const res = await (fetch(`${R2_WORKER_URL}/product-images/${slug}`));
    if (!res.ok) {
        console.error("Failed to get product image keys:", res.statusText);
        throw new Error("Failed to get product image keys");
    }
    const productImageKeys: string[] = await res.json();
    return productImageKeys.map(key => `${WEBSITE_MEDIA_URL}/${key}`);
}

export const R2_WORKER_URL = "https://r2-worker.xominus.workers.dev";
export const WEBSITE_MEDIA_URL = "https://website-media.bladeandbrawn.com";  
