import * as vscode from 'vscode';

export interface LLMConfiguration {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  customEndpoint?: string;
  autoComplete: boolean;
  confidenceThreshold: number;
}

export class LLMConfigManager {
  private static readonly CONFIG_SECTION = 'javaFunctionAnalyzer.llm';
  
  /**
   * Gets the current LLM configuration from VS Code settings
   */
  static getConfiguration(): LLMConfiguration {
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
  static async updateConfiguration(updates: Partial<LLMConfiguration>): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    
    for (const [key, value] of Object.entries(updates)) {
      await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
  }
  
  /**
   * Validates the LLM configuration
   */
  static validateConfiguration(config: LLMConfiguration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
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
  static async showConfigurationDialog(): Promise<LLMConfiguration | null> {
    const currentConfig = this.getConfiguration();
    
    // Show input boxes for configuration
    const provider = await vscode.window.showQuickPick(
      ['openai', 'anthropic', 'local', 'custom'].map(p => ({ label: p, value: p })),
      {
        placeHolder: 'Select LLM provider'
      }
    );
    
    if (!provider) return null;
    
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
    
    const newConfig: LLMConfiguration = {
      enabled: true,
      provider: provider.value as any,
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
  static getLLMConfigForIntegration(): any {
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