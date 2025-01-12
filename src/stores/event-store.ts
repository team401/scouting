// TODO: fix types
// @ts-nocheck

import { defineStore } from "pinia";

import { defaultEventId } from '@/lib/constants';
import { getCurrentEventInfo } from '@/lib/event-management';

export const useEventStore = defineStore('event', {
    state() {
        return {
            id: defaultEventId,
            name: "",
            isUpdated: false
        }
    },
    getters: {
        eventId(): boolean {
            return this.id;
        },
        eventName(): String {
            return this.name
        },
        isLoaded(): boolean {
            return this.isUpdated;
        }
    },
    actions: {
        async updateEvent() {
            this.isUpdated = false;
            const info = await getCurrentEventInfo();
            this.id = info.id;
            this.name = info.name;
            this.isUpdated = true;
        }
    }
});
