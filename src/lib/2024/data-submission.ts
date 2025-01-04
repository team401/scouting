// TODO: fix types
// @ts-nocheck

import { supabase } from '@/lib/supabase-client';
import { dataEntryTable, eventId } from '@/lib/2024/constants';

export function parseMatchData(data) {
    let db_data = {};
    data.forEach(section => {
        section.components.forEach(component => {
            const key = section.key + "." + component.key;
            const type = component.type;
            const val = component.value;

            if (type == 'dropdown') {
                db_data[key] = component.options.choices[val].key;
            } else if (type == 'optionswitch') {
                db_data[key] = val ? component.options.selected : component.options.unselected;
            } else {
                db_data[key] = val;
            }
            
            
        })
    });

    // Add things that the scout doesn't need to enter every time (the event).
    db_data['event'] = eventId;

    return db_data
}

export async function submitMatchData(data) {
    // Submit the data to the database.
    const { error } = await supabase.from(dataEntryTable + "dfdfa").insert(data);

    return error;
}