
require('dotenv').config();
const io = require('socket.io-client');
const { exec } = require('child_process');
const os = require('os');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const SPEECH_KEY = process.env.SPEECH_KEY;

if (!SPEECH_KEY) {
  console.error('Error: SPEECH_KEY not found in environment variables. Please check your .env file.');
  process.exit(1);
}

console.log('Connecting to server:', SERVER_URL);
console.log('Platform detected:', os.platform());

// Connect to Socket.IO server with authentication
const socket = io(SERVER_URL, {
  query: {
    key: SPEECH_KEY,
    type: 'pc'
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Platform-specific TTS commands
function getTTSCommand(text) {
  const platform = os.platform();
  const sanitizedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
  
  switch (platform) {
    case 'win32':
      return `powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${sanitizedText}');"`;
    
    case 'darwin':
      return `say "${sanitizedText}"`;
    
    case 'linux':
      return `espeak "${sanitizedText}"`;
    
    default:
      console.error('Unsupported platform:', platform);
      return null;
  }
}

// Execute TTS command
function speakText(text) {
  const command = getTTSCommand(text);
  
  if (!command) {
    console.error('No TTS command available for this platform');
    return;
  }
  
  console.log(`Speaking: "${text}"`);
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('TTS Error:', error.message);
      return;
    }
    if (stderr) {
      console.error('TTS Stderr:', stderr);
      return;
    }
    console.log('Speech completed');
  });
}

// Socket.IO event handlers
socket.on('connect', () => {
  console.log('✓ Connected to server successfully');
  console.log('Socket ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  
  if (error.message.includes('Authentication failed')) {
    console.error('Authentication failed. Please check your SPEECH_KEY in the .env file.');
    console.error('Make sure the key matches between server and client.');
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect after all attempts');
  console.error('Please check if the server is running and accessible');
});

// Handle speak events from server
socket.on('speak', (data) => {
  if (data && data.text) {
    console.log('Received text to speak:', data.text);
    speakText(data.text);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down client...');
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down client...');
  socket.disconnect();
  process.exit(0);
});

// Keep the process alive
console.log('PC client is running. Waiting for text to speak...');
console.log('Press Ctrl+C to stop');

// Optional: Install TTS dependencies check
function checkTTSDependencies() {
  const platform = os.platform();
  
  console.log('\n--- TTS Dependency Check ---');
  
  switch (platform) {
    case 'win32':
      console.log('✓ Windows PowerShell TTS is built-in');
      break;
    
    case 'darwin':
      console.log('✓ macOS "say" command is built-in');
      break;
    
    case 'linux':
      console.log('ℹ Linux requires espeak to be installed');
      console.log('  Install with: sudo apt-get install espeak');
      // Check if espeak is available
      exec('which espeak', (error) => {
        if (error) {
          console.log('⚠ espeak is not installed');
        } else {
          console.log('✓ espeak is installed');
        }
      });
      break;
    
    default:
      console.log('? Unknown platform TTS support');
  }
}

// Run dependency check
checkTTSDependencies();