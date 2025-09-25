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
