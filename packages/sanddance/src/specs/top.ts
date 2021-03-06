// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Column } from './types';
import { Data } from 'vega-typings';
import {
    DataName,
    LegendDataName,
    Other,
    TopFieldName,
    TopLookupDataName
} from './constants';

export function topLookup(column: Column, count: number) {
    const data: Data[] = [
        {
            "name": TopLookupDataName,
            "source": DataName,
            "transform": [
                { "type": "aggregate", "groupby": [column.name] },
                { "type": "identifier", "as": "id" },
                { "type": "filter", "expr": `datum.id <= ${count}` }
            ]
        },
        {
            "name": LegendDataName,
            "source": DataName,
            "transform": [
                {
                    "type": "lookup",
                    "from": TopLookupDataName,
                    "key": column.name,
                    "fields": [column.name],
                    "values": [column.name],
                    "as": [TopFieldName]
                },
                {
                    "type": "formula",
                    "expr": `datum.${TopFieldName} || '${Other}'`,
                    "as": TopFieldName
                }
            ]
        }
    ];
    return data;
}
