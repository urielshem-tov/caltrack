const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET"
};
const JSON_HEADERS = Object.assign({ "Content-Type": "application/json" }, CORS);

function callAnthropic(apiKey, payload) {
  return new Promise(function(resolve, reject) {
    var data = JSON.stringify(payload);
    var req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    }, function(res) {
      var body = "";
      res.on("data", function(chunk) { body += chunk; });
      res.on("end", function() { resolve({ status: res.statusCode, body: body }); });
    });
    req.on("error", reject);
    req.setTimeout(25000, function() { req.destroy(new Error("Anthropic request timed out")); });
    req.write(data);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }

  var apiKey = process.env.ANTHROPIC_API_KEY;

  // Diagnostics: open this URL in a browser to verify setup
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        ok: true,
        message: "Function is alive",
        api_key_present: !!apiKey,
        api_key_prefix: apiKey ? apiKey.slice(0, 8) + "..." : null,
        node_version: process.version
      })
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: { message: "ANTHROPIC_API_KEY is not set in Netlify environment variables" } })
    };
  }

  try {
    var payload = JSON.parse(event.body);
    var result = await callAnthropic(apiKey, payload);
    return { statusCode: result.status, headers: JSON_HEADERS, body: result.body };
  } catch (err) {
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: { message: String((err && err.message) || err) } })
    };
  }
};
