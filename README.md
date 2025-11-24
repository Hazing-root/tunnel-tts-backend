# Tunnel TTS - Real-time Text-to-Speech through Cloudflare Tunnel

A secure single-page application that delivers text from any browser to your PC and speaks it instantly via Text-to-Speech (TTS) through a Cloudflare Tunnel. No firewall changes needed!

## Features

- ✅ Real-time text-to-speech from any device to your PC
- ✅ WebSocket-based communication with Socket.IO
- ✅ Secure authentication with shared secret
- ✅ Rate limiting (5-second cooldown per IP)
- ✅ Cross-platform TTS support (Windows, macOS, Linux)
- ✅ Cloudflare Tunnel integration for easy deployment
- ✅ Modern, responsive web interface
- ✅ Built-in security with Helmet.js and CORS

## Architecture

```
Browser → Cloudflare Tunnel → Express Server → WebSocket → PC Client → OS TTS
```

## Quick Start

### Prerequisites

- Node.js 20 or higher
- Cloudflare account (for tunnel)
- Windows/macOS/Linux with TTS capabilities

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd tunnel-tts-app
npm install
```

### 2. Configure Environment

Edit `.env` file and change the default key:

```env
SPEECH_KEY=your-secure-random-key-here
```

**Important:** Use a secure random string for production!

### 3. Start the Server

```bash
node server.js
```

You should see:
```
Server running on port 3000
Waiting for connections...
Make sure to set SPEECH_KEY in your .env file
```

### 4. Setup Cloudflare Tunnel

In a new terminal, install and run cloudflared:

```bash
# Install cloudflared (macOS)
brew install cloudflare/cloudflare/cloudflared

# Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Run the tunnel
cloudflared tunnel --url http://localhost:3000
```

Copy the HTTPS URL provided (e.g., `https://abc123.trycloudflare.com`)

### 5. Start the PC Client

In another terminal:

```bash
node client.js
```

You should see:
```
Connecting to server: http://localhost:3000
Platform detected: [your-platform]
✓ Connected to server successfully
PC client is running. Waiting for text to speak...
```

### 6. Test It!

1. Open your tunnel URL in any browser
2. Type some text (max 100 characters)
3. Press Enter or click the button
4. Your PC should speak the text within 200ms!

## File Structure

```
├── server.js          # Express + Socket.IO server with security
├── client.js          # PC-side Node script for TTS
├── public/
│   └── index.html     # Single-page web interface
├── .env               # Environment configuration
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

## Security Features

- **Authentication**: Shared secret key required for all connections
- **Rate Limiting**: 5-second global cooldown per IP address
- **CORS Protection**: Only allows requests from tunnel origin
- **Helmet Security**: Sets secure HTTP headers
- **Input Validation**: Max 100 characters, sanitized for TTS commands
- **WebSocket Auth**: Secret key required for socket connections

## Platform-Specific TTS

### Windows
- Uses PowerShell System.Speech.SpeechSynthesizer
- Built-in, no additional software needed

### macOS
- Uses built-in `say` command
- Built-in, no additional software needed

### Linux
- Uses `espeak` command
- Install with: `sudo apt-get install espeak`

## API Endpoints

- `GET /` - Main web interface
- `POST /speak` - HTTP endpoint for text-to-speech (rate limited)
- `GET /health` - Health check endpoint
- WebSocket `/socket.io/` - Real-time communication

## WebSocket Events

### Client → Server
- `speak` - Send text to speak `{ text: "message" }`

### Server → Client
- `success` - Text received successfully
- `error` - Error occurred
- `speak` - Text to speak (sent to PC clients)

## Configuration Options

### Environment Variables

```env
SPEECH_KEY=your-secret-key          # Required: Authentication key
SERVER_URL=https://tunnel-url.com   # Optional: For remote server
PORT=3000                          # Optional: Server port
```

### URL Parameters

Access the web interface with authentication:
```
https://your-tunnel-url.com?key=your-speech-key
```

## Troubleshooting

### Connection Issues

1. **Server not starting**: Check if port 3000 is available
2. **Client won't connect**: Verify SPEECH_KEY matches in .env
3. **Tunnel not working**: Check cloudflared installation and internet

### TTS Issues

1. **No sound on Linux**: Install espeak: `sudo apt-get install espeak`
2. **Windows PowerShell error**: Ensure PowerShell execution policy allows scripts
3. **macOS say command error**: Check System Preferences > Security & Privacy

### Rate Limiting

- Wait 5 seconds between requests
- Check browser console for "Rate limit exceeded" messages
- Each IP has independent rate limiting

## Development

### Run in Development Mode

```bash
# Run both server and client with auto-restart
npm run dev
```

### Testing

1. **Health Check**: Visit `https://your-tunnel-url.com/health`
2. **WebSocket Test**: Check browser developer tools Network tab
3. **Rate Limit Test**: Send multiple requests quickly

## Production Deployment

1. **Secure your SPEECH_KEY** - Use a long random string
2. **Use HTTPS only** - Cloudflare Tunnel provides this
3. **Monitor logs** - Check for failed authentication attempts
4. **Update dependencies** - Regular `npm update`

## Browser Support

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use for any purpose!

## Support

- 📧 Create an issue for bugs
- 💡 Create a discussion for feature requests
- 📖 Check this README for common solutions

---

**Happy speaking! 🗣️**