import { defineStore } from "pinia";

export const useViewModeStore = defineStore('viewMode', {
    state() {
        return {
            screenWidth: window.innerWidth
        }
    },
    getters: {
        isMobile(): boolean {
            return this.screenWidth <= 720;
        }
    },
    actions: {
        updateScreenWidth(width: number) {
            this.screenWidth = width;
        }
    }
});
