import { writeFile, mkdir, readFile } from 'fs/promises';
import { dirname } from 'path';
import { ClaudeConfig, config } from './config.js';

interface BuildRequest {
  prompt: string;
  outputPath?: string;
  projectContext?: string;
}

interface BuildResult {
  code: string;
  language: string;
  filePath?: string;
  explanation: string;
}

class ClaudeCodeBuilder {
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
  }

  async buildCode(request: BuildRequest): Promise<BuildResult> {
    const { prompt, outputPath, projectContext } = request;
    const requestId = Date.now().toString(36);

    console.log(`\n🚀 [${requestId}] Starting code generation`);
    console.log(`📝 [${requestId}] Prompt: ${prompt.substring(0, 150)}${prompt.length > 150 ? '...' : ''}`);
    console.log(`📁 [${requestId}] Output path: ${outputPath || 'None'}`);
    console.log(`🔧 [${requestId}] Has context: ${!!projectContext}`);

    const enhancedPrompt = this.buildEnhancedPrompt(prompt, projectContext);

    // 重试机制
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📡 [${requestId}] API调用尝试 ${attempt}/3...`);
        const startTime = Date.now();
        const response = await this.callClaudeAPI(enhancedPrompt, requestId);
        const duration = Date.now() - startTime;
        console.log(`⏱️ [${requestId}] API调用耗时: ${duration}ms`);

        const result = this.parseResponse(response, requestId);
        console.log(`✅ [${requestId}] 代码解析成功 - 语言: ${result.language}, 长度: ${result.code.length} 字符`);

        if (outputPath && result.code) {
          result.filePath = await this.writeCodeToFile(result.code, outputPath, requestId);
        }

        console.log(`🎉 [${requestId}] 代码生成完成`);
        return result;

      } catch (error: any) {
        lastError = error;
        console.log(`❌ [${requestId}] 尝试 ${attempt} 失败: ${error.message}`);
        console.log(`📊 [${requestId}] 错误堆栈: ${error.stack?.split('\n').slice(0, 2).join('\n')}`);

        if (attempt < 3) {
          const delay = attempt * 2000; // 2秒, 4秒递增延迟
          console.log(`⏳ [${requestId}] 等待 ${delay/1000} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.log(`💥 [${requestId}] 所有重试都失败了`);
    throw lastError || new Error('所有重试都失败了');
  }

  private buildEnhancedPrompt(prompt: string, projectContext?: string): string {
    let enhancedPrompt = `
请根据以下需求生成高质量的代码：

用户需求：
${prompt}

请确保：
1. 代码可执行且遵循最佳实践
2. 包含必要的类型定义（如果是TypeScript）
3. 添加适当的注释
4. 考虑错误处理

请以以下JSON格式返回：
{
  "code": "完整的代码实现",
  "language": "编程语言",
  "explanation": "实现说明"
}
    `;

    if (projectContext) {
      enhancedPrompt += `\n项目上下文：\n${projectContext}\n`;
    }

    return enhancedPrompt;
  }

  private async callClaudeAPI(prompt: string, requestId?: string): Promise<string> {
    const fetch = (await import('node-fetch')).default;
    const logPrefix = requestId ? `[${requestId}]` : '';

    console.log(`🔄 ${logPrefix} Calling Claude API with timeout handling...`);
    console.log(`📤 ${logPrefix} Prompt length: ${prompt.length} characters`);
    console.log(`⚙️ ${logPrefix} Using model: ${this.config.model}`);
    console.log(`🌐 ${logPrefix} API endpoint: ${this.config.baseURL}/v1/messages`);
    console.log(`🔑 ${logPrefix} API Key: ${this.config.apiKey ? `...${this.config.apiKey.slice(-8)}` : 'Not set'}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

    try {
      const response = await fetch(`${this.config.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return await this.handleResponse(response, requestId);

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log(`⏰ ${logPrefix} API请求超时`);
        throw new Error('API请求超时，请稍后重试');
      }
      console.log(`🔥 ${logPrefix} API调用异常: ${error.message}`);
      throw error;
    }
  }

  private async handleResponse(response: any, requestId?: string): Promise<string> {
    const logPrefix = requestId ? `[${requestId}]` : '';
    console.log(`📬 ${logPrefix} HTTP响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ ${logPrefix} API错误响应: ${errorText.substring(0, 200)}...`);

      // 特别处理超时错误
      if (response.status === 524) {
        throw new Error('API服务器响应超时，请稍后重试');
      }

      throw new Error(`API调用失败: ${response.status} ${response.statusText}\n响应内容: ${errorText}`);
    }

    const responseText = await response.text();
    console.log(`📋 ${logPrefix} API响应长度: ${responseText.length} 字符`);
    console.log(`📄 ${logPrefix} API响应预览: ${responseText.substring(0, 200)}...`); // 调试信息

    try {
      const data = JSON.parse(responseText);
      return data.content?.[0]?.text || data.choices?.[0]?.message?.content || responseText;
    } catch (parseError) {
      console.log(`⚠️ ${logPrefix} JSON解析失败，使用原始响应`);
      return responseText;
    }
  }

  private parseResponse(content: string, requestId?: string): BuildResult {
    const logPrefix = requestId ? `[${requestId}]` : '';
    console.log(`🔍 ${logPrefix} 开始解析响应内容`);
    try {
      // 首先尝试解析完整的JSON响应
      try {
        const data = JSON.parse(content);
        if (data.content && data.content[0] && data.content[0].text) {
          const text = data.content[0].text;
          console.log(`📤 ${logPrefix} 从Claude响应中提取代码`);
          return this.extractCodeFromText(text, requestId);
        }
      } catch (e) {
        // JSON解析失败，继续尝试其他方法
      }

      // 尝试从文本中提取JSON格式的代码
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.code) {
            console.log(`✨ ${logPrefix} 从JSON格式中解析代码成功`);
            return {
              code: parsed.code,
              language: parsed.language || 'javascript',
              explanation: parsed.explanation || '代码已生成'
            };
          }
        } catch (e) {
          // JSON解析失败，继续尝试其他方法
        }
      }

      // 尝试从代码块中提取
      const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)\n```/);
      if (codeMatch) {
        console.log(`📝 ${logPrefix} 从代码块中提取代码成功`);
        return {
          code: codeMatch[2],
          language: codeMatch[1] || 'html',
          explanation: '从代码块中提取的代码'
        };
      }

      // 如果都失败了，直接使用原始内容
      console.log(`⚠️ ${logPrefix} 无法解析，使用原始内容`);
      return {
        code: content,
        language: 'text',
        explanation: '原始响应内容'
      };
    } catch (error) {
      throw new Error(`解析响应失败: ${error}`);
    }
  }

  private extractCodeFromText(text: string, requestId?: string): BuildResult {
    const logPrefix = requestId ? `[${requestId}]` : '';
    // 尝试从文本中提取JSON格式的代码
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.code) {
          console.log(`✨ ${logPrefix} 从文本JSON中解析代码成功`);
          return {
            code: parsed.code,
            language: parsed.language || 'html',
            explanation: parsed.explanation || '代码已生成'
          };
        }
      } catch (e) {
        // JSON解析失败，继续尝试其他方法
      }
    }

    // 尝试从代码块中提取
    const codeMatch = text.match(/```(\w+)?\n([\s\S]*?)\n```/);
    if (codeMatch) {
      console.log(`📝 ${logPrefix} 从文本代码块中提取代码成功`);
      return {
        code: codeMatch[2],
        language: codeMatch[1] || 'html',
        explanation: '从代码块中提取的代码'
      };
    }

    // 如果都失败了，直接使用文本内容
    console.log(`⚠️ ${logPrefix} 从文本中提取代码失败，使用原始内容`);
    return {
      code: text,
      language: 'html',
      explanation: '从响应文本中提取的代码'
    };
  }

  private async writeCodeToFile(code: string, outputPath: string, requestId?: string): Promise<string> {
    const logPrefix = requestId ? `[${requestId}]` : '';
    try {
      console.log(`📁 ${logPrefix} 创建目录: ${dirname(outputPath)}`);
      const dir = dirname(outputPath);
      await mkdir(dir, { recursive: true });

      console.log(`💾 ${logPrefix} 写入文件: ${outputPath} (${code.length} 字符)`);
      await writeFile(outputPath, code, 'utf8');

      console.log(`✅ ${logPrefix} 文件写入成功`);
      return outputPath;
    } catch (error) {
      console.log(`❌ ${logPrefix} 写入文件失败: ${error}`);
      throw new Error(`写入文件失败: ${error}`);
    }
  }

  async readProjectContext(filePaths: string[]): Promise<string> {
    const contexts: string[] = [];

    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, 'utf8');
        contexts.push(`// ${filePath}\n${content}`);
      } catch (error) {
        console.warn(`无法读取文件 ${filePath}: ${error}`);
      }
    }

    return contexts.join('\n\n');
  }
}

export async function buildWithClaude(
  prompt: string,
  outputPath?: string,
  contextFiles?: string[]
): Promise<BuildResult> {

  const builder = new ClaudeCodeBuilder(config);

  let projectContext = '';
  if (contextFiles && contextFiles.length > 0) {
    projectContext = await builder.readProjectContext(contextFiles);
  }

  return await builder.buildCode({
    prompt,
    outputPath,
    projectContext
  });
}

export { ClaudeCodeBuilder };
export default buildWithClaude;