// TODO: fix types
// @ts-nocheck

import { supabase } from '@/lib/supabase-client';
import { defaultEventId, useDefaultEvent, eventInfoTable } from '@/lib/constants';

export async function getCurrentEventInfo() {
    // Set the default information
    var info = {
        id: defaultEventId,
        name: ""
    };


    if (useDefaultEvent) {
        const { data, error } = await supabase.from(eventInfoTable).select("*").eq("event_id", defaultEventId).limit(1);

        // If event data couldn't be retrieved, print the error and use the defaults.
        if (error || data.length == 0) {
            console.log(error);
            return info;
        }

        // Set the event's name.
        info.name = data[0].name;
        return info;
    }

    // If we aren't using the default event, determine which event is most appropriate.

    // Pull all events for the season from supabase.
    const { data, error } = await supabase.from(eventInfoTable).select("*");

    // If event data couldn't be retrieved, print the error and use the defaults.
    if (error) {
        console.log(error);
        return info;
    }

    // Get today's date.
    var today = new Date();

    // Run through each event. We want to find the closest start OR end date to today's date. 
    // The reason why we don't limit to just future/in-progress events is to avoid edge cases 
    // where the UTC time flips to a new date during the event, causing our event to change 
    // despite being in progress.
    var closestDate = new Date('1970-01-01');
    var closestEvent = null;
    for (var i = 0; i < data.length; i++) {
        const eventStart = new Date(data[i].start_date);
        const eventEnd = new Date(data[i].end_date);

        // If the event is in progress, set it as the active event and break out of the loop.
        // Note: when competing at two simultaneous events, the useDefaultEvent flag should be used.
        if (today >= eventStart && today <= eventEnd) {
            closestEvent = data[i];
            closestDate = today;
            break;
        }

        // IF there are no events in progress, find the difference between today and these three dates:
        // 1. the current closest date, as tracked above.
        // 2. the given event's start date.
        // 3. the given event's end date.
        const closestDiff = Math.abs(today - closestDate);
        const startDiff = Math.abs(today - eventStart);
        const endDiff = Math.abs(today - eventEnd);

        // If the difference between today and the start date is lower than the currently tracked
        // closest difference (and the difference between today and the end date), set this event 
        // as the closest.
        if (startDiff < closestDiff && startDiff < endDiff) {
            closestDate = eventStart;
            closestEvent = data[i];
        } else if (endDiff < closestDiff) {
            // If the difference between today and the end date is lower than the currently tracked
            // closest difference, set this event as the closest.
            closestDate = eventEnd;
            closestEvent = data[i];
        }
    }

    // Given the closest event info, update info.
    if (closestEvent != null) {
        info.id = closestEvent.event_id;
        info.name = closestEvent.name;
    }

    return info;
}
