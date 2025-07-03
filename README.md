# ACME Customs - Custom Miata Shop

A modern voice AI application that demonstrates real-time vehicle consultation using Groq for data extraction and Vapi for voice interactions. Built as a complete, end-to-end template for creating AI-powered voice experiences in specialized domains.


[Acme Customs](./acme-sreenshot.png)


## Overview

[Vapi](https://vapi.ai) is the developer platform for building voice AI agents. We handle the complex infrastructure so you can focus on creating great voice experiences.

Voice agents allow you to:

- Have natural conversations with users
- Make and receive phone calls
- Integrate with your existing systems and APIs
- Handle complex workflows like appointment scheduling, customer support, and more

This application demonstrates how to combine Vapi's voice AI capabilities with Groq's fast data extraction to create an intelligent vehicle consultation system. The app captures spoken requirements for custom Miata builds and automatically extracts structured specifications in real-time.

**Key Features:**
- AI-powered voice consultations for custom vehicle builds
- Real-time transcription and conversation tracking
- Automatic extraction of vehicle specifications from natural speech
- Modern cyberpunk-inspired UI with responsive design
- Structured JSON output for downstream processing
- Sub-second response times, efficient concurrent request handling, and production-grade performance powered by Groq

## Architecture

**Tech Stack:**
- **Frontend:** Alpine.js for reactive UI components
- **Backend:** Node.js with Hono framework
- **Voice AI:** Vapi for real-time voice interactions
- **Data Extraction:** Groq API for structured data processing
- **Styling:** Custom CSS with modern design system

## Quick Start

### Prerequisites
- Node.js 18 or higher
- Groq API key ([Create a free GroqCloud account and generate an API key here](https://console.groq.com/keys))
- Vapi account and API key ([Sign up at Vapi.ai](https://vapi.ai))

### Setup

1. **Clone the repository**
   ```bash
   gh repo clone janzheng/groq-vapi-acme-customs
   cd groq-vapi-acme-customs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Or start the production server:
   ```bash
   npm start
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

## Usage

1. Click "Initiate Consultation" to start a voice conversation
2. Speak naturally about your Miata customization needs
3. Watch as the system provides real-time transcription
4. View automatically extracted vehicle specifications in structured JSON format
5. See how conversation data is processed and organized for downstream use

## API Endpoints

- `GET /` - Main application interface
- `POST /extract-data` - Extract structured data from conversation transcripts

## Customization
This template is designed to be a foundation for you to get started with. Key areas for customization:
- **Voice Configuration:** Update Vapi voice settings and conversation flow in the frontend
- **Data Extraction:** Modify Groq prompts and extraction logic in `server.js`
- **UI/Styling:** Customize the cyberpunk theme and components in `public/index.html`
- **Domain Adaptation:** Replace vehicle consultation logic with your specific use case

## Environment Variables

- `GROQ_API_KEY` - Your Groq API key for data extraction
- `PORT` - Port to run the server on (default: 3000)

## Development

The application structure:
- `server.js` - Main server file with Hono routes and Groq integration
- `public/index.html` - Frontend HTML with embedded Alpine.js and Vapi integration
- Rate limiting for API endpoints
- Real-time voice processing and transcription

## Next Steps
### For Developers
- **Create your free GroqCloud account:** Access official API docs, the playground for experimentation, and more resources via [Groq Console](https://console.groq.com).
- **Get started with Vapi:** Explore voice AI capabilities and documentation at [Vapi.ai](https://vapi.ai).
- **Build and customize:** Fork this repo and start customizing to build out your own voice AI application.
- **Get support:** Connect with other developers building on Groq, chat with our team, and submit feature requests on our [Groq Developer Forum](community.groq.com).

### For Founders and Business Leaders
- **See enterprise capabilities:** This template showcases production-ready voice AI that can handle real-time business conversations with automatic data extraction.
- **Discuss Your needs:** [Contact our team](https://groq.com/enterprise-access/) to explore how Groq can accelerate your AI initiatives.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Credits
Created by Jan Zheng with Groq API and Vapi integration for production-ready voice AI applications. 