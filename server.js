const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configure for Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Pre-configure the Gemini model for better performance
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0,
    }
});

// Career guidance system prompt - Optimized for concise responses
const SYSTEM_PROMPT = `You are a career guidance assistant. Provide ONLY precise, bullet-point responses.

STRICT RULES:
1. ALWAYS respond in bullet points (• format)
2. MAXIMUM 100 words per response
3. Be extremely concise - no fluff or filler words
4. Focus only on essential information
5. Use clear, direct language
6. Skip introductions and conclusions
7. Prioritize actionable information
8. For career guides: Use • Job • Education • Skills • Salary • Certifications • Next steps
9. For exams: Use • Exam names • Eligibility • Pattern • Preparation • Benefits
10. NEVER write paragraphs - only bullet points

Response format examples:
• Job: Brief description (1 sentence)
• Education: Main requirements
• Skills: Top 3-5 essential skills
• Salary: Approximate range
• Certifications: Key ones only
• Next steps: 2-3 immediate actions

Enforce word limits strictly. Be direct and to the point.`;

// API endpoint for career guidance chat (streaming)
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Build the prompt with system message and conversation history
        let fullPrompt = SYSTEM_PROMPT + '\n\n';
        
        // Add conversation history (limit to last 5 messages for better performance)
        const recentHistory = history.slice(-5);
        recentHistory.forEach(msg => {
            fullPrompt += `${msg.role}: ${msg.content}\n`;
        });
        
        fullPrompt += `user: ${message}\n`;
        fullPrompt += 'assistant: ';

        // Call Gemini API with streaming
        const result = await model.generateContentStream(fullPrompt);
        
        // Set headers for streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

        // Stream the response
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunkText })}\n\n`);
            }
        }

        // Send completion event
        res.write(`data: ${JSON.stringify({ type: 'complete', content: '' })}\n\n`);
        res.end();
        
    } catch (error) {
        console.error('Gemini API Error:', error);
        
        // Send error event for streaming
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

// Special endpoint for career guide generation
app.post('/api/generate-guide', async (req, res) => {
    try {
        const { career } = req.body;
        
        if (!career) {
            return res.status(400).json({ error: 'Career field is required' });
        }

        const guidePrompt = `Create a concise career guide for ${career}. Provide only bullet points:
        • Job description: 1-2 sentences
        • Education: main qualifications needed
        • Skills: top 3-5 essential skills
        • Career path: key progression steps
        • Salary: approximate range
        • Certifications: most important ones
        • Getting started: 2-3 immediate actions
        
        Format strictly as bullet points. Maximum 100 words. Be precise and to the point.`;

        // Prepare prompt for Gemini
        const fullPrompt = SYSTEM_PROMPT + '\n\n' + guidePrompt;

        // Call Gemini API
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const guide = response.text();

        res.json({ guide });
        
    } catch (error) {
        console.error('Career guide generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate career guide', 
            message: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Career Guidance Chatbot API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Something went wrong' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Career Guidance Chatbot server running on port ${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🌐 Open http://localhost:${PORT} to access the application`);
    
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  WARNING: Gemini API key not configured');
        console.warn('   Please check your .env file and ensure GEMINI_API_KEY is set correctly');
    } else {
        console.log('✅ Gemini API key is configured');
    }
});

module.exports = app;