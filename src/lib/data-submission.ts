// TODO: fix types
// @ts-nocheck

import { supabase } from '@/lib/supabase-client';

export function validateForm(form) {
    var isValid = true;

    // TODO: form validation needs more thought.
    form.forEach(section => {
        section.components.forEach(component => {
            if (component.required) {
                // Text validation.
                const isText = component.type == "text" || component.type == "textarea";
                if (isText && component.value == "") {
                    // isValid is latching.
                    isValid = false;
                    component.error = true;
                } else {
                    component.error = false;
                }
            }
        });
    });

    return {
        data: form,
        valid: isValid 
    };
}

export function parseMatchData(data, eventId) {
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
            } else if (type == 'stacked-counters') {
                val.forEach((v, i) => {
                    const subKey = key + "." + component.options.labels[i];
                    db_data[subKey] = v;
                });
            } else {
                db_data[key] = val;
            }
        });
    });

    // Add things that the scout doesn't need to enter every time (the event).
    db_data['event'] = eventId;

    return db_data
}

export async function submitMatchData(data, table) {
    // Submit the data to the database.
    const { error } = await supabase.from(table).insert(data);

    return error;
}