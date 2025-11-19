const axios = require("axios");
const https = require("https");

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (!["GET", "POST"].includes(req.method)) {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    try {
        const API_BASE_URL = "https://128.140.37.194:5000";

        // Create an HTTPS agent for self-signed certificates
        const agent = new https.Agent({
            rejectUnauthorized: false // Only for self-signed certificates
        });

        // Handle GET requests - Get WhatsApp users/managers list
        if (req.method === "GET") {
            const targetUrl = `${API_BASE_URL}/api/v1/whatsapp/users`;

            try {
                console.log("GET WhatsApp users request to:", targetUrl);
                const response = await axios.get(targetUrl, {
                    httpsAgent: agent,
                    timeout: 30000
                });

                console.log("WhatsApp users API success:", response.status);
                res.status(200).json(response.data);
            } catch (axiosError) {
                console.error("WhatsApp users API error:", axiosError.message);
                if (axiosError.response) {
                    res.status(axiosError.response.status).json({
                        error: "WhatsApp users API error",
                        message: axiosError.response.data || axiosError.message
                    });
                } else {
                    res.status(500).json({
                        error: "Internal server error",
                        message: "Failed to fetch WhatsApp users"
                    });
                }
            }
            return;
        }

        // Handle POST requests - Send letter via WhatsApp
        if (req.method === "POST") {
            console.log("Processing WhatsApp send request");

            let requestData;
            try {
                requestData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                res.status(400).json({ error: "Invalid JSON in request body" });
                return;
            }

            const targetUrl = `${API_BASE_URL}/api/v1/whatsapp/send`;

            try {
                console.log("Attempting WhatsApp send API call to:", targetUrl);
                console.log("Payload:", requestData);

                const response = await axios.post(targetUrl, requestData, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    httpsAgent: agent,
                    timeout: 30000,
                });

                console.log("WhatsApp send API success:", response.status);
                res.status(200).json(response.data);

            } catch (axiosError) {
                console.error("WhatsApp send API error:", axiosError.message);
                if (axiosError.response) {
                    console.error("WhatsApp send API response data:", axiosError.response.data);
                    console.error("WhatsApp send API response status:", axiosError.response.status);

                    // Check if it's the "phone already assigned" error
                    const errorData = axiosError.response.data;
                    if (errorData.error && errorData.error.includes("already assigned")) {
                        res.status(409).json(errorData); // 409 Conflict
                    } else {
                        res.status(axiosError.response.status).json({
                            error: "WhatsApp send API error",
                            message: axiosError.response.data || axiosError.message
                        });
                    }
                } else {
                    res.status(500).json({
                        error: "Internal server error",
                        message: "Failed to send letter via WhatsApp. Please try again later."
                    });
                }
            }
        }

    } catch (error) {
        console.error("WhatsApp proxy error:", error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
};
