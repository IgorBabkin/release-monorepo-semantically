const { execSync } = require('node:child_process');

const token = process.env.NPM_TOKEN?.trim() || "";
const hasNpmToken = token.length > 0;

if (hasNpmToken) {
  console.log("NPM_TOKEN detected: running semantic-release with npm publish.");
  execSync("npx semantic-release", {
    stdio: "inherit",
    env: process.env,
  });
} else {
  console.log("NPM_TOKEN missing: skipping @semantic-release/npm step.");
  execSync("npx semantic-release --config scripts/release.no-npm.cjs", {
    stdio: "inherit",
    env: process.env,
  });
}
