class CareerGuidanceChatbot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.clearChatButton = document.getElementById('clearChat');
        this.careerInput = document.getElementById('careerInput');
        this.generateGuideButton = document.getElementById('generateGuide');
        this.examCareerInput = document.getElementById('examCareerInput');
        this.getExamRecommendationsButton = document.getElementById('getExamRecommendations');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.initializeEventListeners();
        this.conversationHistory = [];
    }

    initializeEventListeners() {
        // Send message on button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key (but allow Shift+Enter for new line)
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Clear chat history
        this.clearChatButton.addEventListener('click', () => this.clearChat());

        // Generate career guide
        this.generateGuideButton.addEventListener('click', () => this.generateCareerGuide());

        // Get exam recommendations
        this.getExamRecommendationsButton.addEventListener('click', () => {
            const career = this.examCareerInput.value.trim();
            this.getExamRecommendations(career);
        });

        // Quick suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const prompt = e.target.getAttribute('data-prompt');
                this.userInput.value = prompt;
                this.userInput.focus();
            });
        });

        // Background selection dropdown
        this.backgroundSelect = document.getElementById('backgroundSelect');
        this.careerFieldSelect = document.getElementById('careerFieldSelect');
        
        this.backgroundSelect.addEventListener('change', (e) => {
            this.handleBackgroundSelection(e.target.value);
        });

        this.careerFieldSelect.addEventListener('change', (e) => {
            this.handleCareerFieldSelection(e.target.value);
        });

        // Auto-resize textarea
        this.userInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
    }

    autoResizeTextarea() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.autoResizeTextarea();
        this.sendButton.disabled = true;

        // Show loading
        this.showLoading();

        try {
            // Get AI response with fallback
            const response = await this.getAIResponseWithFallback(message);
            
            // Add AI response to chat
            this.addMessage(response, 'bot');
            
            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            );
            
            // Keep history manageable (last 10 exchanges)
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        } finally {
            this.hideLoading();
            this.sendButton.disabled = false;
            this.scrollToBottom();
        }
    }

    async generateCareerGuide() {
        const career = this.careerInput.value.trim();
        if (!career) {
            alert('Please enter a career name first!');
            return;
        }

        this.showLoading();
        
        const guidePrompt = `Create a concise career guide for ${career}. Provide only bullet points:
        • Job description: 1-2 sentences
        • Education: main qualifications needed
        • Skills: top 3-5 essential skills
        • Career path: key progression steps
        • Salary: approximate range
        • Certifications: most important ones
        • Getting started: 2-3 immediate actions
        
        Format strictly as bullet points. Maximum 100 words. Be precise and to the point.`;

        try {
            const guide = await this.getAIResponse(guidePrompt);
            
            // Add guide to chat
            this.addMessage(`Here's your comprehensive career guide for ${career}:`, 'bot');
            this.addMessage(guide, 'bot');
            
            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: guidePrompt },
                { role: 'assistant', content: guide }
            );
            
        } catch (error) {
            console.error('Error generating guide:', error);
            this.addMessage('Sorry, I encountered an error generating the career guide. Please try again.', 'bot');
        } finally {
            this.hideLoading();
            this.scrollToBottom();
        }
    }

    async getAIResponse(message) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    history: this.conversationHistory
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
            
        } catch (error) {
            console.error('API Error:', error);
            
            // Fallback response if API fails
            return `I apologize, but I'm currently unable to connect to the career guidance service. ` +
                   `This might be due to network issues or service maintenance. ` +
                   `Please try again in a few moments.`;
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        const icon = document.createElement('i');
        icon.className = type === 'user' ? 'fas fa-user' : 'fas fa-robot';
        avatar.appendChild(icon);
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        const paragraph = document.createElement('div');
        paragraph.className = 'message-content-text';
        
        // Apply markdown formatting to bot messages only
        if (type === 'bot') {
            paragraph.innerHTML = renderMarkdown(content);
        } else {
            paragraph.textContent = content;
        }
        
        textDiv.appendChild(paragraph);
        messageContent.appendChild(avatar);
        messageContent.appendChild(textDiv);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            this.chatMessages.innerHTML = `
                <div class="message bot-message">
                    <div class="message-content">
                        <div class="message-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-text">
                            <p>Hello! I'm your career guidance assistant. I can help you explore career options, 
                            provide guidance on career paths, and even draft a comprehensive career guide for any 
                            specific career choice you're interested in. How can I assist you today?</p>
                        </div>
                    </div>
                </div>
            `;
            this.conversationHistory = [];
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    // Career field data based on educational background
    getCareerFieldsByBackground(background) {
        const careerFields = {
            science: [
                'Medicine & Healthcare',
                'Engineering',
                'Data Science & Analytics',
                'Research & Development',
                'Biotechnology',
                'Environmental Science',
                'Pharmacy',
                'Agriculture Science',
                'Forensic Science',
                'Space Technology'
            ],
            commerce: [
                'Accounting & Finance',
                'Business Management',
                'Banking & Insurance',
                'Marketing & Sales',
                'Human Resources',
                'Supply Chain Management',
                'Entrepreneurship',
                'Economics & Policy',
                'Digital Marketing',
                'Investment Banking'
            ],
            arts: [
                'Journalism & Media',
                'Psychology & Counseling',
                'Education & Teaching',
                'Social Work',
                'Fine Arts & Design',
                'Literature & Writing',
                'History & Archaeology',
                'Political Science',
                'Languages & Translation',
                'Performing Arts'
            ],
            other: [
                'Information Technology',
                'Hospitality & Tourism',
                'Sports & Fitness',
                'Fashion & Design',
                'Culinary Arts',
                'Aviation',
                'Defense Services',
                'Civil Services',
                'Law & Legal Services',
                'Real Estate'
            ]
        };

        return careerFields[background] || [];
    }

    handleBackgroundSelection(background) {
        if (!background) {
            this.careerFieldSelect.disabled = true;
            this.careerFieldSelect.innerHTML = '<option value="">Select a career field</option>';
            return;
        }

        const careerFields = this.getCareerFieldsByBackground(background);
        this.careerFieldSelect.innerHTML = '<option value="">Select a career field</option>';
        
        careerFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field.toLowerCase().replace(/\s+/g, '-');
            option.textContent = field;
            this.careerFieldSelect.appendChild(option);
        });

        this.careerFieldSelect.disabled = false;
    }

    handleCareerFieldSelection(careerField) {
        if (!careerField) return;

        const background = this.backgroundSelect.value;
        const fieldName = this.careerFieldSelect.options[this.careerFieldSelect.selectedIndex].text;
        
        const prompt = `I have a ${background} background and I'm interested in ${fieldName}. ` +
                      `Can you provide detailed information about career opportunities, required education, ` +
                      `skills needed, salary expectations, growth prospects, and most importantly, ` +
                      `recommend specific entrance exams and competitive exams that can help me get into better colleges for this field?`;

        this.userInput.value = prompt;
        this.userInput.focus();
        this.autoResizeTextarea();
    }

    // Method to get exam recommendations for a specific career
    async getExamRecommendations(career) {
        if (!career) {
            alert('Please enter a career name first!');
            return;
        }

        this.showLoading();
        
        const examPrompt = `I want to pursue ${career}. Recommend key exams and certifications in bullet points:
        • Exams: top 3-5 entrance/competitive exams
        • Eligibility: main requirements only
        • Pattern: exam format overview
        • Preparation: most effective resources
        • Benefits: career impact summary
        
        Format strictly as bullet points. Maximum 80 words. Be precise and to the point.`;

        try {
            const examInfo = await this.getAIResponse(examPrompt);
            
            // Add exam recommendations to chat
            this.addMessage(`Here are exam recommendations for ${career}:`, 'bot');
            this.addMessage(examInfo, 'bot');
            
            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: examPrompt },
                { role: 'assistant', content: examInfo }
            );
            
        } catch (error) {
            console.error('Error getting exam recommendations:', error);
            this.addMessage('Sorry, I encountered an error getting exam recommendations. Please try again.', 'bot');
        } finally {
            this.hideLoading();
            this.scrollToBottom();
        }
    }

    // Enhanced AI response with fallback data
    async getAIResponseWithFallback(message) {
        try {
            return await this.getAIResponse(message);
        } catch (error) {
            // Fallback responses for common career queries
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('commerce') || lowerMessage.includes('accounting') || lowerMessage.includes('finance')) {
                return this.getCommerceFallbackResponse(message);
            } else if (lowerMessage.includes('science') || lowerMessage.includes('engineering') || lowerMessage.includes('medical')) {
                return this.getScienceFallbackResponse(message);
            } else if (lowerMessage.includes('arts') || lowerMessage.includes('humanities') || lowerMessage.includes('teaching')) {
                return this.getArtsFallbackResponse(message);
            }
            
            return 'I apologize, but I\'m currently unable to connect to the career guidance service. ' +
                   'This might be due to network issues or service maintenance. ' +
                   'Please try again in a few moments.';
        }
    }

    getCommerceFallbackResponse(message) {
        return `Based on your interest in commerce careers, here's an overview:

**Commerce Career Paths:**
• **Accounting & Finance:** CPA, CMA, financial analyst roles (₹4-12 LPA)
• **Business Management:** MBA graduates can earn ₹6-20 LPA
• **Banking:** PO exams, investment banking (₹5-15 LPA)
• **Marketing:** Digital marketing specialists (₹4-10 LPA)
• **Entrepreneurship:** Start your own business

**Required Education:**
• Bachelor of Commerce (B.Com)
• MBA for management roles
• Professional certifications: CA, CS, CMA

**Top Recruiters:** Big 4 accounting firms, banks, MNCs, FMCG companies

**Growth Prospects:** Excellent with experience and additional qualifications.`;
    }

    getScienceFallbackResponse(message) {
        return `Based on your interest in science careers, here's an overview:

**Science Career Paths:**
• **Medicine:** MBBS, MD specialists (₹8-25 LPA)
• **Engineering:** B.Tech in various specializations (₹4-15 LPA)
• **Research:** Scientists in ISRO, DRDO, CSIR (₹6-18 LPA)
• **Data Science:** AI/ML engineers (₹6-20 LPA)
• **Biotechnology:** Research scientists (₹5-12 LPA)

**Required Education:**
• PCM/PCB in 12th
• Professional degrees: MBBS, B.Tech, B.Pharma
• Research degrees: M.Tech, PhD

**Top Recruiters:** Tech companies, research organizations, hospitals

**Growth Prospects:** Very high with specialization and experience.`;
    }

    getArtsFallbackResponse(message) {
        return `Based on your interest in arts careers, here's an overview:

**Arts Career Paths:**
• **Journalism:** News anchors, reporters (₹3-8 LPA)
• **Psychology:** Clinical psychologists (₹4-10 LPA)
• **Teaching:** Professors, school teachers (₹3-9 LPA)
• **Design:** Graphic designers, UX/UI (₹4-12 LPA)
• **Civil Services:** UPSC exams (₹7-18 LPA)

**Required Education:**
• Bachelor of Arts (B.A.)
• Master's degrees for specialization
• Professional certifications

**Top Recruiters:** Media houses, schools, government, design firms

**Growth Prospects:** Good with experience and networking.`;
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CareerGuidanceChatbot();
});

// Utility function for rendering markdown content
function renderMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // Headers (h1-h6)
    html = html.replace(/^######\s+(.+?)\s*$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+?)\s*$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+?)\s*$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+?)\s*$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+?)\s*$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+?)\s*$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Lists - unordered (bullet points)
    html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\s*•\s+(.+)$/gm, '<li>$1</li>');
    
    // Lists - ordered (numbered)
    html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    
    // Wrap lists in proper ul/ol tags
    html = html.replace(/(<li>.*<\/li>)/gs, function(match) {
        // Check if it's likely an ordered list (contains numbers)
        if (match.match(/\d+\./)) {
            return '<ol>' + match + '</ol>';
        } else {
            return '<ul>' + match + '</ul>';
        }
    });
    
    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');
    
    // Clean up any empty list items
    html = html.replace(/<li><\/li>/g, '');
    
    return html;
}