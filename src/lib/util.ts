// TODO: fix types
// @ts-nocheck

export function computeSortRanking(a, b, isDescending) {
    // If this is a number, sort numerically.
    if (typeof a == 'number' && isDescending) {
        return b - a;
    } else if (typeof a == 'number') {
        return a - b;
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
    var items = Object.keys(dict).map(function(key: String) {
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