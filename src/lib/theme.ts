// TODO: fix types
// @ts-nocheck

import { useViewModeStore } from "@/stores/view-mode-store";



// Common chart colors
export const dataPointColor = "#c78000";
export const dataPointColorTranslucent = "#c7800080";
export const dataPointAccentColor = "#009879";
export const dataPointAccentColorTranslucent = "#00987980";


// radar color options
export const radarRedTheme = {
    background: 'rgba(255,99,132,0.2)',
    border: 'rgba(255,99,132,1)',
    pointBackground: 'rgba(255,99,132,1)',
    pointHoverBorder: 'rgba(255,99,132,1)'
}


// Light mode chart colors
const chartTextColorLightMode =
{
    axesText: "#555",
    dataLabels: "#333",
    legend: "#555"
};

const chartGridColorLightMode = {
    axes: "rgba(0, 0, 0, 0.1)",
}

const lightThemeColors = {
    text: chartTextColorLightMode,
    grid: chartGridColorLightMode,
    background: 'rgba(255, 255, 255, 0)'
}

// Dark mode chart colors
const chartTextColorDarkMode = {
    axesText: "#AAA",
    dataLabels: "#CCC",
    legend: "#AAA"
};

const chartGridColorDarkMode = {
    lines: "rgba(255, 255, 255, 0.1)",
}

const darkThemeColors = {
    text: chartTextColorDarkMode,
    grid: chartGridColorDarkMode,
    background: "#27272700"
}


export function getThemeColors() {
    const viewMode = useViewModeStore();

    if (viewMode.isDarkMode) {
        return darkThemeColors;
    }
    return lightThemeColors;
}