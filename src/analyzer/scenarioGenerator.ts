import { Parameter, ParsedFunction, CalledFunction  } from './javaParser';
import { SmartTypeInference } from './smartTypeInference';

export interface TestScenario {
  name: string;
  description: string;
  inputs: { [key: string]: any };
  expectedBehavior: string;
  mockSetup: string[];
  assertions: string[];
  category: 'happy-path' | 'edge-case' | 'error-case' | 'boundary';
}

export interface TestSuite {
  functionName: string;
  scenarios: TestScenario[];
  setupCode: string[];
  dependencies: string[];
  imports: string[];
}

export class EnhancedScenarioGenerator {
  
  static generateTestSuite(parsedFunction: ParsedFunction): TestSuite {
    const generator = new EnhancedScenarioGenerator();
    
    const scenarios: TestScenario[] = [
      ...generator.generateHappyPathScenarios(parsedFunction),
      ...generator.generateEdgeCaseScenarios(parsedFunction),
      ...generator.generateErrorCaseScenarios(parsedFunction),
      ...generator.generateBoundaryScenarios(parsedFunction)
    ];
    
    return {
      functionName: parsedFunction.name,
      scenarios,
      setupCode: generator.generateSetupCode(parsedFunction),
      dependencies: generator.extractDependencies(parsedFunction),
      imports: generator.generateImports(parsedFunction)
    };
  }
  
  private generateHappyPathScenarios(func: ParsedFunction): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    // Cenário básico com valores válidos
    const basicInputs = this.generateBasicInputs(func.parameters);
    scenarios.push({
      name: `test${func.name}WithValidInputs`,
      description: `Testa ${func.name} com entradas válidas`,
      inputs: basicInputs,
      expectedBehavior: this.generateExpectedBehavior(func, basicInputs),
      mockSetup: this.generateMockSetup(func.calledFunctions),
      assertions: this.generateBasicAssertions(func),
      category: 'happy-path'
    });
    
    // Cenários com diferentes combinações de valores válidos
    const validCombinations = this.generateValidCombinations(func.parameters);
    validCombinations.forEach((combination, index) => {
      scenarios.push({
        name: `test${func.name}WithValidInputs${index + 1}`,
        description: `Testa ${func.name} com combinação válida ${index + 1}`,
        inputs: combination,
        expectedBehavior: this.generateExpectedBehavior(func, combination),
        mockSetup: this.generateMockSetup(func.calledFunctions),
        assertions: this.generateBasicAssertions(func),
        category: 'happy-path'
      });
    });
    
    return scenarios;
  }
  
  private generateEdgeCaseScenarios(func: ParsedFunction): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    func.parameters.forEach(param => {
      const edgeCases = this.getEdgeCasesForType(param.type);
      
      edgeCases.forEach((edgeCase, index) => {
        const inputs = this.generateBasicInputs(func.parameters);
        inputs[param.name] = edgeCase.value;
        
        scenarios.push({
          name: `test${func.name}With${param.name}${edgeCase.name}`,
          description: `Testa ${func.name} quando ${param.name} é ${edgeCase.description}`,
          inputs,
          expectedBehavior: edgeCase.expectedBehavior,
          mockSetup: this.generateMockSetup(func.calledFunctions),
          assertions: this.generateEdgeCaseAssertions(func, param, edgeCase),
          category: 'edge-case'
        });
      });
    });
    
    return scenarios;
  }
  
  private generateErrorCaseScenarios(func: ParsedFunction): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    // Cenários com valores nulos
    func.parameters.forEach(param => {
      if (this.canBeNull(param.type)) {
        const inputs = this.generateBasicInputs(func.parameters);
        inputs[param.name] = null;
        
        scenarios.push({
          name: `test${func.name}With${param.name}Null`,
          description: `Testa ${func.name} quando ${param.name} é null`,
          inputs,
          expectedBehavior: func.throwsExceptions.length > 0 ? 'Should throw exception' : 'Should handle null gracefully',
          mockSetup: this.generateMockSetup(func.calledFunctions),
          assertions: this.generateNullAssertions(func, param),
          category: 'error-case'
        });
      }
    });
    
    // Cenários com exceções de métodos chamados
    func.calledFunctions.forEach(calledFunction => {
      scenarios.push({
        name: `test${func.name}When${calledFunction.methodName}ThrowsException`,
        description: `Testa ${func.name} quando ${calledFunction.methodName} lança exceção`,
        inputs: this.generateBasicInputs(func.parameters),
        expectedBehavior: 'Should handle exception appropriately',
        mockSetup: this.generateExceptionMockSetup(calledFunction),
        assertions: this.generateExceptionAssertions(func, calledFunction),
        category: 'error-case'
      });
    });
    
    return scenarios;
  }
  
  private generateBoundaryScenarios(func: ParsedFunction): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    func.parameters.forEach(param => {
      const boundaryValues = this.getBoundaryValuesForType(param.type);
      
      boundaryValues.forEach(boundaryValue => {
        const inputs = this.generateBasicInputs(func.parameters);
        inputs[param.name] = boundaryValue.value;
        
        scenarios.push({
          name: `test${func.name}With${param.name}${boundaryValue.name}`,
          description: `Testa ${func.name} com ${param.name} no valor limite: ${boundaryValue.description}`,
          inputs,
          expectedBehavior: boundaryValue.expectedBehavior,
          mockSetup: this.generateMockSetup(func.calledFunctions),
          assertions: this.generateBoundaryAssertions(func, param, boundaryValue),
          category: 'boundary'
        });
      });
    });
    
    return scenarios;
  }
  
  private generateBasicInputs(parameters: Parameter[]): { [key: string]: any } {
    const inputs: { [key: string]: any } = {};
    
    parameters.forEach(param => {
      inputs[param.name] = this.getDefaultValueForType(param.type);
    });
    
    return inputs;
  }
  
  private generateValidCombinations(parameters: Parameter[]): { [key: string]: any }[] {
    const combinations: { [key: string]: any }[] = [];
    
    // Gera até 3 combinações válidas diferentes
    for (let i = 0; i < Math.min(3, parameters.length); i++) {
      const combination: { [key: string]: any } = {};
      
      parameters.forEach(param => {
        const validValues = this.getValidValuesForType(param.type);
        combination[param.name] = validValues[i % validValues.length];
      });
      
      combinations.push(combination);
    }
    
    return combinations;
  }
  
  private getDefaultValueForType(type: string): any {
    // Use smart type inference for better default value generation
    const inference = SmartTypeInference.inferType(type);
    return inference.javaValue;
  }
  
  private getValidValuesForType(type: string): any[] {
    const typeMap: { [key: string]: any[] } = {
      'int': [1, 10, 100],
      'Integer': [1, 10, 100],
      'long': [1, 100, 1000],
      'Long': [1, 100, 1000],
      'float': [1.0, 10.5, 100.99],
      'Float': [1.0, 10.5, 100.99],
      'double': [1.0, 10.5, 100.99],
      'Double': [1.0, 10.5, 100.99],
      'boolean': [true, false],
      'Boolean': [true, false],
      'String': ['"test"', '"hello"', '"world"'],
      'char': ["'a'", "'b'", "'c'"],
      'Character': ["'a'", "'b'", "'c'"]
    };
    
    return typeMap[type] || [this.getDefaultValueForType(type)];
  }
  
  private getEdgeCasesForType(type: string): Array<{name: string, value: any, description: string, expectedBehavior: string}> {
    const edgeCases: { [key: string]: Array<{name: string, value: any, description: string, expectedBehavior: string}> } = {
      'String': [
        { name: 'Empty', value: '""', description: 'string vazia', expectedBehavior: 'Should handle empty string' },
        { name: 'Whitespace', value: '" "', description: 'apenas espaços', expectedBehavior: 'Should handle whitespace string' },
        { name: 'VeryLong', value: '"a".repeat(1000)', description: 'muito longa', expectedBehavior: 'Should handle very long string' }
      ],
      'int': [
        { name: 'Zero', value: 0, description: 'zero', expectedBehavior: 'Should handle zero value' },
        { name: 'Negative', value: -1, description: 'negativo', expectedBehavior: 'Should handle negative value' }
      ],
      'Integer': [
        { name: 'Zero', value: 0, description: 'zero', expectedBehavior: 'Should handle zero value' },
        { name: 'Negative', value: -1, description: 'negativo', expectedBehavior: 'Should handle negative value' }
      ]
    };
    
    return edgeCases[type] || [];
  }
  
  private getBoundaryValuesForType(type: string): Array<{name: string, value: any, description: string, expectedBehavior: string}> {
    const boundaryValues: { [key: string]: Array<{name: string, value: any, description: string, expectedBehavior: string}> } = {
      'int': [
        { name: 'MaxValue', value: 'Integer.MAX_VALUE', description: 'valor máximo', expectedBehavior: 'Should handle max value' },
        { name: 'MinValue', value: 'Integer.MIN_VALUE', description: 'valor mínimo', expectedBehavior: 'Should handle min value' }
      ],
      'Integer': [
        { name: 'MaxValue', value: 'Integer.MAX_VALUE', description: 'valor máximo', expectedBehavior: 'Should handle max value' },
        { name: 'MinValue', value: 'Integer.MIN_VALUE', description: 'valor mínimo', expectedBehavior: 'Should handle min value' }
      ],
      'long': [
        { name: 'MaxValue', value: 'Long.MAX_VALUE', description: 'valor máximo', expectedBehavior: 'Should handle max value' },
        { name: 'MinValue', value: 'Long.MIN_VALUE', description: 'valor mínimo', expectedBehavior: 'Should handle min value' }
      ]
    };
    
    return boundaryValues[type] || [];
  }
  
  private canBeNull(type: string): boolean {
    const primitiveTypes = ['int', 'long', 'float', 'double', 'boolean', 'char', 'byte', 'short'];
    return !primitiveTypes.includes(type);
  }
  
  private generateExpectedBehavior(func: ParsedFunction, inputs: { [key: string]: any }): string {
    if (func.returnType === 'void') {
      return 'Should execute without throwing exception';
    }
    return `Should return valid ${func.returnType}`;
  }
  
  private generateMockSetup(calledFunctions: CalledFunction[]): string[] {
    // Gera setup de mocks apenas para dependências reais, nunca mockObject
    return calledFunctions
      .filter(func => func.className && !['ResponseEntity', 'HttpStatus', 'List', 'Map', 'Set', 'Optional'].includes(func.className))
      .map(func => {
        const mockName = func.className!.charAt(0).toLowerCase() + func.className!.slice(1);
        return `when(${mockName}.${func.methodName}(${func.parameters.map(() => 'any()').join(', ')})).thenReturn(${this.getDefaultReturnValue(func.returnType || 'Object')});`;
      });
  }
  
  private generateExceptionMockSetup(calledFunction: CalledFunction): string[] {
    return [
      `when(${calledFunction.className || 'mockObject'}.${calledFunction.methodName}(${calledFunction.parameters.map(() => 'any()').join(', ')})).thenThrow(new RuntimeException("Test exception"));`
    ];
  }
  
  private generateBasicAssertions(func: ParsedFunction): string[] {
    const assertions: string[] = [];
    
    if (func.returnType !== 'void') {
      assertions.push(`assertThat(result).isNotNull();`);
      
      if (func.returnType === 'String') {
        assertions.push(`assertThat(result).isNotEmpty();`);
      }
      
      if (func.returnType.includes('List') || func.returnType.includes('Collection')) {
        assertions.push(`assertThat(result).isNotEmpty();`);
      }
    }
    
    // Verifica se métodos foram chamados, apenas para dependências reais
    func.calledFunctions
      .filter(calledFunction => calledFunction.className && !['ResponseEntity', 'HttpStatus', 'List', 'Map', 'Set', 'Optional'].includes(calledFunction.className))
      .forEach(calledFunction => {
        const mockName = calledFunction.className!.charAt(0).toLowerCase() + calledFunction.className!.slice(1);
        assertions.push(`verify(${mockName}).${calledFunction.methodName}(${calledFunction.parameters.map(() => 'any()').join(', ')});`);
      });
  
    return assertions;
  }
  
  private generateEdgeCaseAssertions(func: ParsedFunction, param: Parameter, edgeCase: any): string[] {
    const assertions = this.generateBasicAssertions(func);
    
    if (edgeCase.name === 'Empty' && func.returnType === 'String') {
      assertions.push(`assertThat(result).isEmpty();`);
    }
    
    return assertions;
  }
  
  private generateNullAssertions(func: ParsedFunction, param: Parameter): string[] {
    if (func.throwsExceptions.includes('NullPointerException') || 
        func.throwsExceptions.includes('IllegalArgumentException')) {
      return [`assertThrows(${func.throwsExceptions[0]}.class, () -> ${func.name}(${param.name}));`];
    }
    
    return this.generateBasicAssertions(func);
  }
  
  private generateExceptionAssertions(func: ParsedFunction, calledFunction: CalledFunction): string[] {
    return [
      `assertThrows(RuntimeException.class, () -> ${func.name}(${func.parameters.map(p => this.getDefaultValueForType(p.type)).join(', ')}));`
    ];
  }
  
  private generateBoundaryAssertions(func: ParsedFunction, param: Parameter, boundaryValue: any): string[] {
    const assertions = this.generateBasicAssertions(func);
    
    if (boundaryValue.name.includes('Max') || boundaryValue.name.includes('Min')) {
      assertions.push(`// Verify behavior with boundary value: ${boundaryValue.description}`);
    }
    
    return assertions;
  }
  
  private getDefaultReturnValue(type: string): string {
    // Use smart type inference for better mock return value generation
    return SmartTypeInference.generateMockReturnValue(type);
  }
  
  private generateSetupCode(func: ParsedFunction): string[] {
    const setupCode: string[] = [];
    // Apenas inicialização de dados (ex: DTOs), não mocks nem controller
    // Exemplo: sampleTransaction = new TransactionDTO();
    // (Detectar DTOs por heurística: termina com DTO ou contém DTO)
    func.localVariables?.forEach(variable => {
      if (variable.type.endsWith('DTO') || variable.type.includes('DTO')) {
        setupCode.push(`${variable.name} = new ${variable.type}();`);
      }
    });
    return setupCode;
  }
  
  public static generateClassAttributes(func: ParsedFunction, className: string): string[] {
    const attributes: string[] = [];
    // Mocks: dependências reais do controller (exclui ResponseEntity, tipos java, etc)
    const uniqueClasses = [...new Set(func.calledFunctions.map(f => f.className).filter((c): c is string => !!c && !['ResponseEntity', 'HttpStatus', 'List', 'Map', 'Set', 'Optional'].includes(c)))];
    uniqueClasses.forEach(className => {
      attributes.push(`@Mock`);
      attributes.push(`private ${className} ${className.charAt(0).toLowerCase() + className.slice(1)};`);
    });
    // Controller
    attributes.push(`@InjectMocks`);
    attributes.push(`private ${className} ${className.charAt(0).toLowerCase() + className.slice(1)};`);
    // DTOs e outros atributos podem ser adicionados se necessário
    return attributes;
  }
  
  private extractDependencies(func: ParsedFunction): string[] {
    const dependencies: string[] = [];
    
    // Adiciona dependências baseadas nos tipos usados
    func.parameters.forEach(param => {
      if (param.type.includes('List')) dependencies.push('java.util.List');
      if (param.type.includes('Map')) dependencies.push('java.util.Map');
      if (param.type.includes('Set')) dependencies.push('java.util.Set');
    });
    
    return [...new Set(dependencies)];
  }
  
  private generateImports(func: ParsedFunction): string[] {
    const imports = [
      'import org.junit.jupiter.api.Test;',
      'import org.junit.jupiter.api.BeforeEach;',
      'import org.mockito.Mock;',
      'import org.mockito.InjectMocks;',
      'import org.mockito.MockitoAnnotations;',
      'import static org.mockito.Mockito.*;',
      'import static org.assertj.core.api.Assertions.*;',
      'import static org.junit.jupiter.api.Assertions.*;'
    ];
    
    // Adiciona imports das classes que serão mockadas
    const mockableClasses = [...new Set(func.calledFunctions
      .filter(f => f.className && !['ResponseEntity', 'HttpStatus', 'List', 'Map', 'Set', 'Optional'].includes(f.className))
      .map(f => f.className!))];
    
    mockableClasses.forEach(className => {
      imports.push(`import ${className};`);
    });
    
    return imports;
  }
  
  public static extractClassName(func: ParsedFunction): string {
    // Usa o nome real da classe se disponível
    if ((func as any).className && typeof (func as any).className === 'string') {
      return (func as any).className;
    }
    return 'TestedClass';
  }
}