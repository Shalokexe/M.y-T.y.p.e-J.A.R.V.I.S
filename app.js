// Jarvis AI Assistant - Main Application Logic
class JarvisAI {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.settings = {
            voiceEnabled: true,
            speechEnabled: true,
            animationsEnabled: true,
            volumeLevel: 80
        };
        this.systemData = {
            systemInfo: {
                status: "Online",
                cpu: "45%",
                memory: "2.1GB / 8GB",
                network: "Connected",
                uptime: "2h 15m"
            },
            weather: {
                location: "New York",
                temperature: "72°F",
                condition: "Clear",
                humidity: "65%"
            }
        };
        this.aiResponses = [
            "Good evening. Jarvis AI system is now online and ready to assist you.",
            "All systems are functioning within normal parameters.",
            "How may I be of service today?"
        ];
        this.responseIndex = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeParticles();
        this.startBootSequence();
        this.setupVoiceRecognition();
        this.updateClock();
        this.simulateSystemMetrics();
        this.loadSettings();
        this.initializeSystemData();
    }

    initializeSystemData() {
        // Initialize system data display
        const elements = {
            systemStatus: this.systemData.systemInfo.status,
            cpuUsage: this.systemData.systemInfo.cpu,
            memoryUsage: this.systemData.systemInfo.memory,
            networkStatus: this.systemData.systemInfo.network,
            uptime: this.systemData.systemInfo.uptime,
            location: this.systemData.weather.location,
            temperature: this.systemData.weather.temperature,
            condition: this.systemData.weather.condition,
            humidity: this.systemData.weather.humidity
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    setupEventListeners() {
        // Microphone button
        const micBtn = document.getElementById('micBtn');
        if (micBtn) {
            micBtn.addEventListener('click', () => this.toggleVoiceRecognition());
        }

        // Send button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.handleTextInput());
        }

        // Text input
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleTextInput();
                }
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        // Power button
        const powerBtn = document.getElementById('powerBtn');
        if (powerBtn) {
            powerBtn.addEventListener('click', () => this.handlePowerOff());
        }

        // Settings modal
        const closeSettings = document.getElementById('closeSettings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => this.closeSettings());
        }

        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal || e.target.classList.contains('modal-overlay')) {
                    this.closeSettings();
                }
            });
        }

        // Settings controls
        const settingsControls = [
            { id: 'voiceEnabled', property: 'voiceEnabled' },
            { id: 'speechEnabled', property: 'speechEnabled' },
            { id: 'animationsEnabled', property: 'animationsEnabled' },
            { id: 'volumeLevel', property: 'volumeLevel' }
        ];

        settingsControls.forEach(({ id, property }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(element.type === 'range' ? 'input' : 'change', (e) => {
                    this.settings[property] = element.type === 'checkbox' ? e.target.checked : e.target.value;
                    this.saveSettings();
                    
                    if (property === 'animationsEnabled') {
                        this.toggleAnimations(e.target.checked);
                    }
                });
            }
        });

        // Add hover effects to control buttons
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (this.settings.animationsEnabled) {
                    btn.style.transform = 'scale(1.05)';
                    btn.style.boxShadow = '0 0 30px rgba(0, 191, 255, 0.8)';
                }
            });
            btn.addEventListener('mouseleave', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.transform = 'scale(1)';
                    btn.style.boxShadow = '';
                }
            });
        });
    }

    startBootSequence() {
        // Show boot screen initially
        const bootScreen = document.getElementById('bootScreen');
        const dashboard = document.getElementById('dashboard');
        
        // Update boot status messages
        const bootStatus = document.querySelector('.boot-status');
        const statusMessages = [
            'Initializing systems...',
            'Loading AI protocols...',
            'Establishing connections...',
            'Centering HUD interface...',
            'System online'
        ];

        let messageIndex = 0;
        const updateStatus = () => {
            if (messageIndex < statusMessages.length && bootStatus) {
                bootStatus.textContent = statusMessages[messageIndex];
                messageIndex++;
                setTimeout(updateStatus, 600);
            }
        };

        setTimeout(updateStatus, 1000);

        // Hide boot screen and show dashboard after animation
        setTimeout(() => {
            if (bootScreen) bootScreen.style.display = 'none';
            if (dashboard) dashboard.classList.remove('hidden');
            this.playInitialMessage();
        }, 3000);
    }

    playInitialMessage() {
        setTimeout(() => {
            this.addAIMessage("Good evening. Jarvis AI system is now online and ready to assist you.");
            if (this.settings.speechEnabled) {
                this.speak("Good evening. Jarvis AI system is now online and ready to assist you.");
            }
        }, 1000);
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                console.log('Voice recognition started');
                this.isListening = true;
                this.updateMicStatus('LISTENING');
                this.showVoiceWaveform();
                const micBtn = document.getElementById('micBtn');
                if (micBtn) micBtn.classList.add('active');
            };

            this.recognition.onresult = (event) => {
                const command = event.results[0][0].transcript;
                console.log('Voice command received:', command);
                this.handleVoiceCommand(command);
            };

            this.recognition.onend = () => {
                console.log('Voice recognition ended');
                this.isListening = false;
                this.updateMicStatus('READY');
                this.hideVoiceWaveform();
                const micBtn = document.getElementById('micBtn');
                if (micBtn) micBtn.classList.remove('active');
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.updateMicStatus('ERROR');
                this.hideVoiceWaveform();
                const micBtn = document.getElementById('micBtn');
                if (micBtn) micBtn.classList.remove('active');
                
                this.addAIMessage("Voice recognition error. Please try again or use text input.");
            };
        } else {
            console.log('Speech recognition not supported');
            this.addAIMessage("Voice recognition is not supported in this browser. Please use text input.");
        }
    }

    toggleVoiceRecognition() {
        if (!this.settings.voiceEnabled) {
            this.addAIMessage("Voice recognition is disabled in settings.");
            return;
        }

        if (!this.recognition) {
            this.addAIMessage("Voice recognition is not available in this browser.");
            return;
        }

        if (this.isListening) {
            console.log('Stopping voice recognition');
            this.recognition.stop();
        } else {
            console.log('Starting voice recognition');
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Failed to start voice recognition:', error);
                this.addAIMessage("Failed to start voice recognition. Please try again.");
            }
        }
    }

    handleVoiceCommand(command) {
        this.addAIMessage(`Voice command: "${command}"`);
        this.processCommand(command);
    }

    handleTextInput() {
        const textInput = document.getElementById('textInput');
        if (!textInput) return;
        
        const command = textInput.value.trim();
        console.log('Text input received:', command);
        
        if (command) {
            this.addAIMessage(`You: ${command}`);
            textInput.value = '';
            this.processCommand(command);
        }
    }

    processCommand(command) {
        const lowerCommand = command.toLowerCase();
        let response = '';

        console.log('Processing command:', command);

        // Show thinking animation
        this.showThinkingAnimation();

        setTimeout(() => {
            if (lowerCommand.includes('weather')) {
                response = `Current weather in ${this.systemData.weather.location}: ${this.systemData.weather.temperature}, ${this.systemData.weather.condition}. Humidity is at ${this.systemData.weather.humidity}.`;
            } else if (lowerCommand.includes('status') || lowerCommand.includes('system')) {
                response = `System status: ${this.systemData.systemInfo.status}. CPU usage at ${this.systemData.systemInfo.cpu}, Memory: ${this.systemData.systemInfo.memory}. Network is ${this.systemData.systemInfo.network}.`;
            } else if (lowerCommand.includes('time') || lowerCommand.includes('date')) {
                const now = new Date();
                response = `Current time is ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.`;
            } else if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
                response = "Hello! I am Jarvis, your AI assistant. How may I help you today?";
            } else if (lowerCommand.includes('center') || lowerCommand.includes('hud')) {
                response = "The HUD is perfectly centered and operating at optimal parameters. All ring systems are aligned to the center point.";
            } else if (lowerCommand.includes('joke')) {
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
                    "Why don't programmers like nature? It has too many bugs.",
                    "How do you comfort a JavaScript bug? You console it!",
                    "Why do Java developers wear glasses? Because they don't C#!"
                ];
                response = jokes[Math.floor(Math.random() * jokes.length)];
            } else if (lowerCommand.includes('open')) {
                response = "I would open that application for you, but I'm currently running in demonstration mode. In a full implementation, I could interface with your system to launch applications.";
            } else if (lowerCommand.includes('search')) {
                response = "I would perform a web search for you, but I'm currently running in demonstration mode. In a full implementation, I could search the internet and provide results.";
            } else {
                const responses = [
                    "I understand your request. In a full implementation, I would process this command through advanced AI algorithms.",
                    "Interesting query. I'm analyzing the information with my current capabilities.",
                    "Command acknowledged. I'm working on processing your request.",
                    "That's a fascinating question. Let me provide what information I can.",
                    "I'm here to help. While this is a demonstration, I'm designed to handle complex requests like yours."
                ];
                response = responses[Math.floor(Math.random() * responses.length)];
            }

            this.hideThinkingAnimation();
            this.addAIMessage(`JARVIS: ${response}`);
            
            if (this.settings.speechEnabled) {
                this.speak(response);
            }
        }, 1500);
    }

    addAIMessage(message) {
        const aiOutput = document.getElementById('aiOutput');
        if (!aiOutput) {
            console.error('AI output element not found');
            return;
        }

        console.log('Adding AI message:', message);

        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message';
        
        messageElement.innerHTML = `
            <div class="message-indicator"></div>
            <span></span>
        `;

        aiOutput.appendChild(messageElement);
        
        // Typing animation
        const span = messageElement.querySelector('span');
        if (span) {
            this.typeWriter(span, message, 30);
        }

        // Scroll to bottom
        aiOutput.scrollTop = aiOutput.scrollHeight;
    }

    typeWriter(element, text, speed) {
        let i = 0;
        element.textContent = '';
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }

    showThinkingAnimation() {
        this.updateMicStatus('PROCESSING');
        const core = document.querySelector('.hud-core');
        if (core) {
            core.style.animation = 'corePulse 0.5s ease-in-out infinite alternate';
        }
    }

    hideThinkingAnimation() {
        this.updateMicStatus('READY');
        const core = document.querySelector('.hud-core');
        if (core) {
            core.style.animation = 'corePulse 2s ease-in-out infinite alternate';
        }
    }

    speak(text) {
        if (!this.settings.speechEnabled) return;

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = this.settings.volumeLevel / 100;
        
        // Try to use a more robotic voice if available
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Male') || voice.name.includes('Daniel') || voice.name.includes('Alex')
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        this.synthesis.speak(utterance);
    }

    updateMicStatus(status) {
        const micStatus = document.getElementById('micStatus');
        if (micStatus) {
            micStatus.textContent = status;
        }
    }

    showVoiceWaveform() {
        const waveform = document.getElementById('voiceWaveform');
        if (waveform) {
            waveform.classList.remove('hidden');
            console.log('Voice waveform shown');
        }
    }

    hideVoiceWaveform() {
        const waveform = document.getElementById('voiceWaveform');
        if (waveform) {
            waveform.classList.add('hidden');
            console.log('Voice waveform hidden');
        }
    }

    updateClock() {
        const updateTime = () => {
            const now = new Date();
            const timeElement = document.getElementById('currentTime');
            const dateElement = document.getElementById('currentDate');
            
            if (timeElement) {
                timeElement.textContent = now.toLocaleTimeString();
            }
            if (dateElement) {
                dateElement.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        };

        updateTime();
        setInterval(updateTime, 1000);
    }

    simulateSystemMetrics() {
        const updateMetrics = () => {
            // Simulate changing CPU usage
            const cpu = Math.floor(Math.random() * 30) + 30; // 30-60%
            const cpuElement = document.getElementById('cpuUsage');
            if (cpuElement) {
                cpuElement.textContent = `${cpu}%`;
            }

            // Simulate memory changes
            const memory = (Math.random() * 0.5 + 2.0).toFixed(1); // 2.0-2.5GB
            const memoryElement = document.getElementById('memoryUsage');
            if (memoryElement) {
                memoryElement.textContent = `${memory}GB / 8GB`;
            }

            // Update uptime
            const startTime = Date.now() - (2 * 60 * 60 * 1000 + 15 * 60 * 1000); // 2h 15m ago
            const uptime = Date.now() - startTime;
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            const uptimeElement = document.getElementById('uptime');
            if (uptimeElement) {
                uptimeElement.textContent = `${hours}h ${minutes}m`;
            }
        };

        updateMetrics();
        setInterval(updateMetrics, 5000);
    }

    initializeParticles() {
        const canvas = document.getElementById('particlesCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const particles = [];
        const particleCount = 50;

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }

        const animateParticles = () => {
            if (!this.settings.animationsEnabled) {
                requestAnimationFrame(animateParticles);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.x += particle.speedX;
                particle.y += particle.speedY;

                // Wrap around edges
                if (particle.x < 0) particle.x = canvas.width;
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = canvas.height;
                if (particle.y > canvas.height) particle.y = 0;

                // Draw particle
                ctx.save();
                ctx.globalAlpha = particle.opacity;
                ctx.fillStyle = '#00BFFF';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00BFFF';
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            requestAnimationFrame(animateParticles);
        };

        animateParticles();
    }

    openSettings() {
        console.log('Opening settings modal');
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('hidden');
            console.log('Settings modal opened');
            
            // Update settings values
            const settingsInputs = {
                voiceEnabled: this.settings.voiceEnabled,
                speechEnabled: this.settings.speechEnabled,
                animationsEnabled: this.settings.animationsEnabled,
                volumeLevel: this.settings.volumeLevel
            };
            
            Object.entries(settingsInputs).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            });
        } else {
            console.error('Settings modal not found');
        }
    }

    closeSettings() {
        console.log('Closing settings modal');
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('hidden');
            console.log('Settings modal closed');
        }
    }

    saveSettings() {
        console.log('Settings saved:', this.settings);
    }

    loadSettings() {
        console.log('Settings loaded:', this.settings);
    }

    toggleAnimations(enabled) {
        const style = document.createElement('style');
        if (!enabled) {
            style.textContent = `
                *, *::before, *::after {
                    animation-duration: 0s !important;
                    animation-delay: 0s !important;
                    transition-duration: 0s !important;
                }
            `;
        }
        style.id = 'animation-toggle';
        
        const existing = document.getElementById('animation-toggle');
        if (existing) {
            existing.remove();
        }
        
        if (!enabled) {
            document.head.appendChild(style);
        }
        
        console.log('Animations toggled:', enabled);
    }

    handlePowerOff() {
        const confirmed = confirm('Are you sure you want to power off the Jarvis system?');
        if (confirmed) {
            this.addAIMessage("JARVIS: Powering down system. Goodbye.");
            
            setTimeout(() => {
                document.body.style.transition = 'opacity 2s ease-out';
                document.body.style.opacity = '0';
                
                setTimeout(() => {
                    document.body.innerHTML = `
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            background: #000;
                            color: #00BFFF;
                            font-family: monospace;
                            font-size: 24px;
                            text-align: center;
                        ">
                            <div>
                                <div style="margin-bottom: 20px;">JARVIS SYSTEM</div>
                                <div style="font-size: 16px; opacity: 0.7;">OFFLINE</div>
                                <div style="font-size: 12px; margin-top: 20px; opacity: 0.5;">
                                    Refresh page to restart system
                                </div>
                            </div>
                        </div>
                    `;
                }, 2000);
            }, 1000);
        }
    }
}

// Initialize the Jarvis AI system when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Jarvis AI...');
    window.jarvisAI = new JarvisAI();
});

// Add some additional interactive features
document.addEventListener('DOMContentLoaded', () => {
    // Add click sound effect to buttons
    document.querySelectorAll('button, .control-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
        });
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'm':
                    e.preventDefault();
                    const micBtn = document.getElementById('micBtn');
                    if (micBtn) micBtn.click();
                    break;
                case ',':
                    e.preventDefault();
                    const settingsBtn = document.getElementById('settingsBtn');
                    if (settingsBtn) settingsBtn.click();
                    break;
                case 'Enter':
                    if (e.shiftKey) {
                        e.preventDefault();
                        const sendBtn = document.getElementById('sendBtn');
                        if (sendBtn) sendBtn.click();
                    }
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            const closeSettings = document.getElementById('closeSettings');
            if (closeSettings) closeSettings.click();
        }
    });

    // Add dynamic lighting effect based on mouse position
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    });

    // Add HUD interaction effects
    const hudCore = document.querySelector('.hud-core');
    if (hudCore) {
        hudCore.addEventListener('click', () => {
            const jarvisAI = window.jarvisAI;
            if (jarvisAI) {
                jarvisAI.addAIMessage("HUD core activated. All systems nominal and perfectly centered.");
                if (jarvisAI.settings.speechEnabled) {
                    jarvisAI.speak("HUD core activated. All systems nominal and perfectly centered.");
                }
            }
        });
    }
});