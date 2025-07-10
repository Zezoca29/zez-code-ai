import { ContextEngineer, CodeContext, TestRequirements } from './contextEngineer';
import { LLMIntegration, LLMConfig, LLMResponse } from './llmIntegration';
import { TestValidator, TestValidationResult } from './testValidator';

export interface TestCompletionRequest {
  code: string;
  className: string;
  methodName: string;
  partialTestCode: string;
  testRequirements: TestRequirements;
  llmConfig?: LLMConfig;
}

export interface TestCompletionResult {
  success: boolean;
  originalTestCode: string;
  completedTestCode: string;
  improvements: string[];
  validationResult: TestValidationResult;
  llmResponse: LLMResponse;
  context: CodeContext;
}

export class TestCompletionService {
  private llmIntegration: LLMIntegration;
  
  constructor(llmConfig?: LLMConfig) {
    const config = llmConfig || LLMIntegration.createDefaultConfig();
    this.llmIntegration = new LLMIntegration(config);
  }
  
  /**
   * Completes a partial unit test using LLM
   */
  async completeUnitTest(request: TestCompletionRequest): Promise<TestCompletionResult> {
    try {
      // Step 1: Extract context from the code
      const context = ContextEngineer.extractCodeContext(
        request.code,
        request.className,
        request.methodName,
        request.testRequirements
      );
      
      // Step 2: Validate the original test code
      const originalValidation = TestValidator.validateGeneratedTest(
        request.partialTestCode,
        {
          className: request.className,
          methodName: request.methodName,
          returnType: context.returnType,
          parameters: context.parameters,
          calledFunctions: context.calledMethods
        }
      );
      
      // Step 3: Send to LLM for completion
      const llmResponse = await this.llmIntegration.generateCompleteTest(
        context,
        request.partialTestCode
      );
      
      // Step 4: Validate the completed test code
      const completedValidation = TestValidator.validateGeneratedTest(
        llmResponse.testCode,
        {
          className: request.className,
          methodName: request.methodName,
          returnType: context.returnType,
          parameters: context.parameters,
          calledFunctions: context.calledMethods
        }
      );
      
      // Step 5: Generate improvement summary
      const improvements = this.generateImprovementSummary(
        originalValidation,
        completedValidation,
        llmResponse
      );
      
      return {
        success: llmResponse.success && completedValidation.isValid,
        originalTestCode: request.partialTestCode,
        completedTestCode: llmResponse.testCode,
        improvements,
        validationResult: completedValidation,
        llmResponse,
        context
      };
      
    } catch (error) {
      return {
        success: false,
        originalTestCode: request.partialTestCode,
        completedTestCode: '',
        improvements: ['Failed to complete test due to error'],
        validationResult: {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
          suggestions: [],
          score: 0
        },
        llmResponse: {
          success: false,
          testCode: '',
          explanation: 'Failed to complete test',
          suggestions: [],
          confidence: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        },
        context: {} as CodeContext
      };
    }
  }
  
  /**
   * Generates a summary of improvements made by the LLM
   */
  private generateImprovementSummary(
    originalValidation: TestValidationResult,
    completedValidation: TestValidationResult,
    llmResponse: LLMResponse
  ): string[] {
    const improvements: string[] = [];
    
    // Score improvement
    const scoreImprovement = completedValidation.score - originalValidation.score;
    if (scoreImprovement > 0) {
      improvements.push(`Quality score improved by ${scoreImprovement} points (${originalValidation.score} → ${completedValidation.score})`);
    }
    
    // Error reduction
    const errorReduction = originalValidation.errors.length - completedValidation.errors.length;
    if (errorReduction > 0) {
      improvements.push(`Fixed ${errorReduction} critical errors`);
    }
    
    // Warning reduction
    const warningReduction = originalValidation.warnings.length - completedValidation.warnings.length;
    if (warningReduction > 0) {
      improvements.push(`Resolved ${warningReduction} warnings`);
    }
    
    // Specific improvements based on LLM response
    if (llmResponse.explanation) {
      improvements.push(`LLM Analysis: ${llmResponse.explanation}`);
    }
    
    // Add LLM suggestions
    if (llmResponse.suggestions.length > 0) {
      improvements.push(...llmResponse.suggestions.map(s => `Suggestion: ${s}`));
    }
    
    return improvements;
  }
  
  /**
   * Creates a test completion request from existing test generation
   */
  static createCompletionRequest(
    code: string,
    className: string,
    methodName: string,
    partialTestCode: string,
    testLevel: number
  ): TestCompletionRequest {
    const testRequirements: TestRequirements = {
      testLevel: testLevel === 1 ? 'basic' : 
                 testLevel === 2 ? 'intermediate' : 
                 testLevel === 3 ? 'advanced' : 'comprehensive',
      focusAreas: ['happy-path', 'error-handling', 'edge-cases'],
      mockStrategy: 'realistic',
      assertionStyle: 'detailed',
      testDataStyle: 'realistic'
    };
    
    return {
      code,
      className,
      methodName,
      partialTestCode,
      testRequirements
    };
  }
  
  /**
   * Generates the LLM prompt without sending it to the LLM
   */
  static generateLLMPrompt(request: TestCompletionRequest): string {
    // Extract context from the code
    const context = ContextEngineer.extractCodeContext(
      request.code,
      request.className,
      request.methodName,
      request.testRequirements
    );
    
    // Generate the prompt that would be sent to the LLM
    const prompt = LLMIntegration.generatePrompt(context, request.partialTestCode);
    
    return prompt;
  }
  
  /**
   * Formats the completion result for display
   */
  static formatCompletionResult(result: TestCompletionResult): string {
    let output = '';
    
    output += '='.repeat(80) + '\n';
    output += 'UNIT TEST COMPLETION REPORT\n';
    output += '='.repeat(80) + '\n\n';
    
    // Success status
    output += `Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    output += `LLM Confidence: ${result.llmResponse.confidence}%\n`;
    output += `Final Quality Score: ${result.validationResult.score}/100\n\n`;
    
    // Improvements summary
    if (result.improvements.length > 0) {
      output += 'IMPROVEMENTS MADE:\n';
      output += '-'.repeat(40) + '\n';
      result.improvements.forEach(improvement => {
        output += `• ${improvement}\n`;
      });
      output += '\n';
    }
    
    // Validation results
    if (result.validationResult.errors.length > 0) {
      output += 'REMAINING ERRORS:\n';
      output += '-'.repeat(40) + '\n';
      result.validationResult.errors.forEach(error => {
        output += `❌ ${error}\n`;
      });
      output += '\n';
    }
    
    if (result.validationResult.warnings.length > 0) {
      output += 'WARNINGS:\n';
      output += '-'.repeat(40) + '\n';
      result.validationResult.warnings.forEach(warning => {
        output += `⚠️ ${warning}\n`;
      });
      output += '\n';
    }
    
    if (result.validationResult.suggestions.length > 0) {
      output += 'SUGGESTIONS:\n';
      output += '-'.repeat(40) + '\n';
      result.validationResult.suggestions.forEach(suggestion => {
        output += `💡 ${suggestion}\n`;
      });
      output += '\n';
    }
    
    // Context information
    output += 'METHOD CONTEXT:\n';
    output += '-'.repeat(40) + '\n';
    output += `Class: ${result.context.className}\n`;
    output += `Method: ${result.context.methodName}\n`;
    output += `Return Type: ${result.context.returnType}\n`;
    output += `Parameters: ${result.context.parameters.map(p => `${p.type} ${p.name}`).join(', ')}\n`;
    output += `Complexity: ${result.context.complexity} (${result.context.lines} lines)\n`;
    output += `Business Logic: ${result.context.businessLogic.join(', ')}\n\n`;
    
    // Completed test code
    if (result.completedTestCode) {
      output += 'COMPLETED TEST CODE:\n';
      output += '-'.repeat(40) + '\n';
      output += result.completedTestCode + '\n\n';
    }
    
    output += '='.repeat(80) + '\n';
    
    return output;
  }
} 