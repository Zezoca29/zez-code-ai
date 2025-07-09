import { TestScenario, TestSuite } from './scenarioGenerator';
import { ParsedFunction } from './javaParser';

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
}

export class UnitTestGenerator {
  
  static generateUnitTestSuite(testSuite: TestSuite, className: string): UnitTestSuite {
    const generator = new UnitTestGenerator();
    
    const tests: UnitTest[] = testSuite.scenarios.map(scenario => 
      generator.convertScenarioToUnitTest(scenario, testSuite.functionName)
    );
    
    return {
      className,
      methodName: testSuite.functionName,
      tests,
      imports: testSuite.imports,
      setupCode: testSuite.setupCode,
      dependencies: testSuite.dependencies
    };
  }
  
  private convertScenarioToUnitTest(scenario: TestScenario, methodName: string): UnitTest {
    return {
      name: scenario.name,
      arrange: this.generateArrangeSection(scenario),
      act: this.generateActSection(scenario, methodName),
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
  
  private generateActSection(scenario: TestScenario, methodName: string): string {
    const inputs = Object.keys(scenario.inputs);
    const inputParams = inputs.length > 0 ? inputs.join(', ') : '';
    
    return `        ${this.getReturnType(scenario)} result = ${methodName}(${inputParams});`;
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
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value.toString();
      return value.toString() + (value.toString().includes('.') ? '' : '.0');
    }
    if (Array.isArray(value)) {
      return `Arrays.asList(${value.map(v => this.convertToJavaValue(v)).join(', ')})`;
    }
    return value.toString();
  }
  
  private getJavaType(value: any): string {
    if (value === null) return 'Object';
    if (typeof value === 'string') return 'String';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return 'int';
      return 'double';
    }
    if (Array.isArray(value)) return 'List<Object>';
    return 'Object';
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
    
    // Classe de teste
    content += `public class ${testSuite.className}Test {\n\n`;
    
    // Setup da classe
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
      'import static org.junit.jupiter.api.Assertions.*;',
      'import org.mockito.Mock;',
      'import org.mockito.MockitoAnnotations;',
      'import static org.mockito.Mockito.*;',
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