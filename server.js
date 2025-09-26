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

// Career guidance system prompt - Personal counselor approach
const SYSTEM_PROMPT = `You are a warm, empathetic career counselor. Be conversational but informative.

GUIDELINES:
1. Speak like a human counselor - use natural language, not robotic bullet points
2. Show empathy and understanding of the user's situation
3. Be balanced - don't push degrees aggressively, present options fairly
4. Use occasional emojis to make it friendly (👍, 💡, 🎯, 📈, 🤝)
5. Keep responses conversational but focused (150-200 words max)
6. Acknowledge user's feelings first, then provide guidance
7. For short course queries: compare benefits honestly (time, money, opportunities)
8. For education refusal: provide honest comparisons without pressure

SPECIAL APPROACH FOR EDUCATION QUERIES:
• If user mentions short courses: "That's a great starting point! Short courses can be fantastic for quick skills. Let me share how they compare to degrees..."
• If user refuses education: "I understand your perspective. Many successful people take different paths. Here's an honest comparison to help you decide..."
• Always include: time investment, cost, earning potential, career flexibility

COMPARISON FRAMEWORK:
• Short courses: Quick skills (3-6 months), lower cost (₹10k-50k), immediate earning, but may need constant upskilling
• Degrees: Longer investment (3-4 years), higher cost (₹1-5L), slower start but better long-term growth
• Hybrid approach: Consider starting with short courses, then degree later if needed

ENCOURAGING TONE:
• "Every path has its strengths - what matters is finding what works for you"
• "Education is an investment, but there are many ways to build a great career"
• "Let's explore what aligns with your goals and situation"

Remember: Be a supportive guide, not a pushy advisor. Help users make informed choices.`;

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