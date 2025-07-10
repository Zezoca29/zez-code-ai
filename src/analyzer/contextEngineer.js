"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextEngineer = void 0;
class ContextEngineer {
    /**
     * Extracts comprehensive context from Java code for LLM test generation
     */
    static extractCodeContext(code, className, methodName, testRequirements) {
        // Parse the method to get basic information
        const methodInfo = this.parseMethodInfo(code, className, methodName);
        // Extract business logic patterns
        const businessLogic = this.extractBusinessLogic(methodInfo.methodBody);
        // Analyze method complexity and patterns
        const complexity = this.calculateComplexity(methodInfo.methodBody);
        return {
            className,
            methodName,
            methodSignature: methodInfo.signature,
            returnType: methodInfo.returnType,
            parameters: methodInfo.parameters,
            methodBody: methodInfo.methodBody,
            calledMethods: methodInfo.calledMethods,
            annotations: methodInfo.annotations,
            throwsExceptions: methodInfo.throwsExceptions,
            complexity,
            lines: methodInfo.methodBody.split('\n').length,
            businessLogic,
            testRequirements
        };
    }
    /**
     * Generates a comprehensive prompt for LLM to complete unit tests
     */
    static generateLLMPrompt(context) {
        const systemPrompt = this.generateSystemPrompt();
        const userPrompt = this.generateUserPrompt(context);
        const examples = this.generateExamples(context);
        const constraints = this.generateConstraints(context);
        return {
            systemPrompt,
            userPrompt,
            context,
            examples,
            constraints
        };
    }
    /**
     * Generates the system prompt for the LLM
     */
    static generateSystemPrompt() {
        return `You are an expert Java developer and testing specialist. Your task is to generate high-quality, production-ready unit tests for Java methods.

REQUIREMENTS:
1. Use JUnit 5 with Mockito for mocking
2. Follow AAA pattern (Arrange, Act, Assert)
3. Use AssertJ for fluent assertions
4. Generate realistic test data
5. Include proper error handling tests
6. Follow Java naming conventions
7. Add meaningful test documentation
8. Ensure tests are independent and repeatable

TEST STRUCTURE:
- Use @ExtendWith(MockitoExtension.class)
- Proper @Mock and @InjectMocks annotations
- Meaningful test method names
- Comprehensive assertions
- Proper mock setup and verification

QUALITY STANDARDS:
- Tests should be readable and maintainable
- Include edge cases and boundary conditions
- Mock external dependencies appropriately
- Validate both happy path and error scenarios
- Use descriptive variable names
- Add comments for complex test logic`;
    }
    /**
     * Generates the user prompt with specific context
     */
    static generateUserPrompt(context) {
        const { className, methodName, parameters, returnType, calledMethods, businessLogic, testRequirements } = context;
        let prompt = `Generate a complete unit test class for the following Java method:

CLASS: ${className}
METHOD: ${methodName}
RETURN TYPE: ${returnType}
PARAMETERS: ${parameters.map(p => `${p.type} ${p.name}`).join(', ')}

METHOD SIGNATURE:
${context.methodSignature}

METHOD BODY:
${context.methodBody}

CALLED METHODS (to be mocked):
${calledMethods.map(m => `- ${m.className}.${m.methodName}(${m.parameters.join(', ')}) -> ${m.returnType}`).join('\n')}

BUSINESS LOGIC IDENTIFIED:
${businessLogic.map(logic => `- ${logic}`).join('\n')}

TEST REQUIREMENTS:
- Level: ${testRequirements.testLevel}
- Focus Areas: ${testRequirements.focusAreas.join(', ')}
- Mock Strategy: ${testRequirements.mockStrategy}
- Assertion Style: ${testRequirements.assertionStyle}
- Test Data Style: ${testRequirements.testDataStyle}

ANNOTATIONS: ${context.annotations.join(', ')}
EXCEPTIONS: ${context.throwsExceptions.join(', ')}
COMPLEXITY: ${context.complexity} (lines: ${context.lines})

Please generate a complete test class with:
1. All necessary imports
2. Proper class structure with @ExtendWith(MockitoExtension.class)
3. Mock declarations for all dependencies
4. Multiple test methods covering different scenarios
5. Realistic test data
6. Comprehensive assertions
7. Proper error handling tests
8. Meaningful test documentation`;
        return prompt;
    }
    /**
     * Generates relevant examples based on the context
     */
    static generateExamples(context) {
        const examples = [];
        // Add example based on return type
        if (context.returnType === 'String') {
            examples.push(`// Example for String return type:
@Test
public void testMethodWithValidInputs() {
    // Arrange
    when(mockService.process(any())).thenReturn("expected result");
    String input = "test input";
    
    // Act
    String result = serviceUnderTest.method(input);
    
    // Assert
    assertThat(result).isNotNull()
                     .isEqualTo("expected result")
                     .hasSizeGreaterThan(0);
    verify(mockService).process(input);
}`);
        }
        // Add example based on complexity
        if (context.complexity > 5) {
            examples.push(`// Example for complex method with multiple conditions:
@Test
public void testComplexMethodWithMultipleScenarios() {
    // Arrange
    when(mockService.validate(any())).thenReturn(true);
    when(mockService.process(any())).thenReturn("processed");
    when(mockService.notify(any())).thenReturn(true);
    
    TestData input = TestData.builder()
        .withValue("test")
        .withFlag(true)
        .build();
    
    // Act
    Result result = serviceUnderTest.complexMethod(input);
    
    // Assert
    assertThat(result).isNotNull()
                     .satisfies(r -> {
                         assertThat(r.getStatus()).isEqualTo("SUCCESS");
                         assertThat(r.getMessage()).isNotEmpty();
                     });
    
    verify(mockService).validate(input);
    verify(mockService).process(input);
    verify(mockService).notify(any());
}`);
        }
        // Add example for exception handling
        if (context.throwsExceptions.length > 0) {
            examples.push(`// Example for exception handling:
@Test
public void testMethodThrowsException() {
    // Arrange
    when(mockService.process(any())).thenThrow(new RuntimeException("Service error"));
    String input = "invalid input";
    
    // Act & Assert
    assertThatThrownBy(() -> serviceUnderTest.method(input))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Service error");
    
    verify(mockService).process(input);
}`);
        }
        return examples;
    }
    /**
     * Generates constraints for the LLM
     */
    static generateConstraints(context) {
        const constraints = [
            "Do not use hardcoded values in assertions unless they are business constants",
            "Ensure all mocks are properly verified",
            "Use meaningful variable names that reflect the business domain",
            "Include at least one test for each identified business logic path",
            "Add @DisplayName annotations for better test reporting",
            "Use @Nested classes for organizing related test scenarios",
            "Ensure tests are independent and can run in any order"
        ];
        // Add context-specific constraints
        if (context.complexity > 10) {
            constraints.push("Break down complex test scenarios into multiple focused test methods");
        }
        if (context.calledMethods.length > 5) {
            constraints.push("Group related mocks and use @BeforeEach for common setup");
        }
        if (context.returnType === 'void') {
            constraints.push("Focus on side effects and method calls rather than return values");
        }
        return constraints;
    }
    /**
     * Parses method information from Java code
     */
    static parseMethodInfo(code, className, methodName) {
        // This is a simplified parser - in a real implementation, you'd use a proper Java parser
        const methodRegex = new RegExp(`(public|private|protected)?\\s*(static\\s+)?(\\w+)\\s+${methodName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\}`, 'g');
        const match = methodRegex.exec(code);
        if (!match) {
            throw new Error(`Method ${methodName} not found in class ${className}`);
        }
        const methodBody = match[0];
        const signature = this.extractMethodSignature(methodBody);
        const returnType = this.extractReturnType(signature);
        const parameters = this.extractParameters(signature);
        const calledMethods = this.extractCalledMethods(methodBody);
        const annotations = this.extractAnnotations(methodBody);
        const throwsExceptions = this.extractThrowsExceptions(methodBody);
        return {
            signature,
            returnType,
            parameters,
            methodBody,
            calledMethods,
            annotations,
            throwsExceptions
        };
    }
    /**
     * Extracts business logic patterns from method body
     */
    static extractBusinessLogic(methodBody) {
        const logic = [];
        // Look for conditional logic
        if (methodBody.includes('if') || methodBody.includes('else')) {
            logic.push('Contains conditional logic (if/else statements)');
        }
        // Look for loops
        if (methodBody.includes('for') || methodBody.includes('while')) {
            logic.push('Contains iterative logic (loops)');
        }
        // Look for validation
        if (methodBody.includes('validate') || methodBody.includes('check') || methodBody.includes('assert')) {
            logic.push('Contains validation logic');
        }
        // Look for calculations
        if (methodBody.includes('calculate') || methodBody.includes('compute') || methodBody.includes('sum')) {
            logic.push('Contains calculation logic');
        }
        // Look for data transformation
        if (methodBody.includes('transform') || methodBody.includes('convert') || methodBody.includes('map')) {
            logic.push('Contains data transformation logic');
        }
        // Look for external service calls
        if (methodBody.includes('service') || methodBody.includes('repository') || methodBody.includes('dao')) {
            logic.push('Contains external service calls');
        }
        return logic;
    }
    /**
     * Calculates method complexity
     */
    static calculateComplexity(methodBody) {
        let complexity = 1; // Base complexity
        // Count decision points
        const ifCount = (methodBody.match(/if\s*\(/g) || []).length;
        const forCount = (methodBody.match(/for\s*\(/g) || []).length;
        const whileCount = (methodBody.match(/while\s*\(/g) || []).length;
        const switchCount = (methodBody.match(/switch\s*\(/g) || []).length;
        const catchCount = (methodBody.match(/catch\s*\(/g) || []).length;
        const andCount = (methodBody.match(/&&/g) || []).length;
        const orCount = (methodBody.match(/\|\|/g) || []).length;
        complexity += ifCount + forCount + whileCount + switchCount + catchCount + andCount + orCount;
        return complexity;
    }
    /**
     * Helper methods for parsing (simplified implementations)
     */
    static extractMethodSignature(methodBody) {
        const firstLine = methodBody.split('\n')[0];
        return firstLine.trim();
    }
    static extractReturnType(signature) {
        const parts = signature.split(/\s+/);
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part && !['public', 'private', 'protected', 'static', 'final', 'abstract'].includes(part)) {
                if (i + 1 < parts.length && parts[i + 1].includes('(')) {
                    return part;
                }
            }
        }
        return 'void';
    }
    static extractParameters(signature) {
        const paramMatch = signature.match(/\(([^)]*)\)/);
        if (!paramMatch)
            return [];
        const paramString = paramMatch[1].trim();
        if (!paramString)
            return [];
        return paramString.split(',').map(param => {
            const parts = param.trim().split(/\s+/);
            return {
                name: parts[parts.length - 1],
                type: parts[parts.length - 2] || 'Object'
            };
        });
    }
    static extractCalledMethods(methodBody) {
        // Simplified extraction - in reality, you'd use a proper Java parser
        const methodCalls = [];
        // Look for method calls like: object.method() or Class.method()
        const methodCallRegex = /(\w+)\.(\w+)\s*\(/g;
        let match;
        while ((match = methodCallRegex.exec(methodBody)) !== null) {
            methodCalls.push({
                className: match[1],
                methodName: match[2],
                parameters: [],
                returnType: 'Object',
                isStatic: false
            });
        }
        return methodCalls;
    }
    static extractAnnotations(methodBody) {
        const annotations = [];
        const annotationRegex = /@(\w+)/g;
        let match;
        while ((match = annotationRegex.exec(methodBody)) !== null) {
            annotations.push(match[0]);
        }
        return annotations;
    }
    static extractThrowsExceptions(methodBody) {
        const exceptions = [];
        const throwsRegex = /throws\s+([^;{]+)/g;
        let match;
        while ((match = throwsRegex.exec(methodBody)) !== null) {
            const exceptionList = match[1].split(',').map(e => e.trim());
            exceptions.push(...exceptionList);
        }
        return exceptions;
    }
}
exports.ContextEngineer = ContextEngineer;
//# sourceMappingURL=contextEngineer.js.map