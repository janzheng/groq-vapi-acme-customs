import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import Groq from 'groq-sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Add a simple in-memory rate limiter (per IP)
const extractDataRateLimit = new Map();

// Define the VAPI browser code as a string that will be injected
const vapiCode = `
// Create a simple EventEmitter implementation
class EventEmitter {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this;
  }
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener.apply(this, args);
      this.removeListener(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }
  emit(event, ...args) {
    if (!this.events[event]) return false;
    this.events[event].forEach(listener => listener.apply(this, args));
    return true;
  }
  removeListener(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }
  removeAllListeners(event) {
    if (event) delete this.events[event];
    else this.events = {};
    return this;
  }
}

// VapiEventEmitter extends our custom EventEmitter
class VapiEventEmitter extends EventEmitter {
  constructor() {
    super();
  }
}

// Main Vapi class
class Vapi extends VapiEventEmitter {
  constructor(apiKey, baseUrl = "https://api.vapi.ai", callConfig = {}, callObject = {}) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.started = false;
    this.call = null;
    this.speakingTimeout = null;
    this.hasEmittedCallEndedStatus = false;
  }

  async createWebCall(params) {
    const response = await fetch(\`\${this.baseUrl}/call/web\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    return await response.json();
  }

  cleanup() {
    this.started = false;
    this.hasEmittedCallEndedStatus = false;
    if (this.call) {
      this.call.destroy();
      this.call = null;
    }
    this.speakingTimeout = null;
  }

  isMobileDevice() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return /android|iphone|ipad|ipod|iemobile|blackberry|bada/i.test(ua.toLowerCase());
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async start(assistantId, assistantOverrides) {
    if (!assistantId) throw new Error("Assistant ID must be provided.");
    if (this.started) return null;
    this.started = true;

    try {
      // 1. Get the room URL from VAPI API
      const callData = await this.createWebCall({
        assistantId: assistantId,
        assistantOverrides: assistantOverrides
      });
      
      console.log('VAPI_DEBUG: Call data:', callData);
      console.log('VAPI_DEBUG: webCallUrl:', callData.webCallUrl);
      
      if (this.call) this.cleanup();
      
      // 2. Completely isolate the Daily call creation and joining
      // Instead of trying to pass things through our class,
      // create a completely fresh approach that mimics our minimal test
      
      // Create a function that will be run in the global context
      const joinVapiRoom = (url) => {
        return new Promise((resolve, reject) => {
          try {
            // Create a fresh call object
            const freshCall = window.DailyIframe.createCallObject({
              audioSource: true,
              videoSource: false
            });
            
            // Set up basic event handlers directly
            freshCall.on('left-meeting', () => {
              console.log('ISOLATED: Call ended');
              // Clean up after the call ends
              freshCall.destroy();
              resolve(null);
            });
            
            freshCall.on('error', (error) => {
              console.error('ISOLATED: Call error', error);
              reject(error);
            });
            
            // Join with minimal options
            freshCall.join({ url: url })
              .then(() => {
                console.log('ISOLATED: Join successful');
                resolve(freshCall);
              })
              .catch((error) => {
                console.error('ISOLATED: Join failed', error);
                reject(error);
              });
          } catch (error) {
            console.error('ISOLATED: Setup failed', error);
            reject(error);
          }
        });
      };
      
      // Run the isolated function and get back the call object
      try {
        this.call = await joinVapiRoom(callData.webCallUrl);
        
        // If we get here, the join was successful
        if (this.call) {
          // Now set up our more complex event handlers
          this.setupCallEventHandlers(false, false);
        }
        
        return callData;
      } catch (error) {
        console.error('VAPI_DEBUG: Isolated join failed', error);
        this.emit('error', error);
        this.cleanup();
        return null;
      }
    } catch (error) {
      console.error('Error starting call:', error);
      this.emit('error', error);
      this.cleanup();
      return null;
    }
  }

  setupCallEventHandlers(videoEnabled, isTavusVoice) {
    if (!this.call) return;

    this.call.on('left-meeting', () => {
      this.emit('call-end');
      if (!this.hasEmittedCallEndedStatus) {
        this.emit('message', {
          type: 'status-update',
          status: 'ended',
          endedReason: 'customer-ended-call'
        });
        this.hasEmittedCallEndedStatus = true;
      }
      this.cleanup();
    });

    this.call.on('error', (error) => {
      this.emit('error', error);
    });

    this.call.on('camera-error', (error) => {
      this.emit('error', error);
    });

    this.call.on('track-started', async (event) => {
      if (!event || !event.participant) return;
      
      if (!event.participant.local && event.participant.user_name === 'Vapi Speaker') {
        if (event.track.kind === 'video') {
          this.emit('video', event.track);
        }
        if (event.track.kind === 'audio') {
          const audio = document.createElement('audio');
          audio.dataset.participantId = event.participant.session_id;
          document.body.appendChild(audio);
          audio.muted = false;
          audio.autoplay = true;
          audio.srcObject = new MediaStream([event.track]);
          await audio.play();
        }
        this.call?.sendAppMessage('playable');
      }
    });

    this.call.on('app-message', (event) => {
      if (!event) return;
      
      try {
        if (event.data === 'listening') {
          this.emit('call-start');
          return;
        }

        try {
          const message = JSON.parse(event.data);
          this.emit('message', message);
          
          if (message && 
              'type' in message && 
              'status' in message && 
              message.type === 'status-update' && 
              message.status === 'ended') {
            this.hasEmittedCallEndedStatus = true;
          }
        } catch (e) {
          console.log('Error parsing message data:', e);
        }
      } catch (error) {
        console.error(error);
      }
    });
  }

  stop() {
    this.started = false;
    if (this.call) {
      this.call.destroy();
      this.call = null;
    }
  }

  send(message) {
    if (this.call) {
      this.call.sendAppMessage(JSON.stringify(message));
    }
  }

  setMuted(muted) {
    if (!this.call) throw new Error("Call object is not available.");
    this.call.setLocalAudio(!muted);
  }

  isMuted() {
    return this.call ? !this.call.localAudio() : true;
  }
}

// Make Vapi available globally
window.Vapi = Vapi;
`;

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }));

// Main route - serve the HTML file with VAPI code injected
app.get("/", (c) => {
  const htmlContent = readFileSync(join(__dirname, 'public', 'index.html'), 'utf-8');
  const htmlWithVapi = htmlContent.replace('{{VAPI_CODE}}', vapiCode);
  return c.html(htmlWithVapi);
});

app.post("/extract-data", async (c) => {
  // Get client IP 
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const now = Date.now();
  const last = extractDataRateLimit.get(ip) || 0;
  if (now - last < 4000) {
    return c.json({ error: "Rate limit exceeded. Please wait 4 seconds between requests." }, 429);
  }
  extractDataRateLimit.set(ip, now);

  // Accept both transcript and extractedDataSoFar from the client
  const { transcript, extractedDataSoFar } = await c.req.json();

  // Prompt Groq to extract structured vehicle specs as a JSON object, grounded in the full log and data so far
  const prompt = `
You are an expert data extraction assistant. Given the following full communication log and the extracted data so far, extract all structured facts, specifications, or key information mentioned as a JSON object.

- Each key should be a generic property (e.g. "model", "engine", "year", "color", "issue", "location", etc.), and the value should be the extracted value.
- Only include actual facts or structured data, not conversational text.
- If you see a typo or misspelling, correct it to the most likely intended value.
- Standardize names and values to their correct forms if possible.
- Use the extracted data so far as context, but update or add new data if the log contains new or corrected information.

COMMUNICATION LOG:
${transcript}

EXTRACTED DATA SO FAR:
${JSON.stringify(extractedDataSoFar || {}, null, 2)}

Respond ONLY with a JSON object, e.g.:
{
  "model": "RX-7",
  "engine": "13B-REW"
}
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }
  });

  // Try to parse the JSON from the LLM response
  let specs = {};
  try {
    console.log('LLM response:', chatCompletion.choices[0]?.message?.content);
    const content = chatCompletion.choices[0]?.message?.content || "{}";
    specs = JSON.parse(content);
    if (specs && typeof specs === "object" && specs.specs && typeof specs.specs === "object") {
      specs = specs.specs;
    }
  } catch (e) {
    specs = {};
  }
  return c.json({ specs });
});

const port = process.env.PORT || 3000;

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port: parseInt(port),
}); 