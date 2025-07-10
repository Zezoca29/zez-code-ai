import { CodeContext, LLMPrompt, TestRequirements } from './contextEngineer';

export interface LLMResponse {
  success: boolean;
  testCode: string;
  explanation: string;
  suggestions: string[];
  confidence: number; // 0-100
  errors?: string[];
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export class LLMIntegration {
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }
  
  /**
   * Sends the prompt to LLM and gets the completed test code
   */
  async generateCompleteTest(
    context: CodeContext,
    partialTestCode: string
  ): Promise<LLMResponse> {
    try {
      // Generate the prompt
      const prompt = this.buildCompletionPrompt(context, partialTestCode);
      
      // Send to LLM based on provider
      const response = await this.sendToLLM(prompt);
      
      // Process and validate the response
      return this.processLLMResponse(response, context);
      
    } catch (error) {
      return {
        success: false,
        testCode: '',
        explanation: 'Failed to generate test due to LLM error',
        suggestions: ['Check LLM configuration', 'Verify API key', 'Check network connection'],
        confidence: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Generates the prompt that would be sent to the LLM (static method for external use)
   */
  static generatePrompt(context: CodeContext, partialTestCode: string): string {
    const { className, methodName, parameters, returnType, calledMethods, businessLogic, complexity, lines } = context;
    
    // Validate and enhance type information
    const enhancedParameters = parameters.map(p => {
      const type = p.type === 'Object' ? 'Object (needs specific type)' : p.type;
      return `${type} ${p.name}`;
    }).join(', ');
    
    const enhancedReturnType = returnType === 'Object' ? 'Object (needs specific type)' : returnType;
    
    // Enhance dependencies with more context
    const enhancedDependencies = calledMethods.length > 0 
      ? calledMethods.map(m => `- ${m.className}.${m.methodName}() -> ${m.returnType || 'void'}`).join('\n')
      : '- No external dependencies detected';
    
    // Add complexity context
    const complexityContext = complexity > 10 
      ? `\n**Note:** This method has high complexity (${complexity}) with ${lines} lines of code. Focus on comprehensive test coverage.`
      : '';
    
    return `# Java Unit Test Generation and Fixing

## Role Assignment
You are an expert Java developer and testing specialist with deep knowledge of JUnit 5, Mockito, and AssertJ. Your task is to generate high-quality, production-ready unit tests that follow industry best practices.

## Original Method Information

**Class:** \`${className}\`
**Method:** \`${methodName}\`
**Return Type:** \`${enhancedReturnType}\`
**Parameters:** \`${enhancedParameters}\`
**Complexity:** ${complexity} (${lines} lines of code)${complexityContext}

## Business Logic Analysis

${businessLogic.length > 0 
  ? businessLogic.map(logic => `- ${logic}`).join('\n')
  : '- Business logic analysis not available'
}

## External Dependencies to Mock

${enhancedDependencies}

## Current Test Code (Requires Fixing)

The following test code contains various issues that need to be addressed:

\`\`\`java
${partialTestCode}
\`\`\`

## Specific Issues to Fix

1. **Type Safety Issues**
   - Replace generic \`Object\` types with specific, meaningful types
   - Fix type mismatches in variable declarations
   - Ensure return types match the original method signature

2. **Mock Configuration Problems**
   - Replace \`mock(Object.class)\` with specific return values
   - Configure mocks with realistic test data
   - Add proper mock verification where appropriate

3. **Import and Dependency Issues**
   - Add missing imports (e.g., \`LocalDate\`, \`List\`, \`Optional\`, etc.)
   - Include all necessary testing framework imports
   - Ensure proper package declarations

4. **Test Method Quality**
   - Use descriptive, camelCase method names
   - Follow the AAA pattern (Arrange, Act, Assert)
   - Add meaningful test documentation with \`@DisplayName\`

5. **Test Data Quality**
   - Use realistic test data via builders or static factory methods
   - Avoid hardcoded magic numbers and strings
   - Create test data that represents real-world scenarios

6. **Assertion Improvements**
   - Use AssertJ for fluent, readable assertions
   - Validate business logic, not just object existence
   - Include specific value checks and edge case validations

7. **Test Coverage Enhancement**
   - Add at least one edge case test
   - Include proper error handling and exception tests
   - Ensure comprehensive coverage of different scenarios

## Technical Requirements

### Testing Framework
- **JUnit 5** with \`@Test\`, \`@DisplayName\`, \`@BeforeEach\`
- **Mockito** for mocking external dependencies only
- **AssertJ** for fluent assertions and better readability

### Code Quality Standards
- Follow **AAA pattern** (Arrange, Act, Assert) in every test method
- Use **meaningful variable names** that describe the test scenario
- Implement **proper error handling** with exception testing
- Follow **Java naming conventions** (camelCase for methods, PascalCase for classes)

### Test Data Strategy
- Use **realistic test data** that represents actual business scenarios
- Implement **test data builders** or static factory methods
- Avoid **hardcoded values** that don't represent real use cases
- Include **edge cases** like null values, empty collections, boundary conditions

### Mocking Best Practices
- Mock **only external dependencies** (databases, APIs, external services)
- Use **specific return values** instead of generic mocks
- Implement **proper mock verification** where method calls matter
- Configure mocks with **realistic behavior** that matches production

## Expected Output

Provide a **complete, corrected test class** that:
- Compiles without errors
- Follows all specified requirements
- Includes comprehensive test coverage
- Uses realistic test data and meaningful assertions
- Demonstrates proper mocking and verification
- Includes at least one happy path, one edge case, and one error case

The test class should be production-ready and demonstrate best practices in Java unit testing.`;
  }

  /**
   * Builds a completion prompt for the LLM
   */
  private buildCompletionPrompt(context: CodeContext, partialTestCode: string): string {
    // Use the optimized static method for consistency
    return LLMIntegration.generatePrompt(context, partialTestCode);
  }
  
  /**
   * Sends prompt to the configured LLM provider
   */
  private async sendToLLM(prompt: string): Promise<string> {
    switch (this.config.provider) {
      case 'openai':
        return this.sendToOpenAI(prompt);
      case 'anthropic':
        return this.sendToAnthropic(prompt);
      case 'local':
        return this.sendToLocalLLM(prompt);
      case 'custom':
        return this.sendToCustomLLM(prompt);
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }
  
  /**
   * Sends prompt to OpenAI
   */
  private async sendToOpenAI(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Java developer and testing specialist. Generate high-quality, production-ready unit tests.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.choices[0].message.content;
  }
  
  /**
   * Sends prompt to Anthropic Claude
   */
  private async sendToAnthropic(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.content[0].text;
  }
  
  /**
   * Sends prompt to local LLM (placeholder for local models)
   */
  private async sendToLocalLLM(prompt: string): Promise<string> {
    // This would integrate with local models like Ollama, LM Studio, etc.
    throw new Error('Local LLM integration not implemented yet');
  }
  
  /**
   * Sends prompt to custom LLM endpoint
   */
  private async sendToCustomLLM(prompt: string): Promise<string> {
    // This would integrate with custom LLM endpoints
    throw new Error('Custom LLM integration not implemented yet');
  }
  
  /**
   * Processes and validates the LLM response
   */
  private processLLMResponse(response: string, context: CodeContext): LLMResponse {
    try {
      // Extract Java code from the response
      const testCode = this.extractJavaCode(response);
      
      // Validate the generated code
      const validation = this.validateGeneratedCode(testCode, context);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(testCode, validation);
      
      return {
        success: validation.isValid,
        testCode: testCode,
        explanation: this.generateExplanation(validation),
        suggestions: validation.suggestions,
        confidence: confidence,
        errors: validation.errors
      };
      
    } catch (error) {
      return {
        success: false,
        testCode: '',
        explanation: 'Failed to process LLM response',
        suggestions: ['Check LLM response format', 'Verify code extraction'],
        confidence: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Extracts Java code from LLM response
   */
  private extractJavaCode(response: string): string {
    // Look for code blocks
    const codeBlockRegex = /```java\s*([\s\S]*?)\s*```/;
    const match = response.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }
    
    // If no code block, try to extract Java-like content
    const javaLines = response
      .split('\n')
      .filter(line => 
        line.includes('public class') ||
        line.includes('@Test') ||
        line.includes('import ') ||
        line.includes('@Mock') ||
        line.includes('@InjectMocks') ||
        line.includes('assertThat') ||
        line.includes('when(') ||
        line.includes('verify(')
      )
      .join('\n');
    
    return javaLines || response;
  }
  
  /**
   * Validates the generated test code
   */
  private validateGeneratedCode(testCode: string, context: CodeContext): any {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;
    
    // Check for required imports
    if (!testCode.includes('import org.junit.jupiter.api.Test')) {
      errors.push('Missing JUnit 5 Test import');
      isValid = false;
    }
    
    if (!testCode.includes('import org.mockito.Mock')) {
      errors.push('Missing Mockito Mock import');
      isValid = false;
    }
    
    if (!testCode.includes('import static org.assertj.core.api.Assertions')) {
      errors.push('Missing AssertJ import');
      isValid = false;
    }
    
    // Check for class structure
    if (!testCode.includes('@ExtendWith(MockitoExtension.class)')) {
      errors.push('Missing @ExtendWith(MockitoExtension.class)');
      isValid = false;
    }
    
    // Check for mock declarations
    if (!testCode.includes('@Mock') || !testCode.includes('@InjectMocks')) {
      errors.push('Missing @Mock or @InjectMocks annotations');
      isValid = false;
    }
    
    // Check for test methods
    const testMethodCount = (testCode.match(/@Test/g) || []).length;
    if (testMethodCount === 0) {
      errors.push('No @Test methods found');
      isValid = false;
    }
    
    // Check for assertions
    if (!testCode.includes('assertThat') && !testCode.includes('assertEquals')) {
      errors.push('No assertions found');
      isValid = false;
    }
    
    // Check for mock setup
    if (!testCode.includes('when(')) {
      errors.push('No mock setup found');
      isValid = false;
    }
    
    // Check for mock verification
    if (!testCode.includes('verify(')) {
      suggestions.push('Consider adding mock verifications');
    }
    
    // Check for realistic test data
    if (testCode.includes('mock(Object.class)')) {
      errors.push('Still using generic mock(Object.class)');
      isValid = false;
    }
    
    // Check for proper variable types
    if (testCode.includes('Object client = new Client()')) {
      errors.push('Variables still declared as Object type');
      isValid = false;
    }
    
    return {
      isValid,
      errors,
      suggestions
    };
  }
  
  /**
   * Calculates confidence score for the generated code
   */
  private calculateConfidence(testCode: string, validation: any): number {
    let confidence = 100;
    
    // Deduct points for errors
    confidence -= validation.errors.length * 15;
    
    // Deduct points for missing suggestions
    confidence -= validation.suggestions.length * 5;
    
    // Bonus points for good practices
    if (testCode.includes('@DisplayName')) confidence += 5;
    if (testCode.includes('@Nested')) confidence += 5;
    if (testCode.includes('assertThrows')) confidence += 10;
    if (testCode.includes('// Arrange') && testCode.includes('// Act') && testCode.includes('// Assert')) confidence += 10;
    
    return Math.max(0, Math.min(100, confidence));
  }
  
  /**
   * Generates explanation for the validation results
   */
  private generateExplanation(validation: any): string {
    if (validation.isValid) {
      return 'Test code generated successfully with good quality. All required elements are present.';
    } else {
      return `Test code generated but has ${validation.errors.length} critical issues that need to be fixed.`;
    }
  }
  
  /**
   * Creates a default LLM configuration
   */
  static createDefaultConfig(): LLMConfig {
    return {
      provider: 'openai',
      model: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.3,
      timeout: 30000
    };
  }
} 