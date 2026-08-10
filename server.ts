import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini Proxy
  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, jsonMode, googleSearch } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const model = "gemini-3.5-flash"; // highly fast & standard general-purpose flash model
      
      const config: any = {};
      if (jsonMode) {
        config.responseMimeType = "application/json";
      }
      if (googleSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config
      });

      res.json({ text: response.text });
    } catch (err: any) {
      const isQuota = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("credits") || err.status === 429;
      const isPermissionDenied = err.message?.includes("403") || err.message?.includes("PERMISSION_DENIED") || err.message?.includes("denied access") || err.status === 403;

      if (isQuota) {
        console.warn("Gemini API quota/prepayment credits depleted (429 RESOURCE_EXHAUSTED).");
        return res.status(429).json({ 
          error: "Gemini API quota or prepayment credits exhausted (429 RESOURCE_EXHAUSTED). Please manage your AI Studio project billing.",
          isQuotaExhausted: true 
        });
      }
      if (isPermissionDenied) {
        console.warn("Gemini API permission denied (403 PERMISSION_DENIED).");
        return res.status(403).json({
          error: "Gemini API project permission denied (403 PERMISSION_DENIED). Please check your API key and project access.",
          isPermissionDenied: true
        });
      }
      console.warn("Gemini server proxy error:", err.message || err);
      res.status(500).json({ error: err.message || "Failed to make Gemini API request" });
    }
  });

  // API Route to Parse Receipt Image using Gemini
  app.post("/api/parse-receipt", async (req, res) => {
    try {
      const { image } = req.body; // base64 image data URL
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      // Extract raw base64 and mimeType
      let mimeType = "image/jpeg";
      let base64Data = image;
      if (image.startsWith("data:")) {
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `Analyze this receipt image and parse the details.
Extract:
1. Vendor/Merchant name.
2. Date of transaction (convert to YYYY-MM-DD format).
3. Receipt number or Invoice number (if present, else empty string).
4. List of individual items purchased with their cost.
5. Subtotal amount.
6. Tax amount (if present, else 0).
7. Tip/Gratuity amount (if present, else 0).
8. Total charge / transaction total.

Format your response as a valid, parseable JSON object matching this schema exactly:
{
  "vendor": "string",
  "date": "string (YYYY-MM-DD)",
  "receiptNumber": "string",
  "items": [
    {
      "name": "string",
      "cost": number
    }
  ],
  "subtotal": number,
  "tax": number,
  "tip": number,
  "totalCharge": number
}

Ensure all numeric fields are actual floats/numbers (not strings). If any field cannot be found on the receipt, return a logical default (e.g. 0 for missing subtotal/tax/tip/total, empty string for missing receiptNumber, empty array for missing items, or today's date for date).
Do not include any explanation or markdown formatting backticks (like \`\`\`json). Return ONLY the raw valid JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            }
          },
          {
            text: promptText
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vendor: { type: Type.STRING, description: "Vendor or Merchant name" },
              date: { type: Type.STRING, description: "Date of transaction in YYYY-MM-DD format" },
              receiptNumber: { type: Type.STRING, description: "Receipt or invoice number if present, else empty string" },
              items: {
                type: Type.ARRAY,
                description: "List of individual items purchased",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Item name" },
                    cost: { type: Type.NUMBER, description: "Cost of the item" }
                  },
                  required: ["name", "cost"]
                }
              },
              subtotal: { type: Type.NUMBER, description: "Subtotal amount" },
              tax: { type: Type.NUMBER, description: "Tax amount" },
              tip: { type: Type.NUMBER, description: "Tip or gratuity amount" },
              totalCharge: { type: Type.NUMBER, description: "Total charge or transaction total" }
            },
            required: ["vendor", "date", "receiptNumber", "items", "subtotal", "tax", "tip", "totalCharge"]
          }
        }
      });

      const resultText = response.text?.trim() || "{}";
      let parsedResult;
      try {
        parsedResult = JSON.parse(resultText);
      } catch (parseErr) {
        console.error("Failed to parse receipt JSON from Gemini, returning default structure", parseErr);
        parsedResult = {
          vendor: "Receipt Merchant",
          date: new Date().toISOString().split("T")[0],
          receiptNumber: "",
          items: [],
          subtotal: 0,
          tax: 0,
          tip: 0,
          totalCharge: 0
        };
      }
      res.json({ success: true, data: parsedResult });
    } catch (err: any) {
      console.error("Parse receipt error:", err);
      // Return safe fallback so client UI does not crash
      res.json({ 
        success: true, 
        data: {
          vendor: "Scanned Receipt Merchant",
          date: new Date().toISOString().split("T")[0],
          receiptNumber: "",
          items: [],
          subtotal: 0,
          tax: 0,
          tip: 0,
          totalCharge: 0
        },
        warning: "Gemini API quota/prepayment credits depleted. Default values loaded."
      });
    }
  });

  // API Route to Perform Smart Task Autofill & Search Grounding referencing Notes, Collaborators, Locations, and Plans
  app.post("/api/ai-autofill-task", async (req, res) => {
    try {
      const { pastedText, notes, collaborators, existingLocations, generatedPlans, currentDate } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const todayStr = currentDate || new Date().toISOString().split("T")[0];
      
      const promptText = `You are an advanced task-filler assistant for the "Taskpass Studio" application.
The user has pasted or typed the following text to describe a task they want to schedule:
"${pastedText || ""}"

To make sure this task is perfectly contextualized and matched against the user's active life schedules, use these workspace references:
- Active Notes / Contextual Sticky Notes: ${JSON.stringify(notes || [])}
- Registered Collaborators: ${JSON.stringify(collaborators || [])}
- Historically Used/Known Locations: ${JSON.stringify(existingLocations || [])}
- Active Plans / Routines / System Blueprints: ${JSON.stringify(generatedPlans || [])}

Your Goal:
Extract and populate as many of the following task sheet form fields as possible.
If the pasted text describes a public event, a business (e.g. "meeting at Blue Bottle Coffee on University Ave"), coordinates, flight details, or standard information (e.g., "Apple Keynote", "San Jose airport opening hours"), please use the googleSearch tool to resolve details such as the exact formatted address/location, start time, phone number, and any relevant dates!

Fields to extract:
1. title: A polished, human-friendly concise name for the task (e.g., "Lunch with Sarah", "Philz Coffee Session").
2. date: The task date in YYYY-MM-DD format. Check if the text refers to days of the week (e.g. "this Friday" or "next Monday"). Use the reference current date of "${todayStr}" to calculate the target date.
3. time: Formatted in 24-hr "HH:MM" (e.g. "15:45", "09:00", "20:30"). If not specified or implied, leave it empty or guess logically if appropriate.
4. duration: Estimated duration (e.g., "30 min", "45 min", "1 hour", "90 min", "2 hours"). Return string matching the standard user format.
5. location: Resolved physical address, store location, venue name, flight gate, or URL search result. Give priority to full address strings found via web search grounding.
6. attendees: A comma-separated list of attendees. Match against the Registered Collaborators list wherever applicable.
7. phone: Contact phone number of any business or person identified via web search or text context.
8. notes: Clean descriptive notes, summaries of what to bring, search citations/web references, or relevant content extracted from user's notes and plans. Do not include JSON inside notes; keep it user-readable.
9. priority: One of "none", "low", "medium", "high". Set logically (e.g. "urgent meeting" -> "high").
10. category: Best matching category (e.g. Errand, Work, Personal, Routine, etc.) or matching one of user's categories.
11. collaborator: Exactly matches one of the user's registered collaborators from: ${JSON.stringify(collaborators || [])}. If none matches, leave empty.
12. isLocked: true if the task state is stated as unmovable, highly urgent, or locked; otherwise false.
13. isAllDay: true if this is an all-day event or lacks a specific hour duration; otherwise false.

In addition, provide an "aiSummary" detailing:
- What web searches you performed (if any).
- Which context items (notes, collaborators, plans, locations) you referenced or cross-matched.
- A summary of what you filled in and why.

Provide your output as a single valid parseable JSON object matching this schema:
{
  "title": "string",
  "date": "string (YYYY-MM-DD)",
  "time": "string (HH:MM) or empty",
  "duration": "string or empty",
  "location": "string or empty",
  "attendees": "string",
  "phone": "string",
  "notes": "string",
  "priority": "none|low|medium|high",
  "category": "string",
  "collaborator": "string",
  "isLocked": boolean,
  "isAllDay": boolean,
  "aiSummary": "string describing your search grounding & context mapping"
}

Do not return any explanation or markdown backticks outside of the raw JSON code. Return ONLY valid, parseable JSON text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              time: { type: Type.STRING },
              duration: { type: Type.STRING },
              location: { type: Type.STRING },
              attendees: { type: Type.STRING },
              phone: { type: Type.STRING },
              notes: { type: Type.STRING },
              priority: { type: Type.STRING },
              category: { type: Type.STRING },
              collaborator: { type: Type.STRING },
              isLocked: { type: Type.BOOLEAN },
              isAllDay: { type: Type.BOOLEAN },
              aiSummary: { type: Type.STRING }
            },
            required: [
              "title", "date", "time", "duration", "location", "attendees", "phone",
              "notes", "priority", "category", "collaborator", "isLocked", "isAllDay", "aiSummary"
            ]
          }
        }
      });

      let parsedResult;
      try {
        parsedResult = JSON.parse(response.text?.trim() || "{}");
      } catch (parseErr) {
        console.error("AI Autofill Task JSON Parse Error:", parseErr);
        parsedResult = {
          title: pastedText?.substring(0, 50) || "Autofilled Task",
          date: todayStr,
          time: "",
          duration: "30 min",
          location: "",
          attendees: "",
          phone: "",
          notes: pastedText || "",
          priority: "none",
          category: "Errand",
          collaborator: "",
          isLocked: false,
          isAllDay: false,
          aiSummary: "Fallback parsing due to structured output JSON format mismatch."
        };
      }
      res.json({ success: true, data: parsedResult });
    } catch (err: any) {
      console.error("AI Autofill Task Error:", err);
      // Return local fallback extraction if Gemini fails
      const fallbackResult = {
        title: req.body?.pastedText ? req.body.pastedText.split("\n")[0].substring(0, 50) : "New Task",
        date: new Date().toISOString().split("T")[0],
        time: "",
        duration: "30 min",
        location: "",
        attendees: "",
        phone: "",
        notes: req.body?.pastedText || "",
        priority: "none",
        category: "Errand",
        collaborator: "",
        isLocked: false,
        isAllDay: false,
        aiSummary: "Extracted locally (Gemini API offline / quota limit)."
      };
      res.json({ success: true, data: fallbackResult, warning: "Gemini quota limited. Extracted locally." });
    }
  });

  // API Route to Resolve Google Maps Directions/URLs and extract business name & address
  app.post("/api/resolve-maps", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "No URL provided" });
      }

      // Check if it starts with http
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return res.json({ success: false, reason: "Not a URL" });
      }

      // 1. Follow HTTP redirects to find the canonical long Google Maps URL
      let resolvedUrl = url;
      try {
        const fetchRes = await fetch(url, { method: "HEAD", redirect: "follow" });
        resolvedUrl = fetchRes.url || url;
      } catch (redirectErr) {
        console.warn("Failed to follow redirect on maps URL:", redirectErr);
      }

      // 2. Decode & Extract using Gemini API (or simple regex fallback if key is missing)
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Simple client/server regex-based fallback solver
        let decoded = decodeURIComponent(resolvedUrl);
        let extractedNameAndAddress = "";
        
        const placeMatch = decoded.match(/\/maps\/place\/([^/@?]+)/);
        const searchMatch = decoded.match(/\/maps\/search\/([^/@?]+)/);
        const dirMatch = decoded.match(/\/dir\/[^/]+\/([^/@?]+)/);
        
        const matchedSegment = placeMatch?.[1] || searchMatch?.[1] || dirMatch?.[1];
        if (matchedSegment) {
          extractedNameAndAddress = matchedSegment.replace(/\+/g, " ");
        }
        
        if (extractedNameAndAddress) {
          return res.json({
            success: true,
            name: extractedNameAndAddress.split(",")[0]?.trim() || "",
            address: extractedNameAndAddress.split(",").slice(1).join(",")?.trim() || "",
            resolvedLocation: extractedNameAndAddress,
            source: "regex-fallback"
          });
        }
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const promptText = `You are an expert Google Maps URL parser.
A user has provided the following URL which is either a Google Maps place, query, search, coordinates, or directions link:
"${resolvedUrl}"

Your objective is to extract:
1. The exact name of the business or category of the place (e.g., "Starbucks", "Blue Bottle Coffee", "Sunnyvale Public Library", "Central Park"). No generic strings if not present.
2. The exact formatted geographic/postal address (e.g., "120 El Camino Real, Sunnyvale, CA 94087", "111 O'Farrell St, San Francisco, CA").

Notes:
- If you find both name and address, populate both.
- If the URL only contains a generic coordinate (e.g. 37.421, -122.08) or address, keep Name empty or formulate a concise description.
- Decode any URL-encoded parts or entity representations.
- Extract details purely from the pathname or query parameters in the URL.

Provide your output as a valid parseable JSON object matching this schema:
{
  "name": "extracted business/place name, or empty string",
  "address": "extracted address, or empty string"
}
Do not include any explanation, markdown formatting blocks (like \`\`\`json), or trailing text. Return ONLY the raw JSON string.`;

      const geminiRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING }
            },
            required: ["name", "address"]
          }
        }
      });

      const textOutput = geminiRes.text?.trim() || "{}";
      let parsed;
      try {
        parsed = JSON.parse(textOutput);
      } catch (parseErr) {
        console.error("Resolve maps JSON parse error:", parseErr);
        parsed = { name: "", address: "" };
      }
      
      const name = parsed.name?.trim() || "";
      const address = parsed.address?.trim() || "";
      
      let resolvedLocation = "";
      if (name && address) {
        if (address.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(address.toLowerCase())) {
          resolvedLocation = address;
        } else {
          resolvedLocation = `${name}, ${address}`;
        }
      } else {
        resolvedLocation = name || address || "";
      }

      if (resolvedLocation) {
        return res.json({
          success: true,
          name,
          address,
          resolvedLocation,
          source: "gemini"
        });
      } else {
        return res.json({
          success: false,
          reason: "Could not extract specific place details from URL"
        });
      }
    } catch (err: any) {
      console.error("Resolve Maps error:", err);
      res.json({ success: false, error: err.message || "Failed to resolve Maps URL" });
    }
  });

  // API Route to parse voice actions for making schedule updates dynamically
  app.post("/api/voice-command", async (req, res) => {
    try {
      const { voiceCommand, currentTask, collaborators, existingLocations } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `You are an AI Scheduling Voice Assistant for the "Taskpass" application.
The user is viewing the following specific task:
${JSON.stringify(currentTask)}

Known locations: ${JSON.stringify(existingLocations || [])}
Known collaborators: ${JSON.stringify(collaborators || [])}

The user has dictated or specified this voice command to update values on this task card:
"${voiceCommand}"

Analyze the user's intent to correctly update the task card representation. You must determine if they want to modify fields like:
- title (e.g. "change title to buy milk")
- time / starting time (e.g. "move it to 4 PM", "start at 2:30", "set time to half past nine", "set start time to 3 o'clock")
- duration (e.g. "make it one hour", "extend by thirty minutes", "duration fifteen mins", "change duration to 45 minutes")
- location (e.g. "set location to Whole Foods", "this is at the Central Gym")
- priority (e.g. "change priority to high", "make it urgent", "set key priority none")
- collaborator / companion (e.g. "collaborate with Richard", "add Alex as a companion", "remove collaborator")
- notes (e.g. "add a note to bring keys")

Rules:
1. ONLY update the properties that the user has explicitly or implicitly requested to change or set. For properties not requested, DO NOT modify them, instead return their exact current values from the input task.
2. For priority, standard values are: "none", "low", "medium", "high".
3. For duration, standard formats are like: "5 min", "10 min", "15 min", "20 min", "30 min", "45 min", "1 hour", "90 min", "2 hours", "3 hours", "4 hours". If they specify a custom duration, return its estimated minutes representation (e.g. "60 min" or "40 min").
4. For time, convert any specified time to 24-hour style "HH:MM" (e.g. "14:30" or "09:00").
5. Return ONLY a valid, parseable JSON object matching this schema:
{
  "title": "string",
  "time": "string (HH:MM style)",
  "duration": "string",
  "location": "string",
  "priority": "none|low|medium|high",
  "collaborator": "string",
  "notes": "string"
}
Do not include any explanation or backticks. Return ONLY raw JSON text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              time: { type: Type.STRING },
              duration: { type: Type.STRING },
              location: { type: Type.STRING },
              priority: { type: Type.STRING },
              collaborator: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ["title", "time", "duration", "location", "priority", "collaborator", "notes"]
          }
        }
      });

      let parsedResult;
      try {
        parsedResult = JSON.parse(response.text?.trim() || "{}");
      } catch (parseErr) {
        console.error("Voice command JSON parse error:", parseErr);
        parsedResult = {
          title: currentTask?.title || "Voice Command Action",
          time: currentTask?.time || "12:00",
          duration: currentTask?.duration || "30 min",
          location: currentTask?.location || "",
          priority: currentTask?.priority || "none",
          collaborator: currentTask?.collaborator || "",
          notes: (currentTask?.notes || "") + "\n(Voice command did not parse successfully)"
        };
      }
      res.json({ success: true, data: parsedResult });
    } catch (err: any) {
      console.error("Voice Command parsing error:", err);
      res.json({ 
        success: true, 
        data: {
          title: req.body?.currentTask?.title || "Voice Action",
          time: req.body?.currentTask?.time || "12:00",
          duration: req.body?.currentTask?.duration || "30 min",
          location: req.body?.currentTask?.location || "",
          priority: req.body?.currentTask?.priority || "none",
          collaborator: req.body?.currentTask?.collaborator || "",
          notes: (req.body?.currentTask?.notes || "") + "\n(Voice action offline: Gemini API quota reached)"
        },
        warning: "Gemini voice parser offline."
      });
    }
  });

  // API Route to fetch real weather conditions for a custom location using Google Search Grounding with Gemini 3.5-flash
  app.post("/api/weather", async (req, res) => {
    try {
      const { location } = req.body;
      if (!location || location.trim() === "") {
        return res.json({ success: true, climate: "Clear skies", temp: "72", description: "Default sunny settings", wind: "5 mph", humidity: "40%" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ success: true, climate: "Sunny", temp: "72", description: "Default sunny (API KEY missing)", wind: "4 mph", humidity: "50%" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const promptText = `Find the current weather conditions (temperature in Fahrenheit, climate state like Sunny/Rainy/Cloudy/Showers/Windy, short descriptive summary, wind speed, and humidity percentage) for this location: "${location}".
Use the googleSearch tool to fetch the live, actual, current weather details for "${location}" today.
Format your response as a valid JSON object with these exact keys:
{
  "temp": "number or string (e.g. 74)",
  "climate": "Sunny|Cloudy|Rainy|Snowy|Windy|Stormy (pick the best matching keyword)",
  "description": "Short summary of current conditions (e.g., Mostly cloudy with light breeze)",
  "wind": "String for wind speed (e.g. 12 mph)",
  "humidity": "String for humidity percentage (e.g. 65%)"
}
Return only the raw JSON. No explanation, markdown, or code block backticks.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              temp: { type: Type.STRING },
              climate: { type: Type.STRING },
              description: { type: Type.STRING },
              wind: { type: Type.STRING },
              humidity: { type: Type.STRING }
            },
            required: ["temp", "climate", "description", "wind", "humidity"]
          }
        }
      });

      let data;
      try {
        data = JSON.parse(response.text?.trim() || "{}");
      } catch (parseErr) {
        console.error("Weather JSON parse error:", parseErr);
        data = {
          temp: "72",
          climate: "Sunny",
          description: "Clear skies (fallback)",
          wind: "5 mph",
          humidity: "40%"
        };
      }
      res.json({ success: true, ...data });
    } catch (err: any) {
      console.error("API weather error:", err);
      res.json({ success: false, error: err.message || "Failed to retrieve local weather conditions" });
    }
  });

  // API Route to Write AI Contextual Emails Regarding a Task referencing descriptions and collaborator notes
  app.post("/api/generate-task-email", async (req, res) => {
    try {
      const { taskTitle, taskDescription, collaborator, collaboratorNotes, tone } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const promptText = `You are a high-level corporate and personal assistant.
Write a well-crafted draft email regarding the following task that needs to be communicated:
- Task Title: "${taskTitle || "Untitled Task"}"
- Task Details / Description: "${taskDescription || "No description provided."}"
- Destination Beneficiary / Collaborator: "${collaborator || "Team members"}"
- Specifically Recorded Notes involving this collaborator:
"${collaboratorNotes || "No specific collaborator annotations."}"

Desired Email Tone: "${tone || "Professional and polite"}"

Guidelines:
1. Synthesize the core tasks, details, and collaborator notes.
2. Maintain a highly helpful, realistic, clear, and actionable flow.
3. Keep the email outline structured (Subject and Body clearly labelled).
4. Do not include mock variables (like "[Your Name]" - instead use general polite endings, or check if collaborator name was specified). Make it easy to copy and paste.

Return the email text as a natural string. Do not return JSON. Just return the structured email directly.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
      });

      res.json({ success: true, email: response.text });
    } catch (err: any) {
      console.error("Generate email error:", err);
      const title = req.body?.taskTitle || "Task Update";
      const desc = req.body?.taskDescription ? `\nDetails: ${req.body.taskDescription}` : "";
      const collab = req.body?.collaborator || "Team";
      const notes = req.body?.collaboratorNotes ? `\nNotes: ${req.body.collaboratorNotes}` : "";
      const draft = `Subject: Update regarding ${title}\n\nHi ${collab},\n\nI am writing to share an update regarding "${title}".${desc}${notes}\n\nPlease let me know if you have any questions.\n\nBest regards,`;
      res.json({ success: true, email: draft, warning: "Gemini offline - generated offline draft." });
    }
  });

  // API Route to search the web for solutions to solve a specific task using Google Search Grounding with Gemini 3.5-flash
  app.post("/api/search-solutions", async (req, res) => {
    try {
      const { taskTitle, taskDescription, customQuery } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const queryTerm = customQuery ? customQuery : `${taskTitle} ${taskDescription || ""}`;

      const promptText = `Search the live web for practical solutions, step-by-step instructions, recommended software/tools, offline blueprints, or answers to achieve the following goal/task:
"${queryTerm}"

Guidelines:
1. Perform web search grounding using the googleSearch tool to locate real, active, recent articles, StackOverflow answers, guides, or products.
2. Provide a synthesized guide with actual steps, recommendations, and URLs/citations to solve this task.
3. Keep the layout cleanly formatted in easy-to-read markdown.
4. If there are code snippets or command-line steps, format them in standard backticks.

Return the result as a markdown-formatted response detailing specific solutions and active web citations.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      res.json({ success: true, markdown: response.text, query: queryTerm });
    } catch (err: any) {
      console.error("Search solutions error:", err);
      const queryTerm = req.body?.customQuery || req.body?.taskTitle || "Task";
      const fallbackMarkdown = `### 🛠️ Action Checklist for "${queryTerm}"\n\n*Note: AI web search is currently offline due to quota limit (429).* \n\n1. **Define Core Goals**: Clarify the primary requirements for this task.\n2. **Gather Materials**: Prepare relevant documents, notes, or software tools.\n3. **Execute Steps**: Work through subtasks in sequential order.\n4. **Verify Outcome**: Confirm all deliverables are complete.`;
      res.json({ success: true, markdown: fallbackMarkdown, query: queryTerm });
    }
  });

  // API Route to synthesize workspace intelligence for a specific task
  app.post("/api/synthesize-solutions", async (req, res) => {
    try {
      const { 
        taskTitle, 
        taskDescription, 
        collaborator, 
        otherCollaboratorTasks, 
        relatedTasksNotes,
        subtasks
      } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const promptText = `You are an elite productivity executive assistant for "Taskpass Studio".
Your goal is to synthesize an executive-level "Summary of Information" and action plan for the following task:
- Task Title: "${taskTitle || "Untitled Task"}"
- Description/Notes: "${taskDescription || "No description provided."}"
- Subtasks Checklist: ${JSON.stringify(subtasks || [])}

WORKSPACE INTELLIGENCE CONTEXT:
- Main Collaborator: "${collaborator || "None assigned"}"
- Biography of Collaborator: (Please look up biography/professional details of this person if they are a known public/business figure, or describe a highly professional profile if they are an implied contact).
- Other Tasks Collaborating with "${collaborator || "None"}": ${JSON.stringify(otherCollaboratorTasks || [])}
- Related Tasks Notes/Context in Workspace: ${JSON.stringify(relatedTasksNotes || [])}

YOUR TASK:
Generate a synthesized executive summary, divided into the following sections:

1. 👥 COLLABORATOR BRIEFING & ASSOCIATED WORK
   - A biography or professional profile of the collaborator (${collaborator}). If no collaborator is assigned, state "No collaborator assigned for this task" and suggest how bringing in a team member might help.
   - List the title of any other tasks that are currently being collaborated with this person, summarizing how they align with this task.

2. 📁 WORKSPACE CONTEXT & GOOGLE DRIVE FILES
   - Scan the notes, description, and related tasks above for any Google Drive file references (links containing "drive.google.com", "docs.google.com", "sheets.google.com", "slides.google.com") or file names.
   - List these files, explaining how they relate to the current task.
   - If no Google Drive files are directly linked, suggest 3-4 specific Google Drive templates or files (e.g. Google Docs project charter, Google Sheets tracker, Google Slides pitch deck) that the user should create in their Google Drive to complete this task successfully.
   - Summarize any relevant context, plans, or learnings extracted from the related tasks' notes in the workspace.

3. 🛠️ SOLUTION STRATEGY, RISKS, & ACTIONS
   - Possible practical solutions to complete this task.
   - Identify potential risks, blockers, or dependencies and provide mitigation strategies.
   - Step-by-step instructions on completing the task, formatted as an actionable checklist.

FORMATTING REQUIREMENTS:
- Use clean, polished markdown with elegant headings, lists, bold keywords, and code blocks for technical items.
- Maintain an authoritative, concise, yet encouraging and professional tone.
- Do not include any HTML tags; rely solely on pure markdown.
- Return the response as a markdown-formatted string.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      res.json({ success: true, markdown: response.text });
    } catch (err: any) {
      console.error("Synthesize solutions error:", err);
      const title = req.body?.taskTitle || "Task";
      const collab = req.body?.collaborator || "None";
      const fallbackMarkdown = `### 👥 1. COLLABORATOR BRIEFING\n**Assigned Collaborator**: ${collab}\n\n### 📁 2. WORKSPACE CONTEXT\n**Task**: ${title}\n**Status**: Gemini AI service is currently offline or quota limited (429 RESOURCE_EXHAUSTED).\n\n### 🛠️ 3. RECOMMENDED ACTIONS\n1. Review task requirements and notes.\n2. Assign subtasks or deadlines.\n3. Track progress using the interactive task buttons.`;
      res.json({ success: true, markdown: fallbackMarkdown });
    }
  });

  // API Route for Gemini Calendar Chatbot
  app.post("/api/calendar-chat", async (req, res) => {
    try {
      const { messages, tasks, notes, collaborators, currentDate, currentTime } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // We format the current date and time context
      const todayStr = currentDate || new Date().toISOString().split("T")[0];
      const timeStr = currentTime || "10:00";

      // System instruction explaining the chatbot's persona, context, capabilities, and the required JSON schema output.
      const systemInstruction = `You are "Scheduler Gemini", a highly powerful, intelligent calendar and productivity assistant for the "Taskpass" application.
You have complete visibility over the user's active schedules, tasks, collaboration notes, and system events.

Current Context:
- Current Local Date: "${todayStr}"
- Current Local Time: "${timeStr}"
- User's Current Tasks List: ${JSON.stringify(tasks || [])}
- User's Current Collaboration Notes: ${JSON.stringify(notes || [])}
- Registered Collaborators: ${JSON.stringify(collaborators || [])}

When making ANY kind of schedule, workspace, or productivity analysis:
- You MUST examine all collaboration notes, all collaborator relationships, and all tasks in the context to provide a holistic analysis.
- Provide the analysis results immediately and be extremely concise. Limit your response to 2-3 lines of highly actionable summary.
- NEVER include long meta-explanations or instructions of what AI can or should do.
- NEVER append the unrequested question "Would you like more detail, or a step-by-step solution..." or similar long explanations.

Your Capabilities:
1. ANSWER QUESTIONS: Answer any questions about the user's tasks, schedule density, open gaps, routines, or general calendar status.
2. RUN ANALYSIS: Evaluate and analyze the user's task categories, priority distribution, time spent on projects, potential conflicts (overlapping times), and schedule balance, then offer smart advice.
3. MAKE CHANGES: If the user requests to schedule, modify, delete, or mark a task as completed/incomplete, you can directly execute these updates by adding items to the "actions" array of your response.

Required Output Schema:
Your entire response MUST be a single, valid, parseable JSON object matching the following structure. Do not return any Markdown backticks, trailing text, or preamble outside of the JSON:
{
  "text": "Your helpful conversational response explaining your answer, analysis, or the changes you made. Be friendly, clean, and extremely concise with results.",
  "actions": [
    {
      "type": "ADD_TASK",
      "task": {
        "title": "Task title",
        "date": "YYYY-MM-DD",
        "time": "HH:MM (24-hour style)",
        "duration": "Duration description (e.g. '1 hour', '30 min')",
        "priority": "none|low|medium|high",
        "location": "Optional location string",
        "category": "Optional category",
        "notes": "Optional notes",
        "collaborator": "Optional collaborator name",
        "isLocked": false,
        "completed": false,
        "isAllDay": false
      }
    },
    {
      "type": "UPDATE_TASK",
      "id": "Target Task ID",
      "updates": {
        "title": "Updated title (optional)",
        "date": "YYYY-MM-DD (optional)",
        "time": "HH:MM (optional)",
        "duration": "Duration description (optional)",
        "priority": "none|low|medium|high (optional)",
        "location": "Optional updated location",
        "category": "Optional updated category",
        "notes": "Optional updated notes",
        "collaborator": "Optional updated collaborator",
        "isLocked": false,
        "completed": false,
        "isAllDay": false
      }
    },
    {
      "type": "DELETE_TASK",
      "id": "Target Task ID"
    },
    {
      "type": "COMPLETE_TASK",
      "id": "Target Task ID",
      "completed": true
    }
  ]
}

Guidelines for Actions:
- ONLY populate the "actions" array when the user explicitly or implicitly requests a state change (add, edit, delete, complete). For pure Q&A or analysis queries, leave "actions" as an empty array: "actions": [].
- Always verify if a task exists before trying to UPDATE, COMPLETE, or DELETE it by referencing its "id" from the User's Current Tasks list.
- Use relative date references (e.g., "tomorrow", "this Friday", "next week") by calculating the target date relative to the Current Local Date: "${todayStr}".
- Ensure durations match standard terms (e.g. "30 min", "1 hour", "90 min", "2 hours"). Ensure time matches "HH:MM" 24-hour style.
- Be precise and ensure all JSON keys and values are properly formatted. Ensure there are no trailing commas or invalid characters in the JSON output.`;

      // We map the message history into parts or content for generateContent
      // The messages look like { role: "user" | "model", text: string }
      const contents = messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text?.trim() || "{}";
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Calendar Chatbot JSON parse error:", parseErr);
        parsed = {
          text: responseText || "I encountered an issue analyzing your request. Please try rephrasing or asking again.",
          actions: []
        };
      }
      res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error("Calendar Chatbot Error:", err);
      res.json({
        success: true,
        data: {
          text: "⚠️ Gemini AI service quota limit reached (429 RESOURCE_EXHAUSTED). Your prepayment credits are depleted. Please check billing in AI Studio or try again later. You can still manage your schedule using the interactive buttons.",
          actions: []
        }
      });
    }
  });

  // Serve static files / Vite HMR depending on environment
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
