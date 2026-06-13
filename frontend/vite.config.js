import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import frappeui from "frappe-ui/vite"
import path from "node:path"
import fs from "node:fs"

export default defineConfig({
  plugins: [
    frappeui({
      frappeProxy: true,
      lucideIcons: true,
      jinjaBootData: true,
      buildConfig: {
        indexHtmlPath: "../losand/www/los-andalus/manufacture.html",
      },
    }),
    vue(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "tailwind.config.js": path.resolve(__dirname, "tailwind.config.js"),
    },
  },
  server: {
    port: 8087,
    proxy: getProxyOptions(),
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "../losand/public/frontend",
    emptyOutDir: true,
    target: "es2018",
    sourcemap: true,
    commonjsOptions: {
      include: [/tailwind.config.js/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ["frappe-ui > feather-icons", "tailwind.config.js"],
  },
})

function getProxyOptions() {
  const configPath = path.resolve(__dirname, "../../sites/common_site_config.json")
  let webserverPort = 8000
  if (fs.existsSync(configPath)) {
    webserverPort = JSON.parse(fs.readFileSync(configPath)).webserver_port || 8000
  }
  return {
    "^/(app|api|assets|files|private|login|logout)": {
      target: `http://127.0.0.1:${webserverPort}`,
      ws: true,
      router: (req) => `http://${req.headers.host.split(":")[0]}:${webserverPort}`,
    },
  }
}
