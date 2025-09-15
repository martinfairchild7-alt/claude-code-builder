import { ClaudeConfig } from './config.js';
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
declare class ClaudeCodeBuilder {
    private config;
    constructor(config: ClaudeConfig);
    buildCode(request: BuildRequest): Promise<BuildResult>;
    private buildEnhancedPrompt;
    private callClaudeAPI;
    private parseResponse;
    private extractCodeFromText;
    private writeCodeToFile;
    readProjectContext(filePaths: string[]): Promise<string>;
}
export declare function buildWithClaude(prompt: string, outputPath?: string, contextFiles?: string[]): Promise<BuildResult>;
export { ClaudeCodeBuilder };
export default buildWithClaude;
//# sourceMappingURL=claude-builder.d.ts.map