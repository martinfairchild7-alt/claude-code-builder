import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { buildWithClaude } from './claude-builder.js';

// Function to convert React/TypeScript code to standalone HTML
function convertReactToHTML(code: string, language: string): string {
  // If it's already HTML, return as is
  if (language === 'html' || language === 'HTML/CSS/JavaScript' || language === 'HTML/JavaScript') {
    return code;
  }

  // For React/TypeScript code, wrap it in a complete HTML structure
  if (language === 'TypeScript React' || language === 'React' || language === 'TypeScript' ||
      (language === 'TypeScript' && code.includes('React'))) {
    // Extract CSS from the code if present
    const cssMatch = code.match(/\/\*[\s\S]*?\*\//) || code.match(/const cssStyles = `([\s\S]*?)`;/);
    let cssStyles = '';
    if (cssMatch) {
      if (cssMatch[0].startsWith('/*')) {
        cssStyles = cssMatch[0].replace(/\/\*|\*\//g, '').trim();
      } else {
        cssStyles = cssMatch[1] || '';
      }
    }

    // Create a standalone HTML file with React via CDN
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated React App</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        ${cssStyles}
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        ${code.replace(/import.*?;/g, '').replace(/export default .*?;/g, '')}

        // Render the component
        const container = document.getElementById('root');
        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(ConnectFour || Connect4 || App));
    </script>
</body>
</html>`;
  }

  // For other languages, wrap in basic HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Code</title>
</head>
<body>
    <pre><code>${code}</code></pre>
</body>
</html>`;
}

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  const requestId = Date.now().toString(36);
  console.log(`\n🔄 [${requestId}] New API request received`);
  console.log(`📝 User Agent: ${req.headers['user-agent']}`);
  console.log(`🌐 Client IP: ${req.ip || req.connection.remoteAddress}`);

  try {
    const { prompt, saveAndRun = false, code = null, language = null } = req.body;
    console.log(`📋 [${requestId}] Request params:`, {
      prompt: prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''),
      saveAndRun,
      hasCode: !!code,
      language
    });

    if (!prompt) {
      console.log(`❌ [${requestId}] Missing prompt`);
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Handle case where code is already provided (for Run button)
    if (code && language && saveAndRun) {
      console.log(`🏃 Running already generated code (${language})...`);

      // Generate file name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `run-${timestamp}`;

      let extension = '.html'; // 默认为HTML
      if (language === 'html' || language === 'HTML/CSS/JavaScript' || language === 'HTML/JavaScript') {
        extension = '.html';
      } else if (language === 'javascript') {
        extension = '.js';
      } else if (language === 'typescript') {
        extension = '.ts';
      } else if (language === 'TypeScript React') {
        extension = '.html'; // React代码转换为HTML格式以便运行
      } else if (language === 'python') {
        extension = '.py';
      } else if (language === 'css') {
        extension = '.css';
      }

      const outputPath = `./generated-projects/${fileName}${extension}`;

      // Convert code to HTML format if needed
      const htmlCode = convertReactToHTML(code, language);

      // Directly save the converted code to file
      const dir = dirname(outputPath);
      await mkdir(dir, { recursive: true });
      await writeFile(outputPath, htmlCode, 'utf8');

      const result = {
        code,
        language,
        filePath: outputPath,
        explanation: 'Running already generated code'
      };

      let filePath = null;
      let runUrl = null;

      if (result.filePath) {
        filePath = result.filePath;
        console.log(`💾 Code saved to: ${filePath}`);

        // If it's HTML or HTML-compatible, open in browser
        if (language === 'html' || language === 'HTML/CSS/JavaScript' || language === 'HTML/JavaScript' || language === 'TypeScript React' || extension === '.html') {
          try {
            const fullPath = `/Users/lucas/claude code/${filePath}`;
            await execAsync(`open "${fullPath}"`);
            runUrl = fullPath;
            console.log(`🌐 Opened in browser: ${fullPath}`);
          } catch (error) {
            console.warn(`⚠️ Failed to open in browser: ${error}`);
          }
        }
      }

      return res.json({
        code: result.code,
        language: result.language,
        explanation: 'Running already generated code',
        filePath,
        runUrl,
        projectName: fileName
      });
    }

    console.log(`🚀 Generating code for prompt: ${prompt.substring(0, 100)}...`);

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const projectName = prompt.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    const fileName = `${projectName}-${timestamp}`;

    let outputPath = undefined;
    if (saveAndRun) {
      // 先生成代码以确定语言类型
      const tempResult = await buildWithClaude(prompt);

      // 根据语言类型确定文件扩展名
      let extension = '.html'; // 默认为HTML，因为大多数生成的都是可运行的网页
      if (tempResult.language === 'html' || tempResult.language === 'HTML/CSS/JavaScript' || tempResult.language === 'HTML/JavaScript') {
        extension = '.html';
      } else if (tempResult.language === 'javascript') {
        extension = '.js';
      } else if (tempResult.language === 'typescript') {
        extension = '.ts';
      } else if (tempResult.language === 'TypeScript React') {
        extension = '.html'; // React代码转换为HTML格式以便运行
      } else if (tempResult.language === 'python') {
        extension = '.py';
      } else if (tempResult.language === 'css') {
        extension = '.css';
      }

      outputPath = `./generated-projects/${fileName}${extension}`;

      // 重新调用以保存文件
      const result = await buildWithClaude(prompt, outputPath);

      console.log(`✅ Code generated successfully for language: ${result.language}`);

      let filePath = null;
      let runUrl = null;

      // 如果请求保存并运行
      if (result.filePath) {
        filePath = result.filePath;
        console.log(`💾 Code saved to: ${filePath}`);

        // 如果是HTML文件或HTML兼容文件，自动在浏览器中打开
        if (result.language === 'html' || result.language === 'HTML/CSS/JavaScript' || result.language === 'HTML/JavaScript' || result.language === 'TypeScript React' || filePath.endsWith('.html')) {
          try {
            const fullPath = `/Users/lucas/claude code/${filePath}`;
            await execAsync(`open "${fullPath}"`);
            runUrl = fullPath;
            console.log(`🌐 Opened in browser: ${fullPath}`);
          } catch (error) {
            console.warn(`⚠️ Failed to open in browser: ${error}`);
          }
        }
      }

      res.json({
        code: result.code,
        language: result.language,
        explanation: result.explanation,
        filePath,
        runUrl,
        projectName: fileName
      });

    } else {
      // 不保存文件，只生成代码
      const result = await buildWithClaude(prompt);
      console.log(`✅ Code generated successfully for language: ${result.language}`);

      res.json({
        code: result.code,
        language: result.language,
        explanation: result.explanation,
        filePath: null,
        runUrl: null,
        projectName: fileName
      });
    }

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error generating code:`, {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      error: 'Failed to generate code',
      details: error.message,
      requestId
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Claude Builder API is running' });
});

app.listen(PORT, () => {
  console.log(`🌟 Claude Builder API server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});