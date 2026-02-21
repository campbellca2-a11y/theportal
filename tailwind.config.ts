import type { Config } from "tailwindcss";

const config: Config|any = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ensuring deep espresso tones for the "vibe"
        stone: {
          950: "#0c0a09",
        },
      },
    },
  },
  plugins: [],
};
export default config;