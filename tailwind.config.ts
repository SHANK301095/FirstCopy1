import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff3ed",
          500: "#ef5a2f",
          700: "#c3401b"
        }
      }
    }
  },
  plugins: []
};

export default config;
