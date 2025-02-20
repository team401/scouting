// TODO: fix types
// @ts-nocheck

import { mean } from 'simple-statistics';

export function computeSortRanking(a, b, isDescending) {
    // Clean inputs to be normal objects rather than Proxy objects
    a = JSON.parse(JSON.stringify(a));
    b = JSON.parse(JSON.stringify(b));

    // If this is a number, sort numerically.
    if (typeof a == 'number' && isDescending) {
        return b - a;
    } else if (typeof a == 'number') {
        return a - b;
    } else if (Array.isArray(a) && typeof a[0] == 'number' && isDescending) {
        return mean(b) - mean(a);
    } else if (Array.isArray(a) && typeof a[0] == 'number') {
        return mean(a) - mean(b);
    } else if (isDescending) {
        return b.localeCompare(a);
    }

    // Otherwise use string comparison
    return a.localeCompare(b);
}

export function keyValueArraySort(items: Array): Array {
    // Sort the list of lists.
    items.sort((first, second) =>
        computeSortRanking(first[1], second[1], true)
    );

    return items;
}

export function sortDictionaryValues(dict: Object): Array {
    // Load the dictionary into a list of lists.
    var items = Object.keys(dict).map(function (key: String) {
        return [key, dict[key]];
    });

    return keyValueArraySort(items);
}

export function sortKeyValueArrays(keys: Array<String>, values: Array<any>): Array {
    var items = keys.map(function (e, i) {
        return [e, values[i]];
    });

    return keyValueArraySort(items);
}

export function filterOutKeys(data: Object, keysToRemove: Array): Object {
    let filteredData = {};
    Object.keys(data).forEach(key => {
        if (!keysToRemove.includes(key)) {
            filteredData[key] = data[key];
        }
    });
    return filteredData;
}

export function getNumberWithOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
