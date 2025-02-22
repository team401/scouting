import { defineStore } from "pinia";

export const useViewModeStore = defineStore('viewMode', {
    state() {
        return {
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            darkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        }
    },
    getters: {
        isMobile(): boolean {
            return this.screenWidth <= 720;
        },
        windowHeight(): number {
            return this.screenHeight;
        },
        isDarkMode(): boolean {
            return this.darkMode;
        }
    },
    actions: {
        updateScreenWidth(width: number) {
            this.screenWidth = width;
        },
        updateScreenHeight(height: number) {
            this.screenHeight = height;
        }
    }
});
