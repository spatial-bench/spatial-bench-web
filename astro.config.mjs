import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://spatial-bench.org",
  output: "static",
  integrations: [react()],
  vite: { plugins: [tailwindcss()], envPrefix: ["PUBLIC_", "VITE_"] },
});
