# Claude Code Builder - Lovable Clone

🚀 An AI-powered code generation platform built with React and Node.js, featuring Claude API integration for intelligent code generation.

## Features

✨ **AI Code Generation**: Powered by Claude Sonnet 4 API
🎮 **Interactive UI**: Modern React 19 + TypeScript frontend
🔄 **Real-time Logging**: Live feedback with detailed logs
🎯 **One-click Execution**: Generate, save, and run code instantly
📱 **Responsive Design**: Beautiful Tailwind CSS interface
🛠️ **Multi-language Support**: JavaScript, TypeScript, React, HTML, CSS, Python

## Demo

🎮 **Connect 4 Game**: Check out our generated [Connect 4 game](./connect4-demo.html) - a fully functional game created using our AI code generator!

## Project Structure

```
claude-code-builder/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── CodeBuilder.tsx
│   │   │   └── LogViewer.tsx
│   │   └── hooks/           # Custom hooks
│   │       └── useLogs.ts
├── server.ts                # Express backend
├── claude-builder.ts        # Claude API integration
└── generated-projects/      # AI-generated projects
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Claude API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd claude-code-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install
   ```

3. **Configure environment**
   ```bash
   cp config.example.js config.js
   # Add your Claude API key to config.js
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   npm run server
   ```

2. **Start the frontend development server**
   ```bash
   npm run frontend
   ```

3. **Open your browser**
   Navigate to `http://localhost:5173`

## API Configuration

Create a `config.js` file in the root directory:

```javascript
export const config = {
  apiKey: 'your-claude-api-key-here',
  model: 'claude-3-sonnet-20240229',
  baseURL: 'https://api.anthropic.com'
}
```

## Usage

1. **Describe your project**: Enter a detailed description of what you want to build
2. **Generate**: Click "Generate Code" to create your project
3. **Review**: Examine the generated code and explanation
4. **Run**: Click "Run" to execute and open the project in your browser
5. **Save**: Click "Save" to store the project in the `generated-projects/` folder

## Real-time Logging

The application features comprehensive logging:

- 👤 **User Messages**: Your prompts and interactions
- 🤖 **Assistant Responses**: AI-generated replies and status updates
- 🔧 **Tool Calls**: API calls and system operations
- ⚙️ **System Events**: Application state changes
- ❌ **Error Tracking**: Detailed error information

## Generated Projects

All generated projects are saved to `generated-projects/` with timestamps:
- HTML files for web applications
- JavaScript/TypeScript for scripts
- Complete project structures with dependencies

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Claude API** - AI code generation
- **TypeScript** - Type safety

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **Port conflicts**: The backend runs on port 3001, frontend on 5173
2. **Node version**: Ensure you're using Node.js 18 or higher
3. **API key**: Make sure your Claude API key is valid and properly configured

### Debugging

Enable verbose logging by checking the real-time log viewer in the bottom-right corner of the application.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- **Claude AI** - For powering the intelligent code generation
- **Anthropic** - For the Claude API
- **React Team** - For the amazing React framework
- **Vercel** - For Vite and modern tooling

---

Built with ❤️ using Claude AI and modern web technologies.