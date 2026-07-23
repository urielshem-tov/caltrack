// netlify/functions/sync.js
// Triggers the Garmin sync GitHub Actions workflow (workflow_dispatch).
// The GitHub token is read from a Netlify environment variable (GITHUB_TOKEN),
// so it never reaches the browser.

const https = require("https");

const OWNER = "urielshem-tov";
const REPO = "garmin";
const WORKFLOW = "garmin-sync.yml";

exports.handler = async function () {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Missing GITHUB_TOKEN env var" }) };
  }

  const payload = JSON.stringify({ ref: "main" });
  const options = {
    hostname: "api.github.com",
    path: "/repos/" + OWNER + "/" + REPO + "/actions/workflows/" + WORKFLOW + "/dispatches",
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      // GitHub's API rejects requests without a User-Agent.
      "User-Agent": "caltrack-sync"
    }
  };

  return new Promise(function (resolve) {
    const req = https.request(options, function (res) {
      let body = "";
      res.on("data", function (c) { body += c; });
      res.on("end", function () {
        const ok = res.statusCode === 204;
        resolve({
          statusCode: ok ? 200 : res.statusCode,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ok: ok, status: res.statusCode, detail: body })
        });
      });
    });
    req.on("error", function (e) {
      resolve({ statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) });
    });
    req.write(payload);
    req.end();
  });
};
