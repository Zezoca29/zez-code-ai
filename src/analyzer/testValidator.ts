export interface TestValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  score: number; // 0-100 score for test quality
}

export interface TestValidationContext {
  className: string;
  methodName: string;
  returnType: string;
  parameters: Array<{ name: string; type: string }>;
  calledFunctions: Array<{ methodName: string; className?: string; returnType?: string }>;
}

export class TestValidator {
  
  /**
   * Validates a generated test file for common issues
   */
  static validateGeneratedTest(
    testContent: string, 
    context: TestValidationContext
  ): TestValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check for critical compilation errors
    this.checkCriticalErrors(testContent, context, errors);
    
    // Check for common issues
    this.checkCommonIssues(testContent, context, warnings);
    
    // Check for best practices
    this.checkBestPractices(testContent, context, suggestions);
    
    // Calculate quality score
    const score = this.calculateQualityScore(testContent, errors, warnings, suggestions);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score
    };
  }
  
  /**
   * Checks for critical errors that would prevent compilation
   */
  private static checkCriticalErrors(
    testContent: string, 
    context: TestValidationContext, 
    errors: string[]
  ): void {
    // Check for missing imports
    if (!testContent.includes('import org.junit.jupiter.api.extension.ExtendWith;')) {
      errors.push('Missing import: org.junit.jupiter.api.extension.ExtendWith');
    }
    
    if (!testContent.includes('import org.mockito.junit.jupiter.MockitoExtension;')) {
      errors.push('Missing import: org.mockito.junit.jupiter.MockitoExtension');
    }
    
    if (!testContent.includes('import static org.assertj.core.api.Assertions.*;')) {
      errors.push('Missing import: static org.assertj.core.api.Assertions.*');
    }
    
    // Check for @ExtendWith annotation
    if (!testContent.includes('@ExtendWith(MockitoExtension.class)')) {
      errors.push('Missing @ExtendWith(MockitoExtension.class) annotation');
    }
    
    // Check for proper instance name usage
    const expectedInstanceName = context.className.charAt(0).toLowerCase() + context.className.slice(1);
    if (!testContent.includes(`@InjectMocks\n    private ${context.className} ${expectedInstanceName};`)) {
      errors.push(`Missing @InjectMocks annotation for ${context.className} instance`);
    }
    
    // Check for string literals instead of object instantiation
    const stringLiteralPatterns = [
      /String \w+ = "new \w+\(\)"/g,
      /String \w+ = "\[\]"/g,
      /String \w+ = "new \w+\(\)"/g
    ];
    
    stringLiteralPatterns.forEach(pattern => {
      const matches = testContent.match(pattern);
      if (matches) {
        errors.push(`Found string literal instead of object instantiation: ${matches[0]}`);
      }
    });
    
    // Check for incorrect mock return values
    if (testContent.includes('mock(Object.class)')) {
      errors.push('Found generic mock(Object.class) - should use specific return types');
    }
  }
  
  /**
   * Checks for common issues that might cause runtime problems
   */
  private static checkCommonIssues(
    testContent: string, 
    context: TestValidationContext, 
    warnings: string[]
  ): void {
    // Check for missing assertions
    if (!testContent.includes('assertThat') && !testContent.includes('assertEquals') && !testContent.includes('assertNotNull')) {
      warnings.push('Test has no assertions - consider adding proper assertions');
    }
    
    // Check for missing mock verifications
    const mockCount = (testContent.match(/@Mock/g) || []).length;
    const verifyCount = (testContent.match(/verify\(/g) || []).length;
    
    if (mockCount > 0 && verifyCount === 0) {
      warnings.push('Mocks are defined but not verified - consider adding verify() calls');
    }
    
    // Check for hardcoded values in assertions
    if (testContent.includes('assertEquals(1, result)') || testContent.includes('assertEquals("test", result)')) {
      warnings.push('Test uses hardcoded expected values - consider using more meaningful test data');
    }
    
    // Check for missing test documentation
    if (!testContent.includes('/**') || !testContent.includes('* Testa')) {
      warnings.push('Test method lacks proper documentation');
    }
    
    // Check for proper exception testing
    if (context.calledFunctions.some(f => f.methodName.includes('Exception') || f.methodName.includes('Error'))) {
      if (!testContent.includes('assertThrows')) {
        warnings.push('Method calls functions that might throw exceptions but no exception testing found');
      }
    }
  }
  
  /**
   * Checks for best practices and provides suggestions
   */
  private static checkBestPractices(
    testContent: string, 
    context: TestValidationContext, 
    suggestions: string[]
  ): void {
    // Suggest better test naming
    if (testContent.includes('testWithValidInputs')) {
      suggestions.push('Consider more descriptive test names that explain the specific scenario being tested');
    }
    
    // Suggest parameterized tests for multiple scenarios
    const testMethodCount = (testContent.match(/@Test/g) || []).length;
    if (testMethodCount > 3) {
      suggestions.push('Consider using @ParameterizedTest for multiple similar test scenarios');
    }
    
    // Suggest better mock setup
    if (testContent.includes('when(') && !testContent.includes('given(')) {
      suggestions.push('Consider using BDD style with given()/when()/then() for better readability');
    }
    
    // Suggest specific return types for mocks
    if (testContent.includes('thenReturn(mock(')) {
      suggestions.push('Consider returning specific values instead of generic mocks for better test clarity');
    }
    
    // Suggest test data builders
    if (context.parameters.length > 2) {
      suggestions.push('Consider using test data builders for complex object creation');
    }
    
    // Suggest better assertion messages
    if (testContent.includes('assertThat(result).isNotNull()')) {
      suggestions.push('Consider adding descriptive messages to assertions for better failure reporting');
    }
  }
  
  /**
   * Calculates a quality score for the test (0-100)
   */
  private static calculateQualityScore(
    testContent: string, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): number {
    let score = 100;
    
    // Deduct points for errors (critical)
    score -= errors.length * 20;
    
    // Deduct points for warnings (important)
    score -= warnings.length * 10;
    
    // Deduct points for suggestions (minor)
    score -= suggestions.length * 5;
    
    // Bonus points for good practices
    if (testContent.includes('@ExtendWith(MockitoExtension.class)')) score += 5;
    if (testContent.includes('@InjectMocks')) score += 5;
    if (testContent.includes('assertThat')) score += 5;
    if (testContent.includes('verify(')) score += 5;
    if (testContent.includes('/**')) score += 5;
    if (testContent.includes('// Arrange') && testContent.includes('// Act') && testContent.includes('// Assert')) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Provides specific fixes for common issues
   */
  static getFixesForIssues(validationResult: TestValidationResult): string[] {
    const fixes: string[] = [];
    
    validationResult.errors.forEach(error => {
      switch (error) {
        case 'Missing import: org.junit.jupiter.api.extension.ExtendWith':
          fixes.push('Add: import org.junit.jupiter.api.extension.ExtendWith;');
          break;
        case 'Missing import: org.mockito.junit.jupiter.MockitoExtension':
          fixes.push('Add: import org.mockito.junit.jupiter.MockitoExtension;');
          break;
        case 'Missing import: static org.assertj.core.api.Assertions.*':
          fixes.push('Add: import static org.assertj.core.api.Assertions.*;');
          break;
        case 'Missing @ExtendWith(MockitoExtension.class) annotation':
          fixes.push('Add: @ExtendWith(MockitoExtension.class) before the class declaration');
          break;
        case 'Found string literal instead of object instantiation':
          fixes.push('Replace string literals with actual object instantiation (e.g., "new Client()" → new Client())');
          break;
        case 'Found generic mock(Object.class) - should use specific return types':
          fixes.push('Replace mock(Object.class) with specific return types (e.g., "mockedValue", 1, true)');
          break;
      }
    });
    
    return fixes;
  }
  
  /**
   * Validates test scenarios for consistency
   */
  static validateTestScenarios(scenarios: any[], context: TestValidationContext): TestValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check for duplicate test names
    const testNames = scenarios.map(s => s.name);
    const duplicates = testNames.filter((name, index) => testNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate test names found: ${duplicates.join(', ')}`);
    }
    
    // Check for missing test categories
    scenarios.forEach(scenario => {
      if (!scenario.category) {
        warnings.push(`Test scenario "${scenario.name}" has no category`);
      }
    });
    
    // Check for proper input types
    scenarios.forEach(scenario => {
      Object.entries(scenario.inputs).forEach(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('"new ')) {
          errors.push(`Scenario "${scenario.name}": Input "${key}" is a string instead of object instantiation`);
        }
      });
    });
    
    // Check for assertion coverage
    scenarios.forEach(scenario => {
      if (!scenario.assertions || scenario.assertions.length === 0) {
        warnings.push(`Test scenario "${scenario.name}" has no assertions`);
      }
    });
    
    const score = this.calculateQualityScore('', errors, warnings, suggestions);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score
    };
  }
} 