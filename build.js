const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "frontend");
const destDir = path.join(__dirname, "public");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy all static files and folders from frontend to public
fs.cpSync(srcDir, destDir, { recursive: true });
console.log("✅ Static frontend build complete: all assets copied to public/");
