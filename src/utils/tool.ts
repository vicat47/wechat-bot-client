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