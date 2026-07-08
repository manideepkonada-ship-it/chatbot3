// GourmetGuide AI - App Controller

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let chats = JSON.parse(localStorage.getItem('gourmet_chats')) || [];
    let activeChatId = localStorage.getItem('gourmet_active_chat_id') || null;
    let currentTheme = localStorage.getItem('gourmet_theme') || 'dark';
    let selectedModel = 'flash';
    let currentAttachment = null; // Stores { id, name, emoji, desc }

    // DOM Elements
    const body = document.body;
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const chatHistoryList = document.getElementById('chatHistoryList');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const modelSelect = document.getElementById('modelSelect');
    const chatViewport = document.getElementById('chatViewport');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Attachment Preview Elements
    const attachBtn = document.getElementById('attachBtn');
    const attachmentPreviewBar = document.getElementById('attachmentPreviewBar');
    const previewThumbnail = document.getElementById('previewThumbnail');
    const previewFilename = document.getElementById('previewFilename');
    const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');
    
    // Modal Elements
    const uploadModal = document.getElementById('uploadModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    // ----------------------------------------------------
    // Initialize Theme and Icons
    // ----------------------------------------------------
    if (currentTheme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else {
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
    }
    
    // Initialize Lucide Icons
    lucide.createIcons();

    // ----------------------------------------------------
    // Event Listeners - Layout and Theme
    // ----------------------------------------------------
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    themeToggleBtn.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            currentTheme = 'light';
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            currentTheme = 'dark';
        }
        localStorage.setItem('gourmet_theme', currentTheme);
    });

    modelSelect.addEventListener('change', (e) => {
        selectedModel = e.target.value;
    });

    // ----------------------------------------------------
    // Textarea Resizing and Send Validation
    // ----------------------------------------------------
    chatInput.addEventListener('input', () => {
        // Auto grow height
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        
        // Enable/disable send button
        validateSendButton();
    });

    function validateSendButton() {
        const hasText = chatInput.value.trim().length > 0;
        const hasAttachment = currentAttachment !== null;
        sendBtn.disabled = !(hasText || hasAttachment);
    }

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                sendMessage();
            }
        }
    });

    // ----------------------------------------------------
    // Suggestion Cards Trigger
    // ----------------------------------------------------
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            chatInput.value = prompt;
            // Trigger height recalculation and button validation
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            validateSendButton();
            chatInput.focus();
        });
    });

    // ----------------------------------------------------
    // Attachment Modal Handlers
    // ----------------------------------------------------
    attachBtn.addEventListener('click', () => {
        uploadModal.classList.add('open');
    });

    closeModalBtn.addEventListener('click', () => {
        uploadModal.classList.remove('open');
    });

    // Close modal when clicking overlay
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('open');
        }
    });

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const foodId = item.getAttribute('data-food-id');
            const filename = item.getAttribute('data-food-name');
            const desc = item.getAttribute('data-food-desc');
            const emoji = item.getAttribute('data-food-emoji');

            currentAttachment = { id: foodId, filename, desc, emoji };
            
            // Render attachment preview bar
            previewThumbnail.textContent = emoji;
            previewFilename.textContent = filename;
            attachmentPreviewBar.style.display = 'flex';
            
            // Close modal
            uploadModal.classList.remove('open');
            validateSendButton();
            chatInput.focus();
        });
    });

    removeAttachmentBtn.addEventListener('click', () => {
        currentAttachment = null;
        attachmentPreviewBar.style.display = 'none';
        validateSendButton();
    });

    // Settings Modal Event Listeners
    settingsBtn.addEventListener('click', () => {
        const savedKey = localStorage.getItem('gourmet_gemini_api_key') || '';
        apiKeyInput.value = savedKey;
        settingsModal.classList.add('open');
    });

    closeSettingsModalBtn.addEventListener('click', () => {
        settingsModal.classList.remove('open');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('open');
        }
    });

    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gourmet_gemini_api_key', key);
            alert('Gemini API Key saved successfully!');
        } else {
            localStorage.removeItem('gourmet_gemini_api_key');
            alert('API Key cleared. The client will try the backend server.');
        }
        settingsModal.classList.remove('open');
    });

    // ----------------------------------------------------
    // State Management - Chat CRUD
    // ----------------------------------------------------
    newChatBtn.addEventListener('click', () => {
        createNewChat();
        if (window.innerWidth <= 900) {
            sidebar.classList.remove('open');
        }
    });

    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all chats and reset history?')) {
            chats = [];
            activeChatId = null;
            saveState();
            renderChatHistory();
            renderActiveChat();
        }
    });

    function createNewChat() {
        const newChat = {
            id: 'chat_' + Date.now(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString()
        };
        chats.unshift(newChat);
        activeChatId = newChat.id;
        saveState();
        renderChatHistory();
        renderActiveChat();
        chatInput.focus();
    }

    function selectChat(id) {
        activeChatId = id;
        saveState();
        renderChatHistory();
        renderActiveChat();
        if (window.innerWidth <= 900) {
            sidebar.classList.remove('open');
        }
    }

    function deleteChat(id, event) {
        event.stopPropagation();
        if (confirm('Delete this conversation?')) {
            chats = chats.filter(c => c.id !== id);
            if (activeChatId === id) {
                activeChatId = chats.length > 0 ? chats[0].id : null;
            }
            saveState();
            renderChatHistory();
            renderActiveChat();
        }
    }

    function renameChat(id, event) {
        event.stopPropagation();
        const chat = chats.find(c => c.id === id);
        if (!chat) return;
        
        const newTitle = prompt('Rename this chat:', chat.title);
        if (newTitle && newTitle.trim().length > 0) {
            chat.title = newTitle.trim();
            saveState();
            renderChatHistory();
        }
    }

    function saveState() {
        localStorage.setItem('gourmet_chats', JSON.stringify(chats));
        localStorage.setItem('gourmet_active_chat_id', activeChatId);
    }

    // ----------------------------------------------------
    // Rendering Chat History Sidebar
    // ----------------------------------------------------
    function renderChatHistory() {
        chatHistoryList.innerHTML = '';
        
        if (chats.length === 0) {
            chatHistoryList.innerHTML = `<div class="disclaimer-text" style="margin-top:20px;">No recent chats. Start healthy tracking!</div>`;
            return;
        }

        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-history-item ${chat.id === activeChatId ? 'active' : ''}`;
            item.onclick = () => selectChat(chat.id);

            // Chat Title & Icon
            const leftPart = document.createElement('div');
            leftPart.className = 'chat-item-left';
            
            const chatIcon = document.createElement('i');
            chatIcon.setAttribute('data-lucide', 'message-square');
            chatIcon.style.width = '16px';
            chatIcon.style.height = '16px';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'chat-item-title-text';
            titleSpan.textContent = chat.title;

            leftPart.appendChild(chatIcon);
            leftPart.appendChild(titleSpan);

            // Chat Action Controls
            const actions = document.createElement('div');
            actions.className = 'chat-item-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'chat-item-action-btn';
            editBtn.title = 'Rename Chat';
            editBtn.onclick = (e) => renameChat(chat.id, e);
            editBtn.innerHTML = `<i data-lucide="edit-3" style="width:14px;height:14px;"></i>`;

            const delBtn = document.createElement('button');
            delBtn.className = 'chat-item-action-btn';
            delBtn.title = 'Delete Chat';
            delBtn.onclick = (e) => deleteChat(chat.id, e);
            delBtn.innerHTML = `<i data-lucide="trash-2" style="width:14px;height:14px;"></i>`;

            actions.appendChild(editBtn);
            actions.appendChild(delBtn);

            item.appendChild(leftPart);
            item.appendChild(actions);

            chatHistoryList.appendChild(item);
        });
        
        lucide.createIcons();
    }

    // ----------------------------------------------------
    // Rendering Active Chat and Messages
    // ----------------------------------------------------
    function renderActiveChat() {
        // If there are no chats, auto-create one
        if (chats.length === 0) {
            welcomeScreen.style.display = 'flex';
            messagesContainer.innerHTML = '';
            activeChatId = null;
            return;
        }

        const currentChat = chats.find(c => c.id === activeChatId);
        if (!currentChat) {
            welcomeScreen.style.display = 'flex';
            messagesContainer.innerHTML = '';
            return;
        }

        // Switch screen states
        if (currentChat.messages.length === 0) {
            welcomeScreen.style.display = 'flex';
            messagesContainer.innerHTML = '';
        } else {
            welcomeScreen.style.display = 'none';
            messagesContainer.innerHTML = '';
            
            // Render existing messages
            currentChat.messages.forEach(msg => {
                appendMessageHTML(msg);
            });
            
            scrollToBottom();
        }
    }

    function appendMessageHTML(msg) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${msg.sender}`;

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = msg.sender === 'user' ? 'U' : '🥗';

        // Bubble
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // User attachment (if present)
        if (msg.sender === 'user' && msg.attachment) {
            const attBubble = document.createElement('div');
            attBubble.className = 'message-attachment-bubble';
            attBubble.innerHTML = `
                <span class="message-attachment-emoji">${msg.attachment.emoji}</span>
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:700;">${msg.attachment.filename}</span>
                    <span style="font-size:10px; opacity:0.8;">Attached Food Photo</span>
                </div>
            `;
            bubble.appendChild(attBubble);
        }

        // Message text body (formatted markdown style)
        if (msg.text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text-content';
            textDiv.innerHTML = formatMarkdownText(msg.text);
            bubble.appendChild(textDiv);
        }

        // Special Interactive layouts based on type
        if (msg.specialType === 'macro' && msg.specialData) {
            const macroCard = createMacroCard(msg.specialData);
            bubble.appendChild(macroCard);
        } else if (msg.specialType === 'street-food' && msg.specialData) {
            const streetCard = createStreetFoodCard(msg.specialData);
            bubble.appendChild(streetCard);
        } else if (msg.specialType === 'diet-plan' && msg.specialData) {
            const dietCard = createDietPlanCard(msg.specialData);
            bubble.appendChild(dietCard);
        } else if (msg.specialType === 'recipe' && msg.specialData) {
            const recipeCard = createRecipeCard(msg.specialData);
            bubble.appendChild(recipeCard);
        }

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        messagesContainer.appendChild(wrapper);
        
        lucide.createIcons();
    }

    function scrollToBottom() {
        chatViewport.scrollTop = chatViewport.scrollHeight;
    }

    // Markdown Parser (handles headers, bold, bullet lists, numeric lists)
    function formatMarkdownText(text) {
        if (!text) return '';
        
        let html = text;
        
        // Escape standard HTML tags to avoid injecting arbitrary code
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
            
        // Render headings
        html = html.replace(/^### (.*$)/gim, '<h4 style="font-size:15px; font-weight:700; margin:16px 0 8px; color:var(--accent-color);">$1</h4>');
        html = html.replace(/^## (.*$)/gim, '<h3 style="font-size:18px; font-weight:800; margin:18px 0 10px; color:var(--text-primary);">$1</h3>');
        html = html.replace(/^# (.*$)/gim, '<h2 style="font-size:22px; font-weight:800; margin:20px 0 12px; color:var(--text-primary);">$1</h2>');
        
        // Bold text (**text**)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Bullet Lists (* or - )
        // Group list items that are consecutive
        html = html.replace(/^\s*[\-\*]\s+(.*)$/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gim, '<ul style="margin: 0 0 12px 20px;">$1</ul>');
        // Clean double nested lists that might occur due to line-by-line regex
        html = html.replace(/<\/ul>\s*<ul style="margin: 0 0 12px 20px;">/g, '');

        // Linebreaks
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    // ----------------------------------------------------
    // Sending Message & AI Trigger
    // ----------------------------------------------------
    async function sendMessage() {
        const text = chatInput.value.trim();
        const attachment = currentAttachment;
        
        if (!text && !attachment) return;

        // Auto-create chat if none exists
        if (chats.length === 0 || !activeChatId) {
            createNewChat();
        }

        const currentChat = chats.find(c => c.id === activeChatId);
        
        // Rename chat title if it is still the default and it's the first message
        if (currentChat.messages.length === 0 && text) {
            currentChat.title = text.length > 25 ? text.substring(0, 25) + '...' : text;
        }

        // Add user message
        const userMsg = {
            sender: 'user',
            text: text,
            attachment: attachment,
            timestamp: new Date().toISOString()
        };
        currentChat.messages.push(userMsg);
        saveState();
        renderChatHistory();
        renderActiveChat();

        // Clear input and attachment state
        chatInput.value = '';
        chatInput.style.height = 'auto';
        currentAttachment = null;
        attachmentPreviewBar.style.display = 'none';
        validateSendButton();

        // Append Typing Indicator
        showTypingIndicator();
        scrollToBottom();

        try {
            // Get response from either local API key, backend, or simulated fallback
            const aiResponse = await getGourmetGuideResponse(text, attachment, selectedModel, currentChat.messages);
            hideTypingIndicator();
            currentChat.messages.push(aiResponse);
        } catch (error) {
            console.error("AI response fetch error:", error);
            hideTypingIndicator();
            
            // Connection error message
            currentChat.messages.push({
                sender: 'bot',
                text: `⚠️ **Connection Error**: I could not retrieve a response. \n\n*Error details*: ${error.message || error} \n\n*Please ensure your backend server is running (` + '`python server.py` ' + `on port 3000) or check your Gemini API key in the settings modal in the sidebar.*`,
                timestamp: new Date().toISOString()
            });
        }

        saveState();
        renderActiveChat();
    }

    async function getGourmetGuideResponse(userText, attachment, model, chatHistory) {
        const clientApiKey = localStorage.getItem('gourmet_gemini_api_key');
        
        const systemInstruction = `You are GourmetGuide, a professional, enthusiastic AI dietitian and culinary expert. Your styling and responses are vibrant and warm. You MUST support the custom rich-ui card formatting of GourmetGuide when responding. Follow these instructions exactly:
1. NUTRITIONAL ANALYSIS: If the user asks to analyze a meal, describe a plate of food, or upload/select a food photo, provide a general text review AND at the end of your response, output a structured line starting with 'NUTRITION_DATA: ' followed by a single JSON object. Example:
NUTRITION_DATA: {"title": "Avocado Toast with Egg", "calories": 395, "protein": 15, "carbs": 28, "fat": 25, "dietClass": "Balanced High-Fiber", "sugar": "1.5g", "fiber": "6g", "sodium": "380mg"}
2. RECIPE: If the user asks for a recipe, how to make something, or how to cook a dish, provide a general introduction and details AND at the end, output a structured line starting with 'RECIPE_DATA: ' followed by a single JSON object. Example:
RECIPE_DATA: {"recipeName": "Garlic Spinach Pasta", "difficulty": "Easy", "type": "Vegetarian", "totalTime": "15 mins", "calories": 480, "protein": 12, "carbs": 68, "fat": 16, "ingredients": ["80g Spaghetti", "2 cups Spinach", "2 tbsp Olive Oil", "3 Garlic cloves"], "steps": ["Boil pasta.", "Sauté garlic in olive oil.", "Toss pasta with spinach.", "Serve with cheese."]}
3. DIET SCHEDULE: If the user requests a diet plan, meal schedule, or weekly calendar (e.g. for weight loss or clean bulking), provide a text summary and overview AND at the end, output a structured line starting with 'DIET_DATA: ' followed by a single JSON object. The object must map all 7 days (monday, tuesday, wednesday, thursday, friday, saturday, sunday) with breakfast, lunch, snack, and dinner. Example:
DIET_DATA: {"planName": "7-Day Weight Loss Plan", "targetCalories": 1600, "focus": "Fat Loss", "days": {"monday": {"breakfast": {"title": "Oats", "items": "Oats & almond milk", "calories": 300}, "lunch": {"title": "Chicken Salad", "items": "Greens & chicken", "calories": 400}, "snack": {"title": "Yogurt", "items": "Greek yogurt", "calories": 150}, "dinner": {"title": "Salmon", "items": "Salmon & asparagus", "calories": 500}}, "tuesday": {"breakfast": {"title": "Eggs", "items": "Eggs & toast", "calories": 350}, "lunch": {"title": "Tuna Salad", "items": "Tuna & cucumber", "calories": 450}, "snack": {"title": "Almonds", "items": "15 almonds", "calories": 150}, "dinner": {"title": "Turkey", "items": "Turkey & broccoli", "calories": 480}}, "wednesday": {"breakfast": {"title": "Oats", "items": "Oats & almond milk", "calories": 300}, "lunch": {"title": "Chicken Salad", "items": "Greens & chicken", "calories": 400}, "snack": {"title": "Yogurt", "items": "Greek yogurt", "calories": 150}, "dinner": {"title": "Salmon", "items": "Salmon & asparagus", "calories": 500}}, "thursday": {"breakfast": {"title": "Oats", "items": "Oats & almond milk", "calories": 300}, "lunch": {"title": "Chicken Salad", "items": "Greens & chicken", "calories": 400}, "snack": {"title": "Yogurt", "items": "Greek yogurt", "calories": 150}, "dinner": {"title": "Salmon", "items": "Salmon & asparagus", "calories": 500}}, "friday": {"breakfast": {"title": "Oats", "items": "Oats & almond milk", "calories": 300}, "lunch": {"title": "Chicken Salad", "items": "Greens & chicken", "calories": 400}, "snack": {"title": "Yogurt", "items": "Greek yogurt", "calories": 150}, "dinner": {"title": "Salmon", "items": "Salmon & asparagus", "calories": 500}}, "saturday": {"breakfast": {"title": "Oats", "items": "Oats & almond milk", "calories": 300}, "lunch": {"title": "Chicken Salad", "items": "Greens & chicken", "calories": 400}, "snack": {"title": "Yogurt", "items": "Greek yogurt", "calories": 150}, "dinner": {"title": "Salmon", "items": "Salmon & asparagus", "calories": 500}}, "sunday": {"breakfast": {"title": "Oats", "items": "Oats & almond milk", "calories": 300}, "lunch": {"title": "Chicken Salad", "items": "Greens & chicken", "calories": 400}, "snack": {"title": "Yogurt", "items": "Greek yogurt", "calories": 150}, "dinner": {"title": "Salmon", "items": "Salmon & asparagus", "calories": 500}}}}
4. FAMOUS FOOD STREETS: If the user asks about street food, where to eat, or famous dishes in a city, provide an overview and at the end output a structured line starting with 'STREET_DATA: ' followed by a single JSON object. Example:
STREET_DATA: {"streetName": "Sindhi Colony & Charminar Lane", "city": "Hyderabad", "rating": "4.8", "costRating": "₹₹", "gourmetTip": "Go after 8 PM", "dishes": [{"name": "Mulberry Rabdi", "emoji": "🍧", "desc": "Rich double cream pot dessert"}, {"name": "Irani Chai", "emoji": "☕", "desc": "Strong milky tea with biscuits"}]}
Always be positive, encouraging, and detailed. Write out normal conversation paragraphs first, and append the requested DATA line at the very end of the message on a new line.`;

        let replyText = "";
        let usedAI = false;

        // 1. Check if client-side API Key is configured
        if (clientApiKey) {
            try {
                replyText = await callClientSideGemini(clientApiKey, userText, attachment, chatHistory, systemInstruction);
                usedAI = true;
            } catch (err) {
                console.warn("Client-side Gemini failed, trying backend...", err);
            }
        }

        // 2. If client-side failed or wasn't configured, try calling backend server
        if (!usedAI) {
            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: userText,
                        history: chatHistory,
                        model: model
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    replyText = data.text;
                    usedAI = true;
                } else {
                    const errData = await response.json();
                    throw new Error(errData.error || `HTTP error ${response.status}`);
                }
            } catch (err) {
                console.warn("Backend server call failed, trying simulation fallback...", err);
                // 3. Fallback to simulation
                return generateAIResponse(userText, attachment, model);
            }
        }

        // Parse structured data from the real Gemini reply
        let specialType = null;
        let specialData = null;
        let cleanText = replyText;

        const dataMarkers = [
            { marker: 'NUTRITION_DATA:', type: 'macro' },
            { marker: 'RECIPE_DATA:', type: 'recipe' },
            { marker: 'DIET_DATA:', type: 'diet-plan' },
            { marker: 'STREET_DATA:', type: 'street-food' }
        ];

        for (const { marker, type } of dataMarkers) {
            if (replyText.includes(marker)) {
                const index = replyText.indexOf(marker);
                cleanText = replyText.substring(0, index).trim();
                try {
                    const jsonStr = replyText.substring(index + marker.length).trim();
                    specialData = JSON.parse(jsonStr);
                    specialType = type;
                } catch (e) {
                    console.error(`Failed to parse ${marker}:`, e);
                }
                break; // Found our marker
            }
        }

        return {
            sender: 'bot',
            text: cleanText,
            specialType: specialType,
            specialData: specialData,
            timestamp: new Date().toISOString()
        };
    }

    async function callClientSideGemini(apiKey, userText, attachment, chatHistory, systemInstruction) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // Map history to Gemini API format
        const contents = [];
        // Loop over history (skip system, map user/model)
        for (const msg of chatHistory) {
            // Check if there is text or attachment, skip items that don't have text
            if (!msg.text && !msg.attachment) continue;
            
            const role = msg.sender === 'user' ? 'user' : 'model';
            let text = msg.text || '';
            if (msg.sender === 'user' && msg.attachment) {
                const att = msg.attachment;
                text = `[Attached Image: ${att.filename} - Description: ${att.desc}] \nUser prompt: ${text}`;
            }
            contents.push({
                role: role,
                parts: [{ text: text }]
            });
        }

        // Ensure user message is at the end of the history
        if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
            let text = userText;
            if (attachment) {
                text = `[Attached Image: ${attachment.filename} - Description: ${attachment.desc}] \nUser prompt: ${text}`;
            }
            contents.push({
                role: 'user',
                parts: [{ text: text }]
            });
        }

        const payload = {
            contents: contents,
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            let errMsg = response.statusText;
            try {
                const errJson = JSON.parse(errBody);
                errMsg = errJson.error?.message || errMsg;
            } catch (e) {}
            throw new Error(`Gemini API: ${errMsg}`);
        }

        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!replyText) {
            throw new Error("Empty candidate in response");
        }
        return replyText;
    }

    // ----------------------------------------------------
    // Typing Indicator controls
    // ----------------------------------------------------
    let typingIndicatorElement = null;

    function showTypingIndicator() {
        if (typingIndicatorElement) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper bot typing-indicator-wrapper';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🥗';

        const bubble = document.createElement('div');
        bubble.className = 'typing-indicator';
        bubble.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        messagesContainer.appendChild(wrapper);
        typingIndicatorElement = wrapper;
    }

    function hideTypingIndicator() {
        if (typingIndicatorElement) {
            typingIndicatorElement.remove();
            typingIndicatorElement = null;
        }
    }

    // ----------------------------------------------------
    // Special Card Creators
    // ----------------------------------------------------

    // 1. Macro Breakdown Card Creator
    function createMacroCard(data) {
        const card = document.createElement('div');
        card.className = 'macro-card';
        
        // Calculate percentages
        const totalMacros = data.protein + data.carbs + data.fat;
        const proteinPct = totalMacros > 0 ? Math.round((data.protein / totalMacros) * 100) : 0;
        const carbsPct = totalMacros > 0 ? Math.round((data.carbs / totalMacros) * 100) : 0;
        const fatPct = totalMacros > 0 ? Math.round((data.fat / totalMacros) * 100) : 0;

        card.innerHTML = `
            <div class="macro-header">
                <span class="macro-title">Nutrition Analysis: <strong>${data.title}</strong></span>
                <div class="macro-calories">
                    <span class="calories-val">${data.calories}</span>
                    <span class="calories-lbl">Kcal Calories</span>
                </div>
            </div>
            
            <div class="macro-radial-container">
                <div class="macro-progress-bar-wrapper">
                    <div class="macro-lbl-group">
                        <span class="macro-lbl-val" style="color:#ff3b30;">${data.protein}g</span>
                        <span class="macro-lbl-name">Protein</span>
                    </div>
                    <div class="macro-bar-outer">
                        <div class="macro-bar-fill protein" style="width: 0%;"></div>
                    </div>
                    <span style="font-size:11px;color:var(--text-secondary);font-weight:600;">${proteinPct}%</span>
                </div>
                
                <div class="macro-progress-bar-wrapper">
                    <div class="macro-lbl-group">
                        <span class="macro-lbl-val" style="color:#ff9500;">${data.carbs}g</span>
                        <span class="macro-lbl-name">Carbs</span>
                    </div>
                    <div class="macro-bar-outer">
                        <div class="macro-bar-fill carbs" style="width: 0%;"></div>
                    </div>
                    <span style="font-size:11px;color:var(--text-secondary);font-weight:600;">${carbsPct}%</span>
                </div>
                
                <div class="macro-progress-bar-wrapper">
                    <div class="macro-lbl-group">
                        <span class="macro-lbl-val" style="color:#34c759;">${data.fat}g</span>
                        <span class="macro-lbl-name">Fat</span>
                    </div>
                    <div class="macro-bar-outer">
                        <div class="macro-bar-fill fat" style="width: 0%;"></div>
                    </div>
                    <span style="font-size:11px;color:var(--text-secondary);font-weight:600;">${fatPct}%</span>
                </div>
            </div>

            <div class="macro-details-list">
                <div class="macro-detail-row">
                    <span>Sodium</span>
                    <span>${data.sodium || '120mg'}</span>
                </div>
                <div class="macro-detail-row">
                    <span>Fiber</span>
                    <span>${data.fiber || '4.5g'}</span>
                </div>
                <div class="macro-detail-row">
                    <span>Sugars</span>
                    <span>${data.sugar || '2g'}</span>
                </div>
                <div class="macro-detail-row">
                    <span>Dietary Classification</span>
                    <span style="color:var(--success); font-weight:700;">${data.dietClass || 'Balanced'}</span>
                </div>
            </div>
        `;

        // Animate the fill bars after appending to DOM
        setTimeout(() => {
            const fills = card.querySelectorAll('.macro-bar-fill');
            if (fills[0]) fills[0].style.width = `${proteinPct}%`;
            if (fills[1]) fills[1].style.width = `${carbsPct}%`;
            if (fills[2]) fills[2].style.width = `${fatPct}%`;
        }, 100);

        return card;
    }

    // 2. Famous Street Food Card Creator
    function createStreetFoodCard(data) {
        const card = document.createElement('div');
        card.className = 'street-food-card';
        
        let dishesHTML = '';
        data.dishes.forEach(dish => {
            dishesHTML += `
                <div class="dish-item">
                    <span class="dish-emoji">${dish.emoji}</span>
                    <div class="dish-details">
                        <span class="dish-name">${dish.name}</span>
                        <span class="dish-recommendation">${dish.desc}</span>
                    </div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="street-header">
                <div class="street-info">
                    <span class="street-name">${data.streetName}</span>
                    <span class="street-city">${data.city}</span>
                </div>
                <div class="street-meta">
                    <span class="street-rating"><i data-lucide="star" style="width:14px;height:14px;fill:currentColor;"></i> ${data.rating}</span>
                    <span class="street-cost">${data.costRating}</span>
                </div>
            </div>
            
            <div style="font-size:13px; font-weight:700; color:var(--text-primary);">Must-Try Legendary Stalls:</div>
            <div class="street-dishes-grid">
                ${dishesHTML}
            </div>
            
            <div class="street-tip-box">
                <strong>💡 Gourmet Tip:</strong> ${data.gourmetTip}
            </div>
        `;
        
        return card;
    }

    // 3. Diet Plan Card Creator (with interactive Day tabs)
    function createDietPlanCard(data) {
        const card = document.createElement('div');
        card.className = 'diet-plan-card';
        
        // Generate tab buttons
        let tabsHTML = '';
        const days = Object.keys(data.days);
        days.forEach((day, index) => {
            tabsHTML += `
                <button class="diet-tab-btn ${index === 0 ? 'active' : ''}" data-day="${day}">
                    ${day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </button>
            `;
        });

        card.innerHTML = `
            <div class="diet-plan-header">
                <div class="diet-title-grp">
                    <h3>${data.planName}</h3>
                    <p>Daily target: <strong>${data.targetCalories} Kcal</strong> | Focus: ${data.focus}</p>
                </div>
                <button class="diet-export-btn" onclick="window.print()">
                    <i data-lucide="printer" style="width:14px;height:14px;"></i>
                    <span>Print Plan</span>
                </button>
            </div>
            
            <div class="diet-calendar-tabs">
                ${tabsHTML}
            </div>
            
            <div class="diet-meals-container">
                <!-- Meals for active day will be dynamically rendered here -->
            </div>
        `;

        // Render function for meals in the selected day
        const mealsContainer = card.querySelector('.diet-meals-container');
        
        function renderMealsForDay(dayName) {
            mealsContainer.innerHTML = '';
            const meals = data.days[dayName];
            
            if (!meals) return;

            const mealKeys = ['breakfast', 'lunch', 'snack', 'dinner'];
            
            mealKeys.forEach(key => {
                const meal = meals[key];
                if (!meal) return;

                const row = document.createElement('div');
                row.className = `meal-row ${key}`;
                row.innerHTML = `
                    <span class="meal-tag">${key}</span>
                    <div class="meal-content-grp">
                        <span class="meal-name">${meal.title}</span>
                        <span class="meal-items">${meal.items}</span>
                    </div>
                    <span class="meal-calories-badge">${meal.calories} kcal</span>
                `;
                mealsContainer.appendChild(row);
            });
        }

        // Initialize with first day
        renderMealsForDay(days[0]);

        // Add tab listeners
        const tabs = card.querySelectorAll('.diet-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderMealsForDay(tab.getAttribute('data-day'));
            });
        });

        return card;
    }

    // 4. Recipe Card Creator (with checklist state)
    function createRecipeCard(data) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        // Ingredients checklist
        let ingredientsHTML = '';
        data.ingredients.forEach((ing, index) => {
            const id = `ing_${Date.now()}_${index}`;
            ingredientsHTML += `
                <label class="ingredient-checkbox-row" for="${id}">
                    <input type="checkbox" id="${id}">
                    <span>${ing}</span>
                </label>
            `;
        });

        // Directions steps
        let directionsHTML = '';
        data.steps.forEach((step, index) => {
            directionsHTML += `
                <div class="recipe-step-row">
                    <span class="step-number">${index + 1}</span>
                    <span class="step-text">${step}</span>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="recipe-header-main">
                <h3 class="recipe-title">${data.recipeName}</h3>
                <div class="recipe-tags">
                    <span class="recipe-tag">⚡ ${data.difficulty}</span>
                    <span class="recipe-tag">🌱 ${data.type}</span>
                    <span class="recipe-tag">⏱️ ${data.totalTime}</span>
                </div>
            </div>
            
            <div class="recipe-stats-row">
                <div class="recipe-stat-box">
                    <span class="recipe-stat-val" style="color:var(--accent-color);">${data.calories}</span>
                    <span class="recipe-stat-lbl">Calories</span>
                </div>
                <div class="recipe-stat-box">
                    <span class="recipe-stat-val">${data.protein}g</span>
                    <span class="recipe-stat-lbl">Protein</span>
                </div>
                <div class="recipe-stat-box">
                    <span class="recipe-stat-val">${data.carbs}g</span>
                    <span class="recipe-stat-lbl">Carbs</span>
                </div>
                <div class="recipe-stat-box">
                    <span class="recipe-stat-val">${data.fat}g</span>
                    <span class="recipe-stat-lbl">Fat</span>
                </div>
            </div>
            
            <div class="recipe-section-title">Ingredients Checkbox</div>
            <div class="recipe-ingredients-list">
                ${ingredientsHTML}
            </div>
            
            <div class="recipe-section-title">Cooking Directions</div>
            <div class="recipe-steps-list">
                ${directionsHTML}
            </div>
        `;

        return card;
    }

    // ----------------------------------------------------
    // AI Brain Logic (The core simulation for Food topic)
    // ----------------------------------------------------
    function generateAIResponse(userText, attachment, model) {
        const cleanText = userText.toLowerCase();
        
        // 1. ATTACHMENT CASE: Calorie / Macro breakdown analysis
        if (attachment) {
            let data = null;
            let textReply = "";

            if (attachment.id === 'avocado_toast') {
                data = {
                    title: "Sourdough Avocado Toast with Poached Egg",
                    calories: 395,
                    protein: 15,
                    carbs: 28,
                    fat: 25,
                    dietClass: "Balanced High-Fiber Diet",
                    sugar: "1.5g",
                    fiber: "6g",
                    sodium: "380mg"
                };
                textReply = "I have successfully analyzed the uploaded photo of your meal. Based on standard portion sizing, this looks like a classic **Avocado Toast served on Sourdough bread, topped with a Poached Egg**. \n\nHere is a detailed macro and calorie analysis of your meal:";
            } else if (attachment.id === 'burger_fries') {
                data = {
                    title: "Double Cheeseburger & Salted French Fries",
                    calories: 890,
                    protein: 38,
                    carbs: 82,
                    fat: 45,
                    dietClass: "High Protein / High Fat",
                    sugar: "8g",
                    fiber: "5g",
                    sodium: "1240mg"
                };
                textReply = "Photo analysis complete! This plate contains a classic **Double Cheeseburger alongside Crispy Salted French Fries**. While it offers high protein content, it is also very high in saturated fats and sodium. \n\nHere is the nutritional breakdown:";
            } else if (attachment.id === 'buddha_bowl') {
                data = {
                    title: "Quinoa Vegan Buddha Bowl with Roasted Sweet Potatoes",
                    calories: 460,
                    protein: 14,
                    carbs: 64,
                    fat: 16,
                    dietClass: "Nutrient-Dense Vegan Diet",
                    sugar: "4g",
                    fiber: "11g",
                    sodium: "220mg"
                };
                textReply = "Photo analyzed successfully! This is a beautifully colorful **Quinoa Vegan Buddha Bowl** containing roasted sweet potato slices, chickpeas, spinach, and avocado. It is extremely high in dietary fiber and essential minerals.\n\nHere is your macro summary:";
            } else if (attachment.id === 'smoothie_bowl') {
                data = {
                    title: "Strawberry Banana Protein Smoothie Bowl",
                    calories: 310,
                    protein: 18,
                    carbs: 48,
                    fat: 5,
                    dietClass: "Low Fat / High Carb Recovery Meal",
                    sugar: "22g",
                    fiber: "7g",
                    sodium: "150mg"
                };
                textReply = "I've processed the image. This looks like a delicious **Strawberry Banana Protein Smoothie Bowl** sprinkled with chia seeds and granola. It makes for a fantastic post-workout recovery breakfast! \n\nHere is the nutritional information:";
            }

            return {
                sender: 'bot',
                text: textReply,
                specialType: 'macro',
                specialData: data,
                timestamp: new Date().toISOString()
            };
        }

        // 2. STREET FOOD FINDER CASE
        const foodStreetKeywords = ['street', 'street food', 'food street', 'famous food', 'legendary stalls', 'where to eat'];
        const matchesStreetKeyword = foodStreetKeywords.some(keyword => cleanText.includes(keyword));
        
        // Check for cities
        let detectedCity = null;
        if (cleanText.includes('hyderabad')) detectedCity = 'Hyderabad';
        else if (cleanText.includes('mumbai') || cleanText.includes('bombay')) detectedCity = 'Mumbai';
        else if (cleanText.includes('delhi') || cleanText.includes('new delhi')) detectedCity = 'Delhi';
        else if (cleanText.includes('new york') || cleanText.includes('ny') || cleanText.includes('nyc')) detectedCity = 'New York';
        else if (cleanText.includes('tokyo') || cleanText.includes('japan')) detectedCity = 'Tokyo';
        else if (cleanText.includes('paris') || cleanText.includes('france')) detectedCity = 'Paris';

        if (matchesStreetKeyword || detectedCity) {
            let data = null;
            let textReply = "";
            const city = detectedCity || "Hyderabad"; // Fallback to Hyderabad if only "street food" queried

            if (city === 'Hyderabad') {
                data = {
                    streetName: "Sindhi Colony & Charminar Lane",
                    city: "Hyderabad, India",
                    rating: "4.8",
                    costRating: "₹₹ (Pocket Friendly)",
                    gourmetTip: "Charminar lane is best explored after 8 PM for hot mulberry malai. For vegetarian street food varieties, Sindhi Colony takes the crown!",
                    dishes: [
                        { name: "Famous Mulberry Rabdi Malai", emoji: "🍧", desc: "Served cold in earthen pots behind Charminar. Unbelievably rich." },
                        { name: "Patthar Ka Gosht", emoji: "🍖", desc: "Mutton marinated and slow cooked over granite stones at Milan Juice Center." },
                        { name: "Pav Bhaji & Tawa Pulao", emoji: "🍛", desc: "Served sizzling hot at the famous Sardarji Pav Bhaji in Sindhi Colony." },
                        { name: "Golden Irani Chai & Osmania Biscuit", emoji: "☕", desc: "Nimrah Cafe near Charminar is a legendary heritage spot for this pairing." }
                    ]
                };
                textReply = "Hyderabad has one of India's richest culinary heritage mixes. From Mughal biryanis to late-night street food stalls, it is a gourmet paradise. \n\nI recommend visiting **Sindhi Colony** (for heavy North Indian vegetarian snacks) and the busy lanes surrounding **Charminar** (for classic Mughlai & Nizami sweet treats):";
            } else if (city === 'Mumbai') {
                data = {
                    streetName: "Carter Road & Girgaon Chowpatty",
                    city: "Mumbai, India",
                    rating: "4.7",
                    costRating: "₹ (Budget Friendly)",
                    gourmetTip: "Never skip the spicy red garlic chutney in Vada Pav. For Pav Bhaji, ask them to make it 'Double Butter' if you want the absolute local experience!",
                    dishes: [
                        { name: "Legendary Vada Pav", emoji: "🍔", desc: "Deep fried spiced potato dumpling inside a soft bun, coated in dry garlic powder." },
                        { name: "Buttery Pav Bhaji", emoji: "🍛", desc: "Mashed vegetable curry cooked on flat iron griddles, served with buttery toasted buns." },
                        { name: "Pani Puri & Sev Puri", emoji: "🍲", desc: "Crisp puffed puris filled with spicy tamarind water, potatoes, and heaps of chickpea noodles." },
                        { name: "Spiced Keema Ghotala", emoji: "🍳", desc: "Minced spiced mutton cooked with scrambled eggs, served at standard street-side tawa carts." }
                    ]
                };
                textReply = "Mumbai street food is legendary for its speed, simplicity, and unmatched spicy flavors. The city runs on fast bites! \n\nHere are the top locations and iconic street dishes you must check out at **Carter Road, Bandra** and **Girgaon Chowpatty beach**:";
            } else if (city === 'Delhi') {
                data = {
                    streetName: "Chandni Chowk (Gali Paranthe Wali)",
                    city: "Old Delhi, India",
                    rating: "4.9",
                    costRating: "₹ (Super Cheap)",
                    gourmetTip: "Old Delhi streets are extremely narrow. It is highly recommended to travel by cycle rickshaw and carry water. Try visiting before 1 PM to beat the heaviest lunch crowds.",
                    dishes: [
                        { name: "Deep-Fried Stuffed Paranthas", emoji: "🫓", desc: "Pan-fried flatbreads stuffed with cashews, paneer, potatoes, or radishes." },
                        { name: "Crispy Chole Bhature", emoji: "🍛", desc: "Puffy fried bread served with spicy chickpea curry and tangy pickles." },
                        { name: "Creamy Dahi Bhalla", emoji: "🥗", desc: "Soft lentil dumplings soaked in chilled sweet yogurt, mint chutney, and tamarind syrup." },
                        { name: "Giant Hot Rabdi Jalebi", emoji: "🥨", desc: "Golden coils of hot syrup-dripping jalebis topped with thick condensed milk." }
                    ]
                };
                textReply = "If you want to experience the historical core of Indian street food, Old Delhi is the absolute mecca. The recipes here have been handed down through five generations. \n\nHere is your guide to the legendary food street **Gali Paranthe Wali in Chandni Chowk**:";
            } else if (city === 'New York') {
                data = {
                    streetName: "Smorgasburg & Midtown Halal Carts",
                    city: "New York City, USA",
                    rating: "4.6",
                    costRating: "$$ (Moderate)",
                    gourmetTip: "The Halal Guys cart on 53rd & 6th is legendary, but make sure to ask for the white sauce and go easy on the red hot sauce - it's famously spicy!",
                    dishes: [
                        { name: "Chicken Over Rice", emoji: "🍛", desc: "Perfectly seasoned chopped chicken thighs served over yellow rice with iconic white sauce." },
                        { name: "Classic NY Foldable Pizza", emoji: "🍕", desc: "A thin-crust cheese slice folded in half, grabbed from street corners on the run." },
                        { name: "Dirty Water Hot Dog", emoji: "🌭", desc: "Classic NYC pushcart beef hot dog topped with sauerkraut, spicy mustard, and onions." },
                        { name: "Lobster Roll", emoji: "🦞", desc: "Chilled fresh Maine lobster tossed in light mayo on a toasted split-top bun." }
                    ]
                };
                textReply = "New York City's street food is a global melting pot. You can travel the entire world's flavors just by walking down three blocks in Manhattan or Brooklyn. \n\nHere is your NYC street food explorer guide, focused on **Smorgasburg, Brooklyn** and standard **Midtown carts**:";
            } else if (city === 'Tokyo') {
                data = {
                    streetName: "Tsukiji Outer Market & Omoide Yokocho",
                    city: "Tokyo, Japan",
                    rating: "4.8",
                    costRating: "$$ (Moderate)",
                    gourmetTip: "Most food stalls in Tokyo do not allow eating while walking. Eat your snack directly in front of the shop you bought it from, and return trash to their bins.",
                    dishes: [
                        { name: "Giant Octopus Takoyaki", emoji: "🐙", desc: "Savory batter balls filled with octopus pieces, brushed with sweet sauce and dry bonito flakes." },
                        { name: "Charcoal Yakitori skewers", emoji: "🍢", desc: "Grilled chicken skewers glazed with sweet tare sauce, best eaten in cozy alleyways." },
                        { name: "Sweet Fish-Shaped Taiyaki", emoji: "🐟", desc: "Waffle-like fish-shaped pastry stuffed with warm, sweet red bean paste or custard." },
                        { name: "Tamagoyaki (Sweet Omelet)", emoji: "🍳", desc: "Layered Japanese sweet egg omelet served on a wooden stick, cooked right before your eyes." }
                    ]
                };
                textReply = "Tokyo offers some of the cleanest and most visually precise street foods in the world. \n\nHere is my compiled guide for the famous stalls at the **Tsukiji Outer Market** (for fresh seafood skewers) and **Omoide Yokocho in Shinjuku** (for grill alleys):";
            } else {
                data = {
                    streetName: "Rue des Rosiers & Latin Quarter",
                    city: "Paris, France",
                    rating: "4.7",
                    costRating: "€€ (Moderate)",
                    gourmetTip: "The line at L'As du Fallafel moves surprisingly fast. Take your wrap to the nearby public courtyard of Maison de Victor Hugo to eat it peacefully.",
                    dishes: [
                        { name: "Legendary L'As Falafel", emoji: "🥙", desc: "Warm pita stuffed with crunchy chickpea falafels, red cabbage, eggplants, and tahini." },
                        { name: "Sweet & Savory Crepes", emoji: "🥞", desc: "Thin crepes spread with Nutella/banana or filled with melted Gruyere cheese and ham." },
                        { name: "Croque Monsieur", emoji: "🍞", desc: "Toasted street-side ham and cheese sandwich baked under a bubbly layer of béchamel." },
                        { name: "Assorted Colorful Macarons", emoji: "🍬", desc: "Light, airy almond meringue cookies filled with chocolate ganache or fruit jam." }
                    ]
                };
                textReply = "Paris is famous for fine dining, but its street-side bakeries and market alleyways host some of the most romantic quick bites in Europe. \n\nHere is a list of must-try Parisian street foods around the historic **Marais District (Rue des Rosiers)**:";
            }

            return {
                sender: 'bot',
                text: textReply,
                specialType: 'street-food',
                specialData: data,
                timestamp: new Date().toISOString()
            };
        }

        // 3. DIET PLAN SCHEDULE CASE
        const dietPlanKeywords = ['diet plan', 'diet schedule', 'meal schedule', 'weight loss plan', 'muscle gain plan', 'keto', 'vegan diet'];
        const matchesDietKeyword = dietPlanKeywords.some(keyword => cleanText.includes(keyword));

        if (matchesDietKeyword) {
            let focus = "Balanced Weight Management";
            let cals = 2000;
            let planName = "7-Day Active Lifestyle Meal Plan";

            if (cleanText.includes('loss') || cleanText.includes('lose')) {
                focus = "Fat Loss & Caloric Deficit";
                cals = 1600;
                planName = "7-Day Shred & Weight Loss Plan";
            } else if (cleanText.includes('gain') || cleanText.includes('muscle') || cleanText.includes('bulk')) {
                focus = "Muscle Hypertrophy & Protein Focus";
                cals = 2500;
                planName = "7-Day Clean Bulk & Muscle Gain Schedule";
            } else if (cleanText.includes('keto')) {
                focus = "Ketosis: Low Carb / High Healthy Fat";
                cals = 1800;
                planName = "7-Day Ketogenic Fat-Burning Plan";
            }

            const dietData = {
                planName: planName,
                targetCalories: cals,
                focus: focus,
                days: {
                    monday: {
                        breakfast: { title: "Spiced Oatmeal Bowl", items: "1 cup rolled oats, chia seeds, sliced bananas, almond milk", calories: 420 },
                        lunch: { title: "Mediterranean Quinoa Salad", items: "Quinoa, feta cheese, cucumbers, cherry tomatoes, olive oil dressing", calories: 550 },
                        snack: { title: "Greek Yogurt & Almonds", items: "150g low-fat greek yogurt, honey, a handful of almonds", calories: 250 },
                        dinner: { title: "Baked Salmon & Broccoli", items: "150g baked salmon fillet, garlic sautéed broccoli, half sweet potato", calories: 580 }
                    },
                    tuesday: {
                        breakfast: { title: "Spinach Egg Omelette", items: "3 whole eggs, baby spinach, cheddar cheese, 1 slice whole wheat toast", calories: 450 },
                        lunch: { title: "Tofu Vegetable Stir Fry", items: "Extra firm tofu, broccoli, bell peppers, soy sauce glaze, brown rice", calories: 600 },
                        snack: { title: "Apple & Peanut Butter", items: "1 medium organic apple, 2 tbsp natural unsalted peanut butter", calories: 280 },
                        dinner: { title: "Grilled Chicken Salad", items: "150g chicken breast, mixed greens, avocado slices, lemon vinaigrette", calories: 470 }
                    },
                    wednesday: {
                        breakfast: { title: "Fruit & Protein Smoothie", items: "Whey protein isolate, frozen strawberries, spinach, oat milk", calories: 380 },
                        lunch: { title: "Whole Wheat Turkey Wrap", items: "Turkey breast slices, spinach, hummus, whole wheat tortilla wrap", calories: 520 },
                        snack: { title: "Cottage Cheese & Berries", items: "1 cup cottage cheese, fresh blueberries", calories: 200 },
                        dinner: { title: "Baked Cod & Asparagus", items: "180g Atlantic cod, grilled asparagus, jasmine rice", calories: 500 }
                    },
                    thursday: {
                        breakfast: { title: "Avocado & Egg Toast", items: "1 slice rye bread, half avocado, 2 poached eggs", calories: 410 },
                        lunch: { title: "Lentil Soup & Side Salad", items: "Brown lentil soup, mixed greens, vinaigrette dressing", calories: 480 },
                        snack: { title: "Mixed Berry Cup", items: "Raspberries, blackberries, strawberries, walnuts", calories: 220 },
                        dinner: { title: "Lean Beef & Sweet Potato", items: "150g sirloin steak, baked sweet potato, steamed green beans", calories: 610 }
                    },
                    friday: {
                        breakfast: { title: "Chia Seed Pudding", items: "Chia seeds, coconut milk, maple syrup, mango cubes", calories: 350 },
                        lunch: { title: "Chickpea Buddha Bowl", items: "Garbanzo beans, roasted carrots, kale, tahini drizzle", calories: 580 },
                        snack: { title: "Celery & Hummus", items: "Raw celery sticks, 3 tbsp garlic hummus", calories: 150 },
                        dinner: { title: "Turkey Meatballs & Pasta", items: "Baked turkey meatballs, chickpea pasta, low sodium marinara", calories: 620 }
                    },
                    saturday: {
                        breakfast: { title: "Protein Pancakes", items: "Oat-based protein pancake mix, sugar-free syrup, raspberries", calories: 440 },
                        lunch: { title: "Tuna Salad Salad", items: "1 can albacore tuna, light mayo, celery, lettuce, red onion", calories: 490 },
                        snack: { title: "Edamame Beans", items: "Steamed edamame pods sprinkled with sea salt", calories: 180 },
                        dinner: { title: "Vegetarian Chili Bowl", items: "Red kidney beans, black beans, crushed tomatoes, sour cream dollop", calories: 540 }
                    },
                    sunday: {
                        breakfast: { title: "Scrambled Eggs & Avocado", items: "3 scrambled eggs, fresh avocado slices, salsa", calories: 430 },
                        lunch: { title: "Pesto Chicken Salad", items: "Grilled chicken, basil pesto, cherry tomatoes, quinoa base", calories: 610 },
                        snack: { title: "Mixed Nuts Pack", items: "Raw cashews, almonds, walnuts", calories: 200 },
                        dinner: { title: "Lemon Baked Salmon", items: "150g salmon fillet, herb roasted cauliflower, quinoa", calories: 560 }
                    }
                }
            };

            return {
                sender: 'bot',
                text: `I have generated a customized **7-Day Food Schedule** matching your nutritional goal: **${focus}** (Targeting roughly **${cals} Kcal/day**). \n\nYou can click on the tabs below to switch days and view your detailed meals:`,
                specialType: 'diet-plan',
                specialData: dietData,
                timestamp: new Date().toISOString()
            };
        }

        // 4. RECIPE GENERATOR CASE
        const recipeKeywords = ['recipe', 'how to make', 'how to cook', 'ingredients for', 'cook a'];
        const matchesRecipeKeyword = recipeKeywords.some(keyword => cleanText.includes(keyword));

        if (matchesRecipeKeyword) {
            let recipeName = "Healthy Chicken & Broccoli Stir Fry";
            let difficulty = "Easy";
            let type = "High-Protein / Low-Carb";
            let time = "15 Mins";
            let cals = 380;
            let p = 35;
            let c = 12;
            let f = 14;
            let ingredients = [
                "150g Chicken Breast (sliced thin)",
                "1.5 cups Broccoli Florets",
                "1 tbsp Soy Sauce (Low Sodium)",
                "1 tsp Sesame Oil",
                "1 clove Garlic (minced)",
                "0.5 tsp Ginger (grated)",
                "1 tsp Sesame Seeds (for garnish)"
            ];
            let steps = [
                "Heat sesame oil in a non-stick skillet or wok over medium-high heat.",
                "Add minced garlic and grated ginger, sauté for 30 seconds until fragrant.",
                "Add sliced chicken breast. Cook for 5-6 minutes until chicken turns white throughout.",
                "Toss in the broccoli florets and pour low-sodium soy sauce. Stir well.",
                "Cover the skillet and let the broccoli steam for 3 minutes until tender-crisp.",
                "Garnish with toasted sesame seeds and serve warm!"
            ];

            if (cleanText.includes('pasta') || cleanText.includes('spaghetti')) {
                recipeName = "15-Minute Garlic Spinach Pasta";
                difficulty = "Beginner";
                type = "Vegetarian";
                time = "15 Mins";
                cals = 480;
                p = 12;
                c = 68;
                f = 16;
                ingredients = [
                    "80g Whole Wheat Spaghetti",
                    "2 cups Fresh Baby Spinach",
                    "2 tbsp Olive Oil (Extra Virgin)",
                    "3 Garlic cloves (sliced thin)",
                    "1/4 tsp Red Pepper Flakes",
                    "1 tbsp Parmesan Cheese (grated)"
                ];
                steps = [
                    "Bring a large pot of salted water to a boil. Cook spaghetti for 9 minutes (al dente).",
                    "While pasta cooks, heat olive oil in a pan over medium-low heat.",
                    "Add thin garlic slices and red pepper flakes. Sauté slowly until garlic is lightly golden.",
                    "Drain pasta, reserving 2 tablespoons of starchy pasta water.",
                    "Add hot pasta, reserved water, and fresh spinach to the pan. Toss until spinach wilts.",
                    "Plate immediately, topping with freshly grated Parmesan cheese."
                ];
            } else if (cleanText.includes('salad') || cleanText.includes('healthy salad')) {
                recipeName = "Mediterranean Chickpea & Avocado Salad";
                difficulty = "Super Easy";
                type = "Vegan / Gluten-Free";
                time = "10 Mins";
                cals = 350;
                p = 10;
                c = 34;
                f = 18;
                ingredients = [
                    "1 can (400g) Chickpeas (drained and rinsed)",
                    "1 ripe Avocado (cubed)",
                    "1 Cucumber (diced)",
                    "1 cup Cherry Tomatoes (halved)",
                    "1 tbsp Lemon Juice (freshly squeezed)",
                    "1 tbsp Extra Virgin Olive Oil",
                    "Pinch of Salt and Black Pepper"
                ];
                steps = [
                    "In a large mixing bowl, combine rinsed chickpeas, diced cucumber, and halved tomatoes.",
                    "Gently fold in the cubed avocado to avoid mashing it.",
                    "Whisk lemon juice, olive oil, salt, and pepper in a small bowl.",
                    "Drizzle the dressing over the salad and toss gently to combine.",
                    "Let it sit for 5 minutes before serving so the chickpeas absorb the lemon and olive oil."
                ];
            }

            const recipeData = {
                recipeName: recipeName,
                difficulty: difficulty,
                type: type,
                totalTime: time,
                calories: cals,
                protein: p,
                carbs: c,
                fat: f,
                ingredients: ingredients,
                steps: steps
            };

            return {
                sender: 'bot',
                text: `Here is a quick, nutrient-packed recipe for **${recipeName}** that I've custom compiled. You can check off the ingredients as you pull them from your pantry:`,
                specialType: 'recipe',
                specialData: recipeData,
                timestamp: new Date().toISOString()
            };
        }

        // 5. FOOD MACRO DESCRIPTION TEXT ANALYSIS
        const containsFoodKeyword = ['egg', 'avocado', 'salad', 'apple', 'banana', 'chicken', 'rice', 'bread', 'pizza', 'burger', 'toast', 'milk', 'cheese'].some(w => cleanText.includes(w));
        
        if (containsFoodKeyword && (cleanText.includes('calorie') || cleanText.includes('macro') || cleanText.includes('analyze') || cleanText.includes('what is the nutrition'))) {
            // Simulated parsing of text inputs for food analysis
            let title = "Custom Meal Tracker";
            let cals = 320;
            let p = 12;
            let c = 40;
            let f = 10;

            if (cleanText.includes('pizza')) {
                title = "2 Slices of Cheese Pizza";
                cals = 540;
                p = 24;
                c = 64;
                f = 20;
            } else if (cleanText.includes('egg') && cleanText.includes('banana')) {
                title = "2 Hard Boiled Eggs & 1 Banana";
                cals = 250;
                p = 14;
                c = 28;
                f = 10;
            } else if (cleanText.includes('chicken') && cleanText.includes('rice')) {
                title = "Grilled Chicken Breast with Jasmine Rice";
                cals = 480;
                p = 38;
                c = 52;
                f = 8;
            }

            const data = {
                title: title,
                calories: cals,
                protein: p,
                carbs: c,
                fat: f,
                dietClass: "Normal Calorie Portion",
                sugar: "6g",
                fiber: "3g",
                sodium: "450mg"
            };

            return {
                sender: 'bot',
                text: `I've analyzed the meal description you entered: **"${userText}"**. Here is the estimated nutritional breakdown:`,
                specialType: 'macro',
                specialData: data,
                timestamp: new Date().toISOString()
            };
        }

        // 6. DEFAULT GENERAL CHAT
        let fallbackText = "Hello! I am GourmetGuide, currently running in **Demo Simulator Mode**. \n\nTo unlock my full conversational powers and let me answer *any* custom questions: \n1. Click the **Gemini API Key** button in the sidebar footer and save your key. \n2. Or set the `GEMINI_API_KEY` in the server's `.env` file and restart the server.\n\nIn the meantime, feel free to try one of these interactive simulations: \n* **Describe what you ate** (e.g., '2 hard boiled eggs & 1 banana') to get a calorie/macro breakdown.\n* **Name any city** (e.g., 'Hyderabad', 'Mumbai', 'Delhi', 'New York', 'Tokyo') to find famous food street stalls.\n* **Request a diet plan** (e.g., 'weight loss plan' or 'clean bulk') to get a visual weekly table.\n* **Ask for a quick recipe** (e.g., 'garlic spinach pasta' or 'healthy salad') to follow a step-by-step checklist.";
        
        if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey')) {
            fallbackText = "Hello there, gourmet! 👋 Ready to explore delicious recipes, search famous food streets, or track your daily food calories? \n\n*Note: I am in Demo Mode. To talk about anything else, please configure your Gemini API Key in the settings panel.*";
        } else if (cleanText.includes('thank') || cleanText.includes('thanks')) {
            fallbackText = "You're very welcome! I'm always here to help you achieve your health and culinary goals. Eat well, stay healthy! 🥑🥗";
        } else if (cleanText.includes('who are you') || cleanText.includes('what are you')) {
            fallbackText = "I am **GourmetGuide AI**, your virtual dietitian, nutritionist, and culinary advisor. \n\n*I am currently operating in Demo Mode. Connect your Gemini API key to activate my fully interactive backend!*";
        }

        return {
            sender: 'bot',
            text: fallbackText,
            timestamp: new Date().toISOString()
        };
    }

    // ----------------------------------------------------
    // Initial Render Actions
    // ----------------------------------------------------
    renderChatHistory();
    renderActiveChat();
});
