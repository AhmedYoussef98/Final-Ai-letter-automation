const axios = require("axios");
const https = require("https");
const formidable = require("formidable");
const FormData = require("form-data");
const fs = require("fs");

module.exports = async (req, res) => {
    // Enable CORS - Updated to support new methods
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }
    
    if (!["GET", "PUT", "POST", "DELETE"].includes(req.method)) {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    
    try {
        const API_BASE_URL = "https://128.140.37.194:5000";
        
        // Create an HTTPS agent for self-signed certificates
        const agent = new https.Agent({
            rejectUnauthorized: false // Only for self-signed certificates
        });

        // Handle GET requests for new endpoints
        if (req.method === "GET") {
            const { endpoint, session_id, category, letter_id, limit, offset, include_expired } = req.query;
            
            let targetUrl;
            switch (endpoint) {
                case "letter-categories":
                    targetUrl = `${API_BASE_URL}/api/v1/letter/categories`;
                    break;
                case "letter-template":
                    targetUrl = `${API_BASE_URL}/api/v1/letter/templates/${category}`;
                    break;
                case "chat-sessions":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/sessions`;
                    if (include_expired) targetUrl += `?include_expired=${include_expired}`;
                    break;
                case "chat-history":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/sessions/${session_id}/history`;
                    const params = new URLSearchParams();
                    if (limit) params.append('limit', limit);
                    if (offset) params.append('offset', offset);
                    if (params.toString()) targetUrl += `?${params.toString()}`;
                    break;
                case "chat-status":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/sessions/${session_id}/status`;
                    break;
                case "memory-stats":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/memory/stats`;
                    break;
                case "memory-instructions":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/memory/instructions`;
                    const memParams = new URLSearchParams();
                    if (category) memParams.append('category', category);
                    if (session_id) memParams.append('session_id', session_id);
                    if (memParams.toString()) targetUrl += `?${memParams.toString()}`;
                    break;
                case "archive-status":
                    targetUrl = `${API_BASE_URL}/api/v1/archive/status/${letter_id}`;
                    break;
                default:
                    return res.status(400).json({ error: "Invalid GET endpoint" });
            }
            
            try {
                console.log("GET request to:", targetUrl);
                const response = await axios.get(targetUrl, {
                    httpsAgent: agent,
                    timeout: 30000
                });
                
                console.log("GET API success:", response.status);
                res.status(200).json(response.data);
            } catch (axiosError) {
                console.error(`GET ${endpoint} API error:`, axiosError.message);
                if (axiosError.response) {
                    res.status(axiosError.response.status).json({
                        error: `${endpoint} API error`,
                        message: axiosError.response.data || axiosError.message
                    });
                } else {
                    res.status(500).json({
                        error: "Internal server error",
                        message: `Failed to call ${endpoint} endpoint`
                    });
                }
            }
            return;
        }

        // Handle DELETE requests
        if (req.method === "DELETE") {
            const { endpoint, session_id } = req.query;
            
            let targetUrl;
            switch (endpoint) {
                case "delete-chat-session":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/sessions/${session_id}`;
                    break;
                default:
                    return res.status(400).json({ error: "Invalid DELETE endpoint" });
            }
            
            try {
                console.log("DELETE request to:", targetUrl);
                const response = await axios.delete(targetUrl, {
                    httpsAgent: agent,
                    timeout: 30000
                });
                
                console.log("DELETE API success:", response.status);
                res.status(200).json(response.data);
            } catch (axiosError) {
                console.error(`DELETE ${endpoint} API error:`, axiosError.message);
                if (axiosError.response) {
                    res.status(axiosError.response.status).json({
                        error: `${endpoint} API error`,
                        message: axiosError.response.data || axiosError.message
                    });
                } else {
                    res.status(500).json({
                        error: "Internal server error",
                        message: `Failed to call ${endpoint} endpoint`
                    });
                }
            }
            return;
        }

        // Handle PUT requests
        if (req.method === "PUT") {
            console.log("Processing PUT request");
            
            let requestData;
            try {
                requestData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                res.status(400).json({ error: "Invalid JSON in request body" });
                return;
            }
            
            const { endpoint, data } = requestData;
            
            let targetUrl;
            switch (endpoint) {
                case "update-archive":
                    targetUrl = `${API_BASE_URL}/api/v1/archive/update`;
                    break;
                default:
                    console.log("Invalid PUT endpoint:", endpoint);
                    return res.status(400).json({ error: "Invalid endpoint" });
            }
            
            try {
                console.log(`Attempting ${endpoint} PUT call to:`, targetUrl);
                console.log("Payload:", data);
                
                const response = await axios.put(targetUrl, data, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    httpsAgent: agent,
                    timeout: 30000,
                });
                
                console.log(`${endpoint} PUT success:`, response.status);
                res.status(200).json(response.data);
                
            } catch (axiosError) {
                console.error(`${endpoint} PUT error:`, axiosError.message);
                if (axiosError.response) {
                    console.error(`${endpoint} PUT response data:`, axiosError.response.data);
                    console.error(`${endpoint} PUT response status:`, axiosError.response.status);
                    res.status(axiosError.response.status).json({
                        error: `${endpoint} PUT error`,
                        message: axiosError.response.data || axiosError.message
                    });
                } else {
                    res.status(500).json({
                        error: "Internal server error",
                        message: `Failed to call ${endpoint}. Please try again later.`
                    });
                }
            }
            return;
        }

        // Handle POST requests
        const contentType = req.headers["content-type"] || "";
        
        if (contentType.includes("multipart/form-data")) {
            console.log("Processing FormData request for archive-letter");
            
            const form = new formidable.IncomingForm({
                multiples: true,
                keepExtensions: true,
                maxFileSize: 50 * 1024 * 1024, // 50MB
            });

            form.parse(req, async (err, fields, files) => {
                if (err) {
                    console.error("Formidable error:", err);
                    res.status(500).json({
                        error: "Internal server error",
                        message: "Failed to parse form data."
                    });
                    return;
                }

                console.log("Parsed fields:", fields);
                console.log("Parsed files:", Object.keys(files));

                // Updated to use new API endpoint
                const targetUrl = `${API_BASE_URL}/api/v1/archive/letter/docx`;
                const formData = new FormData();

                // Append fields - Handle both single values and arrays properly
                for (const key in fields) {
                    if (key !== 'endpoint') { // Skip the endpoint field we added
                        const value = fields[key];
                        
                        // Check if value is an array
                        if (Array.isArray(value)) {
                            // If it's an array, append each value separately or take the first one
                            if (value.length > 0) {
                                // For most cases, we want the first value
                                formData.append(key, value[0]);
                                console.log(`Added field (from array): ${key} = ${value[0]}`);
                            }
                        } else {
                            // If it's a single value, append it directly
                            formData.append(key, value);
                            console.log(`Added field: ${key} = ${value}`);
                        }
                    }
                }

                // Append files
                for (const key in files) {
                    const file = files[key];
                    
                    // Handle both single files and arrays of files
                    if (Array.isArray(file)) {
                        // If it's an array of files, append each one
                        file.forEach((f, index) => {
                            if (f && f.filepath) {
                                const fileKey = file.length > 1 ? `${key}_${index}` : key;
                                formData.append(fileKey, fs.createReadStream(f.filepath), {
                                    filename: f.originalFilename || 'file',
                                    contentType: f.mimetype || 'application/octet-stream'
                                });
                                console.log(`Added file (from array): ${fileKey} = ${f.originalFilename}`);
                            }
                        });
                    } else {
                        // Single file
                        if (file && file.filepath) {
                            formData.append(key, fs.createReadStream(file.filepath), {
                                filename: file.originalFilename || 'file',
                                contentType: file.mimetype || 'application/octet-stream'
                            });
                            console.log(`Added file: ${key} = ${file.originalFilename}`);
                        }
                    }
                }

                try {
                    console.log("Sending request to:", targetUrl);
                    const response = await axios.post(targetUrl, formData, {
                        headers: {
                            ...formData.getHeaders(),
                        },
                        httpsAgent: agent,
                        timeout: 30000, // 30 seconds timeout
                    });
                    
                    console.log("Archive API success:", response.status);
                    res.status(200).json(response.data);
                    
                } catch (axiosError) {
                    console.error("Archive API error:", axiosError.message);
                    if (axiosError.response) {
                        console.error("Archive API response data:", axiosError.response.data);
                        console.error("Archive API response status:", axiosError.response.status);
                        res.status(axiosError.response.status).json({
                            error: "Archive API error",
                            message: axiosError.response.data || axiosError.message
                        });
                    } else {
                        res.status(500).json({
                            error: "Internal server error",
                            message: "Failed to archive letter. Please try again later."
                        });
                    }
                }
            });
            
        } else {
            // Handle JSON requests - Updated with new endpoints
            console.log("Processing JSON request");
            
            let requestData;
            try {
                requestData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                res.status(400).json({ error: "Invalid JSON in request body" });
                return;
            }
            
            const { endpoint, data } = requestData;
            
            // Map endpoints to new API structure
            let targetUrl;
            switch (endpoint) {
                case "generate-letter":
                    targetUrl = `${API_BASE_URL}/api/v1/letter/generate`; // Updated endpoint
                    break;
                case "validate-letter":
                    targetUrl = `${API_BASE_URL}/api/v1/letter/validate`;
                    break;
                case "edit-letter":
                    // For edit-letter, we need the session_id from data
                    targetUrl = `${API_BASE_URL}/api/v1/chat/sessions/${data.session_id}/edit`;
                    break;
                case "create-chat-session":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/sessions`;
                    break;
                case "extend-chat-session":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/sessions/${data.session_id}/extend`;
                    break;
                case "cleanup-chat":
                    targetUrl = `${API_BASE_URL}/api/v1/chat/cleanup`;
                    break;
                case "archive-letter":
                    targetUrl = `${API_BASE_URL}/api/v1/archive/letter/docx`; // Updated endpoint
                    break;
                case "update-archive":
                    targetUrl = `${API_BASE_URL}/api/v1/archive/update`; // For Updating the already archived letters
                    break;
                default:
                    console.log("Invalid endpoint:", endpoint);
                    return res.status(400).json({ error: "Invalid endpoint" });
            }
            
            try {
                console.log(`Attempting ${endpoint} API call to:`, targetUrl);
                console.log("Payload:", data);
                
                const response = await axios.post(targetUrl, data, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    httpsAgent: agent,
                    timeout: 30000, // 30 seconds timeout
                });
                
                console.log(`${endpoint} API success:`, response.status);
                res.status(200).json(response.data);
                
            } catch (axiosError) {
                console.error(`${endpoint} API error:`, axiosError.message);
                if (axiosError.response) {
                    console.error(`${endpoint} API response data:`, axiosError.response.data);
                    console.error(`${endpoint} API response status:`, axiosError.response.status);
                    res.status(axiosError.response.status).json({
                        error: `${endpoint} API error`,
                        message: axiosError.response.data || axiosError.message
                    });
                } else {
                    res.status(500).json({
                        error: "Internal server error",
                        message: `Failed to call ${endpoint}. Please try again later.`
                    });
                }
            }
        }
        
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ 
            error: "Internal server error",
            message: error.message 
        });
    }
};



