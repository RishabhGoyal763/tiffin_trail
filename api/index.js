const path = require("path");

// Ensure backend node_modules are resolvable in both local and deployment environments
const backendModules = path.join(__dirname, "../backend/node_modules");
if (!module.paths.includes(backendModules)) {
  module.paths.push(backendModules);
}

const app = require("../backend/src/server");

module.exports = app;
