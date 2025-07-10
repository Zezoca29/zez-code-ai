import { TestScenario, TestSuite } from './scenarioGenerator';
import { ParsedFunction } from './javaParser';
import { SmartTypeInference } from './smartTypeInference';
import { TestValidator, TestValidationResult, TestValidationContext } from './testValidator';

export interface UnitTest {
  name: string;
  arrange: string[];
  act: string;
  assert: string[];
  category: string;
  description: string;
}

export interface UnitTestSuite {
  className: string;
  methodName: string;
  tests: UnitTest[];
  imports: string[];
  setupCode: string[];
  dependencies: string[];
  classAttributes: string[]; // NOVO CAMPO: atributos da classe (mocks, controller)
  validationResult?: TestValidationResult; // Validation result for the test suite
}

export class UnitTestGenerator {
  
  static generateUnitTestSuite(testSuite: TestSuite, className: string, classAttributes: string[]): UnitTestSuite {
    const generator = new UnitTestGenerator();
    
    const tests: UnitTest[] = testSuite.scenarios.map(scenario => 
      generator.convertScenarioToUnitTest(scenario, testSuite.functionName, className)
    );
    
    // Validate the generated test suite
    const validationContext: TestValidationContext = {
      className,
      methodName: testSuite.functionName,
      returnType: 'Object', // Will be inferred from scenarios
      parameters: [], // Will be populated from scenarios
      calledFunctions: []
    };
    
    const validationResult = TestValidator.validateTestScenarios(testSuite.scenarios, validationContext);
    
    if (!validationResult.isValid) {
      console.warn('Test validation issues found:', validationResult.errors);
    }
    
    return {
      className,
      methodName: testSuite.functionName,
      tests,
      imports: testSuite.imports,
      setupCode: testSuite.setupCode,
      dependencies: testSuite.dependencies,
      classAttributes,
      validationResult // Add validation result to the suite
    };
  }
  
  private convertScenarioToUnitTest(scenario: TestScenario, methodName: string, className: string): UnitTest {
    return {
      name: scenario.name,
      arrange: this.generateArrangeSection(scenario),
      act: this.generateActSection(scenario, methodName, className),
      assert: this.generateAssertSection(scenario),
      category: scenario.category,
      description: scenario.description
    };
  }
  
  private generateArrangeSection(scenario: TestScenario): string[] {
    const arrange: string[] = [];
    
    // Adiciona setup de mocks
    if (scenario.mockSetup.length > 0) {
      arrange.push('// Setup de mocks');
      scenario.mockSetup.forEach(mock => {
        arrange.push(`        ${mock}`);
      });
      arrange.push('');
    }
    
    // Adiciona declaração de variáveis de entrada
    if (Object.keys(scenario.inputs).length > 0) {
      arrange.push('// Preparação dos dados de entrada');
      Object.entries(scenario.inputs).forEach(([key, value]) => {
        const javaValue = this.convertToJavaValue(value);
        arrange.push(`        ${this.getJavaType(value)} ${key} = ${javaValue};`);
      });
      arrange.push('');
    }
    
    return arrange;
  }
  
  private generateActSection(scenario: TestScenario, methodName: string, className: string): string {
    const inputs = Object.keys(scenario.inputs);
    const inputParams = inputs.length > 0 ? inputs.join(', ') : '';
    
    // Usa o nome da instância da classe (primeira letra minúscula da classe)
    const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
    return `        ${this.getReturnType(scenario)} result = ${instanceName}.${methodName}(${inputParams});`;
  }
  
  private generateAssertSection(scenario: TestScenario): string[] {
    const assert: string[] = [];
    
    assert.push('// Verificações');
    scenario.assertions.forEach(assertion => {
      assert.push(`        ${assertion}`);
    });
    
    return assert;
  }
  
  private convertToJavaValue(value: any): string {
    // Use smart type inference for better conversion
    const inference = SmartTypeInference.convertToJavaValue(value, 'Object');
    return inference.javaValue;
  }
  
  private getJavaType(value: any): string {
    // Use smart type inference for better type detection
    const inference = SmartTypeInference.convertToJavaValue(value, 'Object');
    return inference.javaType;
  }
  
  private getReturnType(scenario: TestScenario): string {
    // Tenta inferir o tipo de retorno baseado nas asserções
    if (scenario.assertions.some(a => a.includes('assertNotNull'))) {
      return 'Object';
    }
    if (scenario.assertions.some(a => a.includes('assertTrue') || a.includes('assertFalse'))) {
      return 'boolean';
    }
    if (scenario.assertions.some(a => a.includes('assertEquals') && (a.includes('int') || a.includes('Integer')))) {
      return 'int';
    }
    if (scenario.assertions.some(a => a.includes('assertEquals') && (a.includes('double') || a.includes('Double')))) {
      return 'double';
    }
    if (scenario.assertions.some(a => a.includes('assertEquals') && a.includes('String'))) {
      return 'String';
    }
    if (scenario.assertions.some(a => a.includes('assertThrows'))) {
      return 'void';
    }
    
    // Tenta inferir baseado nos inputs (para casos simples)
    const inputValues = Object.values(scenario.inputs);
    if (inputValues.length > 0) {
      const firstValue = inputValues[0];
      if (typeof firstValue === 'boolean') return 'boolean';
      if (typeof firstValue === 'number') {
        return Number.isInteger(firstValue) ? 'int' : 'double';
      }
      if (typeof firstValue === 'string') return 'String';
    }
    
    return 'Object'; // Tipo padrão
  }
  
  static generateJavaTestFile(testSuite: UnitTestSuite): string {
    const generator = new UnitTestGenerator();
    
    let content = '';
    
    // Dependencies notice
    content += '// Dependencies required: JUnit 5 and Mockito\n';
    content += '// Add to your pom.xml or build.gradle:\n';
    content += '// JUnit 5: org.junit.jupiter:junit-jupiter:5.8.2\n';
    content += '// Mockito: org.mockito:mockito-core:4.5.1\n\n';
    
    // Imports
    content += generator.generateImports(testSuite.imports);
    content += '\n';
    
    // Anotação do teste
    content += '@ExtendWith(MockitoExtension.class)\n';
    
    // Classe de teste
    content += `public class ${testSuite.className}Test {\n\n`;
    
    // Atributos da classe (mocks e controller)
    if (testSuite.classAttributes && testSuite.classAttributes.length > 0) {
      testSuite.classAttributes.forEach(attr => {
        content += `    ${attr}\n`;
      });
      content += '\n';
    }
    
    // Setup de dados (@BeforeEach)
    if (testSuite.setupCode.length > 0) {
      content += '    @BeforeEach\n';
      content += '    public void setUp() {\n';
      testSuite.setupCode.forEach(setup => {
        content += `        ${setup}\n`;
      });
      content += '    }\n\n';
    }
    
    // Métodos de teste
    testSuite.tests.forEach(test => {
      content += generator.generateTestMethod(test);
      content += '\n';
    });
    
    content += '}\n';
    
    return content;
  }
  
  private generateImports(imports: string[]): string {
    const defaultImports = [
      'import org.junit.jupiter.api.Test;',
      'import org.junit.jupiter.api.BeforeEach;',
      'import org.junit.jupiter.api.extension.ExtendWith;',
      'import static org.junit.jupiter.api.Assertions.*;',
      'import org.mockito.Mock;',
      'import org.mockito.MockitoAnnotations;',
      'import org.mockito.junit.jupiter.MockitoExtension;',
      'import org.mockito.InjectMocks;',
      'import static org.mockito.Mockito.*;',
      'import static org.assertj.core.api.Assertions.*;',
      'import java.util.*;',
      'import java.util.Arrays;'
    ];
    
    const allImports = [...new Set([...defaultImports, ...imports])];
    return allImports.join('\n');
  }
  
  private generateTestMethod(test: UnitTest): string {
    let method = '';
    
    // Comentário com descrição
    method += `    /**\n`;
    method += `     * ${test.description}\n`;
    method += `     * Categoria: ${this.getCategoryDisplayName(test.category)}\n`;
    method += `     */\n`;
    
    // Anotação do teste
    method += `    @Test\n`;
    method += `    public void ${test.name}() {\n`;
    
    // Arrange
    if (test.arrange.length > 0) {
      method += `        // Arrange\n`;
      test.arrange.forEach(line => {
        method += `        ${line}\n`;
      });
    }
    
    // Act
    method += `        // Act\n`;
    method += `        ${test.act}\n`;
    
    // Assert
    if (test.assert.length > 0) {
      method += `        // Assert\n`;
      test.assert.forEach(line => {
        method += `        ${line}\n`;
      });
    }
    
    method += `    }\n`;
    
    return method;
  }
  
  private getCategoryDisplayName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'happy-path': 'Caminho Feliz',
      'edge-case': 'Caso Extremo',
      'error-case': 'Caso de Erro',
      'boundary': 'Valor Limite'
    };
    
    return categoryMap[category] || category;
  }
} 