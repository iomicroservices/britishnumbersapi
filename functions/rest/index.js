"use strict";

// Simple handler that instructs callers to select an API version and resource.
// Returns a clear, structured JSON payload following typical API response practices.
module.exports = (req, res) => {
  const basePath = (req && req.baseUrl) ? req.baseUrl : "/rest";

  const payload = {
    status: "info",
    message: "Please select an API version and resource.",
    help: {
      availableVersions: ["v1", "v2"],
      example: `${basePath}/v2/mobile/memorable`,
      docs: "/swagger.json"
    }
  };

  res.status(200).json(payload);
};