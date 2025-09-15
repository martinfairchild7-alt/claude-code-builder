import { writeFile, mkdir, readFile } from 'fs/promises';
import { dirname } from 'path';
import { config } from './config.js';
class ClaudeCodeBuilder {
    constructor(config) {
        this.config = config;
    }
    async buildCode(request) {
        const { prompt, outputPath, projectContext } = request;
        const enhancedPrompt = this.buildEnhancedPrompt(prompt, projectContext);
        const response = await this.callClaudeAPI(enhancedPrompt);
        const result = this.parseResponse(response);
        if (outputPath && result.code) {
            result.filePath = await this.writeCodeToFile(result.code, outputPath);
        }
        return result;
    }
    buildEnhancedPrompt(prompt, projectContext) {
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
    async callClaudeAPI(prompt) {
        const fetch = (await import('node-fetch')).default;
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
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API调用失败: ${response.status} ${response.statusText}\n响应内容: ${errorText}`);
        }
        const responseText = await response.text();
        console.log('API响应内容:', responseText); // 调试信息
        try {
            const data = JSON.parse(responseText);
            return data.content?.[0]?.text || data.choices?.[0]?.message?.content || responseText;
        }
        catch (parseError) {
            console.log('JSON解析失败，使用原始响应:', responseText);
            return responseText;
        }
    }
    parseResponse(content) {
        try {
            // 首先尝试解析完整的JSON响应
            try {
                const data = JSON.parse(content);
                if (data.content && data.content[0] && data.content[0].text) {
                    const text = data.content[0].text;
                    return this.extractCodeFromText(text);
                }
            }
            catch (e) {
                // JSON解析失败，继续尝试其他方法
            }
            // 尝试从文本中提取JSON格式的代码
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.code) {
                        return {
                            code: parsed.code,
                            language: parsed.language || 'javascript',
                            explanation: parsed.explanation || '代码已生成'
                        };
                    }
                }
                catch (e) {
                    // JSON解析失败，继续尝试其他方法
                }
            }
            // 尝试从代码块中提取
            const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)\n```/);
            if (codeMatch) {
                return {
                    code: codeMatch[2],
                    language: codeMatch[1] || 'html',
                    explanation: '从代码块中提取的代码'
                };
            }
            // 如果都失败了，直接使用原始内容
            return {
                code: content,
                language: 'text',
                explanation: '原始响应内容'
            };
        }
        catch (error) {
            throw new Error(`解析响应失败: ${error}`);
        }
    }
    extractCodeFromText(text) {
        // 尝试从文本中提取JSON格式的代码
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.code) {
                    return {
                        code: parsed.code,
                        language: parsed.language || 'html',
                        explanation: parsed.explanation || '代码已生成'
                    };
                }
            }
            catch (e) {
                // JSON解析失败，继续尝试其他方法
            }
        }
        // 尝试从代码块中提取
        const codeMatch = text.match(/```(\w+)?\n([\s\S]*?)\n```/);
        if (codeMatch) {
            return {
                code: codeMatch[2],
                language: codeMatch[1] || 'html',
                explanation: '从代码块中提取的代码'
            };
        }
        // 如果都失败了，直接使用文本内容
        return {
            code: text,
            language: 'html',
            explanation: '从响应文本中提取的代码'
        };
    }
    async writeCodeToFile(code, outputPath) {
        try {
            const dir = dirname(outputPath);
            await mkdir(dir, { recursive: true });
            await writeFile(outputPath, code, 'utf8');
            return outputPath;
        }
        catch (error) {
            throw new Error(`写入文件失败: ${error}`);
        }
    }
    async readProjectContext(filePaths) {
        const contexts = [];
        for (const filePath of filePaths) {
            try {
                const content = await readFile(filePath, 'utf8');
                contexts.push(`// ${filePath}\n${content}`);
            }
            catch (error) {
                console.warn(`无法读取文件 ${filePath}: ${error}`);
            }
        }
        return contexts.join('\n\n');
    }
}
export async function buildWithClaude(prompt, outputPath, contextFiles) {
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
//# sourceMappingURL=claude-builder.js.map