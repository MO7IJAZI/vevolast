const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  out: "./migrations",
  schema: "./dummy.ts",
  dialect: "mysql",
  dbCredentials: {
    url: "mysql://root:password@localhost:3306/vevoline",
  },
});
