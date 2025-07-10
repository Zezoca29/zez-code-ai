"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMConfigManager = void 0;
const vscode = __importStar(require("vscode"));
class LLMConfigManager {
    static CONFIG_SECTION = 'javaFunctionAnalyzer.llm';
    /**
     * Gets the current LLM configuration from VS Code settings
     */
    static getConfiguration() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return {
            enabled: config.get('enabled', false),
            provider: config.get('provider', 'openai'),
            apiKey: config.get('apiKey', ''),
            model: config.get('model', 'gpt-4'),
            maxTokens: config.get('maxTokens', 4000),
            temperature: config.get('temperature', 0.3),
            timeout: config.get('timeout', 30000),
            customEndpoint: config.get('customEndpoint', ''),
            autoComplete: config.get('autoComplete', false),
            confidenceThreshold: config.get('confidenceThreshold', 70)
        };
    }
    /**
     * Updates the LLM configuration
     */
    static async updateConfiguration(updates) {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        for (const [key, value] of Object.entries(updates)) {
            await config.update(key, value, vscode.ConfigurationTarget.Workspace);
        }
    }
    /**
     * Validates the LLM configuration
     */
    static validateConfiguration(config) {
        const errors = [];
        if (!config.enabled) {
            return { isValid: false, errors: ['LLM completion is disabled'] };
        }
        if (config.provider === 'openai' || config.provider === 'anthropic') {
            if (!config.apiKey || config.apiKey.trim() === '') {
                errors.push(`${config.provider} API key is required`);
            }
        }
        if (config.provider === 'custom') {
            if (!config.customEndpoint || config.customEndpoint.trim() === '') {
                errors.push('Custom endpoint URL is required for custom provider');
            }
        }
        if (config.maxTokens < 100 || config.maxTokens > 8000) {
            errors.push('maxTokens must be between 100 and 8000');
        }
        if (config.temperature < 0 || config.temperature > 2) {
            errors.push('temperature must be between 0 and 2');
        }
        if (config.timeout < 5000 || config.timeout > 120000) {
            errors.push('timeout must be between 5000 and 120000 milliseconds');
        }
        if (config.confidenceThreshold < 0 || config.confidenceThreshold > 100) {
            errors.push('confidenceThreshold must be between 0 and 100');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Shows configuration dialog to user
     */
    static async showConfigurationDialog() {
        const currentConfig = this.getConfiguration();
        // Show input boxes for configuration
        const provider = await vscode.window.showQuickPick(['openai', 'anthropic', 'local', 'custom'].map(p => ({ label: p, value: p })), {
            placeHolder: 'Select LLM provider'
        });
        if (!provider)
            return null;
        let apiKey = currentConfig.apiKey;
        if (provider.value === 'openai' || provider.value === 'anthropic') {
            apiKey = await vscode.window.showInputBox({
                prompt: `Enter ${provider.value} API key`,
                password: true,
                value: currentConfig.apiKey
            }) || '';
        }
        const model = await vscode.window.showInputBox({
            prompt: 'Enter model name',
            value: currentConfig.model
        }) || currentConfig.model;
        const maxTokensStr = await vscode.window.showInputBox({
            prompt: 'Enter max tokens (100-8000)',
            value: currentConfig.maxTokens.toString()
        }) || currentConfig.maxTokens.toString();
        const temperatureStr = await vscode.window.showInputBox({
            prompt: 'Enter temperature (0-2)',
            value: currentConfig.temperature.toString()
        }) || currentConfig.temperature.toString();
        const newConfig = {
            enabled: true,
            provider: provider.value,
            apiKey,
            model,
            maxTokens: parseInt(maxTokensStr) || currentConfig.maxTokens,
            temperature: parseFloat(temperatureStr) || currentConfig.temperature,
            timeout: currentConfig.timeout,
            autoComplete: currentConfig.autoComplete,
            confidenceThreshold: currentConfig.confidenceThreshold
        };
        // Validate configuration
        const validation = this.validateConfiguration(newConfig);
        if (!validation.isValid) {
            vscode.window.showErrorMessage(`Configuration errors:\n${validation.errors.join('\n')}`);
            return null;
        }
        // Save configuration
        await this.updateConfiguration(newConfig);
        vscode.window.showInformationMessage('LLM configuration updated successfully!');
        return newConfig;
    }
    /**
     * Gets the LLM configuration for the integration service
     */
    static getLLMConfigForIntegration() {
        const config = this.getConfiguration();
        if (!config.enabled) {
            throw new Error('LLM completion is disabled');
        }
        const validation = this.validateConfiguration(config);
        if (!validation.isValid) {
            throw new Error(`Invalid LLM configuration: ${validation.errors.join(', ')}`);
        }
        return {
            provider: config.provider,
            apiKey: config.apiKey,
            model: config.model,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            timeout: config.timeout,
            customEndpoint: config.customEndpoint
        };
    }
}
exports.LLMConfigManager = LLMConfigManager;
//# sourceMappingURL=llmConfig.js.map