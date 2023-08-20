export const asEnum = <
    T extends { [key: string]: string },
    K extends keyof T & string
>(
    enumObject: T,
    value: `${T[K]}`
): T[K] => {
    if (Object.values(enumObject).includes(value)) {
        return (value as unknown) as T[K];
    } else {
        throw new Error('Value provided was not found in Enum');
    }
};

export function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: any) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target: any, ...sources: any): any {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return mergeDeep(target, ...sources);
}
