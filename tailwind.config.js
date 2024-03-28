/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,tsx}"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    fontFamily: {
      serif: ["Georgia", "ui-serif", "system-serif"],
      sans: ["system-ui", "sans-serif"],
    },
    extend: {
      colors: {
        // Most of these are stolen from https://tailwindcolor.com/
        "red-bg": "#dc2626",
        "red-light": "#FCA5A5",
        "red-dark": "#DC2626",
        "blue-bg": "#3B82F6",
        "blue-light": "#93C5FD",
        "blue-dark": "#2563EB",
      },
    },
  },
  plugins: [],
  safelist: ["bg-red-500", "bg-blue-500", "lg:text-4xl"],
};
