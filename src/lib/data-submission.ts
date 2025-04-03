// TODO: fix types
// @ts-nocheck

import { supabase } from '@/lib/supabase-client';
import { useEventStore } from "@/stores/event-store";
import { teamInfoTable, robotPhotoTable, robotPhotoBucket } from "@/lib/constants";

export async function getTeamInputElement() {
    let eventStore = useEventStore();
    await eventStore.updateEvent();
    const eventId = eventStore.eventId;

    // Load teams for dropdowns
    const { data, error } = await supabase.from(teamInfoTable).select("*").eq("event_id", eventId).order("team_number", { ascending: true });

    let teamInputElement = {
        key: "team_number",
        label: "Team",
        type: "number",
        options: {},
        defaultValue: null,
        value: null,
        preserveAfterSubmit: false,
        incrementAfterSubmit: false,
        required: true,
        error: false
    };

    if (error) {
        console.log(error);
        return teamInputElement;
    }

    teamInputElement.type = "dropdown";
    teamInputElement.defaultValue = 0;
    teamInputElement.value = 0;
    teamInputElement.options.choices = [{ key: "none", text: "Select team..." }];
    for (var i = 0; i < data.length; i++) {
        var teamItem = {
            key: data[i].team_number,
            text: data[i].team_number + ": " + data[i].name
        };
        teamInputElement.options.choices.push(teamItem);
    }

    return teamInputElement;
}

export function validateForm(form) {
    var isValid = true;

    // TODO: form validation needs more thought.
    form.forEach(section => {
        section.components.forEach(component => {
            if (component.required) {
                // Text validation.
                const isText = component.type == "text" || component.type == "textarea";
                const isRadio = component.type == "radio";
                const isNumber = component.type == "number";
                const isDropdown = component.type == "dropdown";

                if (isText && component.value == "") {
                    // isValid is latching.
                    isValid = false;
                    component.error = true;
                } else if (isRadio && component.value == component.defaultValue) {
                    // isValid is latching.
                    isValid = false;
                    component.error = true;
                } else if (isNumber && component.value == component.defaultValue) {
                    // isValid is latching.
                    isValid = false;
                    component.error = true;
                } else if (isDropdown && component.value == component.defaultValue) {
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

export function parseScoutData(data, eventId) {
    let db_data = {};
    data.forEach(section => {
        section.components.forEach(component => {
            const key = (section.key + "." + component.key).toLowerCase();
            const type = component.type;
            const val = component.value;

            if (type == 'dropdown') {
                db_data[key] = component.options.choices[val].key;
            } else if (type == 'optionswitch') {
                db_data[key] = val ? component.options.selected : component.options.unselected;
            } else if (type == 'stacked-counters') {
                val.forEach((v, i) => {
                    const subKey = (key + "." + component.options.labels[i]).toLowerCase();
                    db_data[subKey] = v;
                });
            } else if (type == 'grid-counters') {
                const sections = component.options.sections;
                const labels = component.options.labels;
                for (var row = 0; row < labels.length; row++) {
                    for (var col = 0; col < sections.length; col++) {
                        const subKey = (key + "." + labels[row] + "." + sections[col].key).toLowerCase();
                        db_data[subKey] = val[row][col];
                    }
                }
            } else {
                db_data[key] = val;
            }
        });
    });

    // Add things that the scout doesn't need to enter every time (the event).
    db_data['event'] = eventId;

    return db_data
}

export async function submitScoutData(data, table) {
    // Submit the data to the database.
    const { error } = await supabase.from(table).insert(data);

    return error;
}

// Upload file using standard upload
export async function uploadFile(file) {
    const { data, error } = await supabase.storage.from(robotPhotoBucket).upload('photos', file, { upsert: true });

    return error;
}