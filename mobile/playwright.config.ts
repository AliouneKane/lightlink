import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:8082", trace: "retain-on-failure" },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
    { name: "compact", use: { ...devices["Galaxy S9+"] } },
  ],
  webServer: {
    command: "node scripts/serve-preview.mjs",
    url: "http://127.0.0.1:8082",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
