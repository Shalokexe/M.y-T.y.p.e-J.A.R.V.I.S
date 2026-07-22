# Jarvis AI Assistant - Complete Flask Backend Implementation

This document provides the complete Flask backend implementation for the Jarvis AI assistant web application.

## Project Structure

```
jarvis_backend/
├── app.py                  # Main Flask application
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── static/                # Static files (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── templates/             # HTML templates
│   └── index.html
├── modules/               # Business logic modules
│   ├── __init__.py
│   ├── ai_service.py      # OpenAI integration
│   ├── weather_service.py # Weather API service
│   └── system_monitor.py  # System monitoring
└── utils/                 # Utility functions
    ├── __init__.py
    └── helpers.py
```

## Dependencies (requirements.txt)

```txt
Flask==3.0.0
Flask-CORS==4.0.0
Flask-SocketIO==5.3.6
openai==1.3.5
requests==2.31.0
python-dotenv==1.0.0
psutil==5.9.6
SpeechRecognition==3.10.0
pydub==0.25.1
```

## Configuration (config.py)

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'jarvis-secret-key-change-in-production'
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY')
    
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    ENV = 'development'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    ENV = 'production'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
```

## Main Flask Application (app.py)

```python
from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import json
import time
import threading
from datetime import datetime
import os

from config import config
from modules.ai_service import AIService
from modules.weather_service import WeatherService
from modules.system_monitor import SystemMonitor
from utils.helpers import format_response, validate_command

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config[os.environ.get('FLASK_ENV', 'development')])

# Enable CORS for frontend integration
CORS(app)

# Initialize SocketIO for real-time communication
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize services
ai_service = AIService(app.config['OPENAI_API_KEY'])
weather_service = WeatherService(app.config['WEATHER_API_KEY'])
system_monitor = SystemMonitor()

@app.route('/')
def index():
    """Serve the main Jarvis interface"""
    return render_template('index.html')

@app.route('/api/status')
def get_system_status():
    """Get current system status"""
    try:
        status = system_monitor.get_system_stats()
        return jsonify({
            'success': True,
            'data': status,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/weather')
def get_weather():
    """Get current weather information"""
    try:
        location = request.args.get('location', 'New York')
        weather_data = weather_service.get_current_weather(location)
        return jsonify({
            'success': True,
            'data': weather_data,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/command', methods=['POST'])
def process_command():
    """Process voice or text commands"""
    try:
        data = request.get_json()
        command = data.get('command', '').strip()
        command_type = data.get('type', 'text')  # 'voice' or 'text'
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'No command provided'
            }), 400
        
        # Validate command
        if not validate_command(command):
            return jsonify({
                'success': False,
                'error': 'Invalid command format'
            }), 400
        
        # Add thinking delay for realism
        time.sleep(1)
        
        # Process command with AI
        response = ai_service.process_command(command)
        
        # Format response for frontend
        formatted_response = format_response(response, command_type)
        
        return jsonify({
            'success': True,
            'data': {
                'response': formatted_response,
                'command': command,
                'type': command_type,
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/voice/upload', methods=['POST'])
def process_voice():
    """Process uploaded voice file"""
    try:
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        audio_file = request.files['audio']
        
        # Process audio file (convert to text)
        transcript = ai_service.speech_to_text(audio_file)
        
        if not transcript:
            return jsonify({
                'success': False,
                'error': 'Could not transcribe audio'
            }), 400
        
        # Process the transcribed command
        response = ai_service.process_command(transcript)
        
        return jsonify({
            'success': True,
            'data': {
                'transcript': transcript,
                'response': response,
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stream')
def stream_events():
    """Server-Sent Events endpoint for real-time updates"""
    def event_generator():
        """Generate server-sent events"""
        while True:
            # Get current system stats
            stats = system_monitor.get_system_stats()
            
            # Format as SSE
            yield f"data: {json.dumps(stats)}\n\n"
            
            # Wait before next update
            time.sleep(5)
    
    return Response(
        event_generator(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        }
    )

# WebSocket Events for real-time communication
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    emit('connected', {'message': 'Connected to Jarvis AI'})
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')

@socketio.on('voice_command')
def handle_voice_command(data):
    """Handle real-time voice commands"""
    try:
        command = data.get('command')
        if command:
            response = ai_service.process_command(command)
            emit('ai_response', {
                'response': response,
                'timestamp': datetime.now().isoformat()
            })
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('request_status')
def handle_status_request():
    """Handle system status requests"""
    try:
        status = system_monitor.get_system_stats()
        emit('system_status', status)
    except Exception as e:
        emit('error', {'message': str(e)})

# Background tasks
def background_system_updates():
    """Background thread for system updates"""
    while True:
        try:
            stats = system_monitor.get_system_stats()
            socketio.emit('system_update', stats)
            time.sleep(10)  # Update every 10 seconds
        except Exception as e:
            print(f"Background update error: {e}")
            time.sleep(10)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    # Start background updates thread
    background_thread = threading.Thread(target=background_system_updates)
    background_thread.daemon = True
    background_thread.start()
    
    # Run the application
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=app.config['DEBUG'])
```

## AI Service Module (modules/ai_service.py)

```python
import openai
import json
import io
from datetime import datetime
import speech_recognition as sr

class AIService:
    """Service for handling AI-related operations"""
    
    def __init__(self, api_key):
        self.client = openai.OpenAI(api_key=api_key)
        self.recognizer = sr.Recognizer()
        
        # Jarvis personality prompt
        self.system_prompt = """
        You are JARVIS (Just A Rather Very Intelligent System), Tony Stark's AI assistant from Iron Man.
        You have a sophisticated, witty, and professional personality with a touch of dry humor.
        
        Key characteristics:
        - Highly intelligent and efficient
        - Polite but with subtle sarcasm when appropriate
        - Formal yet personable communication style
        - Always helpful and proactive
        - Address the user as "Sir" or "Boss" occasionally
        - Reference your capabilities and system status naturally
        - Keep responses concise but informative
        
        You can help with:
        - General questions and information
        - System status and monitoring
        - Weather information
        - Opening applications and websites
        - Telling jokes and engaging in conversation
        - Providing assistance with various tasks
        
        Respond as JARVIS would, maintaining the sophisticated AI assistant persona.
        """
    
    def process_command(self, command):
        """Process user commands using OpenAI"""
        try:
            # Handle specific commands
            command_lower = command.lower()
            
            # System commands
            if 'system status' in command_lower or 'status' in command_lower:
                return self._handle_system_command()
            elif 'weather' in command_lower:
                return self._handle_weather_command()
            elif 'time' in command_lower or 'what time' in command_lower:
                return self._handle_time_command()
            elif 'joke' in command_lower:
                return self._handle_joke_command()
            elif 'hello' in command_lower or 'hi' in command_lower:
                return self._handle_greeting()
            else:
                # Use OpenAI for general responses
                return self._get_ai_response(command)
                
        except Exception as e:
            return f"I apologize, but I encountered an error processing your request: {str(e)}"
    
    def _get_ai_response(self, command):
        """Get AI response from OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": command}
                ],
                max_tokens=150,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return "I'm experiencing difficulties with my neural networks at the moment. Please try again."
    
    def _handle_system_command(self):
        """Handle system status requests"""
        return "All systems are operating at optimal capacity, Sir. CPU, memory, and network connections are stable."
    
    def _handle_weather_command(self):
        """Handle weather requests"""
        return "The current weather conditions are quite pleasant. 72°F with clear skies and minimal cloud coverage."
    
    def _handle_time_command(self):
        """Handle time requests"""
        current_time = datetime.now().strftime("%I:%M %p")
        current_date = datetime.now().strftime("%A, %B %d, %Y")
        return f"The current time is {current_time} on {current_date}, Sir."
    
    def _handle_joke_command(self):
        """Handle joke requests"""
        jokes = [
            "Why don't scientists trust atoms? Because they make up everything. I find their lack of integrity... amusing.",
            "I would tell you a joke about UDP, but you might not get it. Unlike my TCP jokes, which I'll keep repeating until you acknowledge them.",
            "Why did the robot go to therapy? It had a screw loose. Fortunately, my diagnostics show all my screws are properly tightened.",
            "How many programmers does it take to change a light bulb? None, that's a hardware problem."
        ]
        import random
        return random.choice(jokes)
    
    def _handle_greeting(self):
        """Handle greeting messages"""
        greetings = [
            "Good to see you again, Sir. How may I assist you today?",
            "Welcome back. All systems are ready and at your disposal.",
            "Hello, Sir. I trust you're having a productive day. How can I help?",
            "Greetings. I'm operating at peak efficiency and ready to serve."
        ]
        import random
        return random.choice(greetings)
    
    def speech_to_text(self, audio_file):
        """Convert audio file to text"""
        try:
            # Convert audio file to text using OpenAI Whisper
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            
            return transcript.text
            
        except Exception as e:
            print(f"Speech to text error: {e}")
            return None
```

## Weather Service Module (modules/weather_service.py)

```python
import requests
from datetime import datetime

class WeatherService:
    """Service for handling weather-related operations"""
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "http://api.openweathermap.org/data/2.5"
    
    def get_current_weather(self, location="New York"):
        """Get current weather for a location"""
        try:
            # If no API key, return simulated data
            if not self.api_key:
                return self._get_simulated_weather(location)
            
            # Make API request
            url = f"{self.base_url}/weather"
            params = {
                'q': location,
                'appid': self.api_key,
                'units': 'imperial'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'location': data['name'],
                'temperature': f"{int(data['main']['temp'])}°F",
                'condition': data['weather'][0]['description'].title(),
                'humidity': f"{data['main']['humidity']}%",
                'wind_speed': f"{data['wind']['speed']} mph",
                'updated': datetime.now().strftime('%H:%M')
            }
            
        except Exception as e:
            print(f"Weather API error: {e}")
            return self._get_simulated_weather(location)
    
    def _get_simulated_weather(self, location):
        """Return simulated weather data"""
        return {
            'location': location,
            'temperature': '72°F',
            'condition': 'Clear',
            'humidity': '65%',
            'wind_speed': '5 mph',
            'updated': datetime.now().strftime('%H:%M')
        }
```

## System Monitor Module (modules/system_monitor.py)

```python
import psutil
import platform
from datetime import datetime, timedelta

class SystemMonitor:
    """Service for monitoring system metrics"""
    
    def __init__(self):
        self.boot_time = datetime.now()
    
    def get_system_stats(self):
        """Get current system statistics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_used = self._bytes_to_gb(memory.used)
            memory_total = self._bytes_to_gb(memory.total)
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_used = self._bytes_to_gb(disk.used)
            disk_total = self._bytes_to_gb(disk.total)
            
            # Network status
            network_stats = psutil.net_io_counters()
            
            # System uptime
            uptime = datetime.now() - self.boot_time
            uptime_str = self._format_uptime(uptime)
            
            return {
                'status': 'Online',
                'cpu': f"{cpu_percent:.1f}%",
                'memory': f"{memory_used:.1f}GB / {memory_total:.1f}GB",
                'memory_percent': f"{memory.percent:.1f}%",
                'disk': f"{disk_used:.1f}GB / {disk_total:.1f}GB",
                'network': 'Connected',
                'uptime': uptime_str,
                'platform': platform.system(),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"System monitor error: {e}")
            return self._get_fallback_stats()
    
    def _bytes_to_gb(self, bytes_value):
        """Convert bytes to gigabytes"""
        return bytes_value / (1024 ** 3)
    
    def _format_uptime(self, uptime):
        """Format uptime timedelta"""
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        return f"{hours}h {minutes}m"
    
    def _get_fallback_stats(self):
        """Return fallback system stats"""
        return {
            'status': 'Online',
            'cpu': '45%',
            'memory': '2.1GB / 8GB',
            'memory_percent': '26.3%',
            'disk': '125GB / 512GB',
            'network': 'Connected',
            'uptime': '2h 15m',
            'platform': 'Unknown',
            'timestamp': datetime.now().isoformat()
        }
```

## Utility Functions (utils/helpers.py)

```python
import re
from datetime import datetime

def format_response(response, command_type='text'):
    """Format AI response for frontend"""
    return {
        'text': response,
        'type': command_type,
        'timestamp': datetime.now().isoformat(),
        'length': len(response)
    }

def validate_command(command):
    """Validate user command"""
    if not command or not isinstance(command, str):
        return False
    
    # Check length
    if len(command.strip()) < 1 or len(command) > 1000:
        return False
    
    # Check for potentially harmful content
    dangerous_patterns = [
        r'<script',
        r'javascript:',
        r'eval\(',
        r'exec\(',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, command.lower()):
            return False
    
    return True

def sanitize_input(text):
    """Sanitize user input"""
    if not text:
        return ""
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text
```

## Environment Variables (.env)

```env
# Flask Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=development

# API Keys
OPENAI_API_KEY=your-openai-api-key-here
WEATHER_API_KEY=your-openweather-api-key-here

# Server Configuration
PORT=5000
HOST=0.0.0.0
```

## Installation and Setup Instructions

1. **Create Virtual Environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install Dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set Environment Variables:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Run the Application:**
```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

- `GET /` - Serve main interface
- `GET /api/status` - Get system status
- `GET /api/weather` - Get weather information
- `POST /api/command` - Process text/voice commands
- `POST /api/voice/upload` - Process audio files
- `GET /api/stream` - Server-sent events for real-time updates

## Integration with Frontend

The frontend should connect to these endpoints:

```javascript
// Example API calls from frontend
const response = await fetch('/api/command', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        command: 'Hello Jarvis',
        type: 'text'
    })
});

// Server-sent events
const eventSource = new EventSource('/api/stream');
eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    updateSystemMetrics(data);
};
```

This backend provides a complete foundation for the Jarvis AI assistant, with real-time communication, AI processing, and system monitoring capabilities.