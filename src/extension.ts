import * as vscode from 'vscode';
import { getFunctionFromUser } from './ui/functionPicker';
import { generateMocks } from './analyzer/mockGenerator';
import { EnhancedScenarioGenerator } from './analyzer/scenarioGenerator';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.analyzeJavaFunction', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Nenhum editor de texto ativo.');
      return;
    }

    const document = editor.document;
    const code = document.getText();
    const { name, level } = await getFunctionFromUser();

    if (!name) {
      vscode.window.showWarningMessage('Nome da função não informado.');
      return;
    }

    try {
      const { parseJavaFunction } = await import('./analyzer/javaParser.js');
      const parsedFunction = await parseJavaFunction(code, name);
      
      // Gera mocks baseados nas funções chamadas
      const mockFunctions = parsedFunction.calledFunctions.map(func => func.methodName);
      const mocks = generateMocks(mockFunctions);
      
      // Gera cenários de teste baseados no nível selecionado
      const testSuite = EnhancedScenarioGenerator.generateTestSuite(parsedFunction);
      
      // Filtra cenários baseado no nível selecionado
      const filteredScenarios = filterScenariosByLevel(testSuite.scenarios, level);

      const output = vscode.window.createOutputChannel('Java Function Analyzer');
      output.clear();
      output.appendLine('='.repeat(60));
      output.appendLine(`ANÁLISE DA FUNÇÃO: ${name}`);
      output.appendLine('='.repeat(60));
      
      // Informações básicas da função
      output.appendLine('\n📋 INFORMAÇÕES BÁSICAS:');
      output.appendLine(`   Nome: ${parsedFunction.name}`);
      output.appendLine(`   Tipo de Retorno: ${parsedFunction.returnType}`);
      output.appendLine(`   Visibilidade: ${parsedFunction.visibility}`);
      output.appendLine(`   É Estático: ${parsedFunction.isStatic ? 'Sim' : 'Não'}`);
      output.appendLine(`   Complexidade Ciclomática: ${parsedFunction.complexity}`);
      output.appendLine(`   Linhas de Código: ${parsedFunction.lines}`);
      
      // Anotações
      if (parsedFunction.annotations.length > 0) {
        output.appendLine(`   Anotações: ${parsedFunction.annotations.join(', ')}`);
      }
      
      // Exceções
      if (parsedFunction.throwsExceptions.length > 0) {
        output.appendLine(`   Exceções Declaradas: ${parsedFunction.throwsExceptions.join(', ')}`);
      }
      
      // Parâmetros
      output.appendLine('\n📝 PARÂMETROS:');
      if (parsedFunction.parameters.length === 0) {
        output.appendLine('   Nenhum parâmetro');
      } else {
        parsedFunction.parameters.forEach((param, index) => {
          output.appendLine(`   ${index + 1}. ${param.name} (${param.type})`);
          if (param.annotations && param.annotations.length > 0) {
            output.appendLine(`      Anotações: ${param.annotations.join(', ')}`);
          }
        });
      }
      
      // Variáveis locais
      output.appendLine('\n🔧 VARIÁVEIS LOCAIS:');
      if (parsedFunction.localVariables.length === 0) {
        output.appendLine('   Nenhuma variável local');
      } else {
        parsedFunction.localVariables.forEach((variable, index) => {
          let line = `   ${index + 1}. ${variable.name} (${variable.type})`;
          if (variable.initialValue) {
            line += ` = ${variable.initialValue}`;
          }
          output.appendLine(line);
        });
      }
      
      // Funções chamadas
      output.appendLine('\n📞 FUNÇÕES CHAMADAS:');
      if (parsedFunction.calledFunctions.length === 0) {
        output.appendLine('   Nenhuma função chamada');
      } else {
        parsedFunction.calledFunctions.forEach((func, index) => {
          let line = `   ${index + 1}. ${func.methodName}`;
          if (func.className) {
            line += ` (${func.className})`;
          }
          if (func.parameters.length > 0) {
            line += ` - Parâmetros: ${func.parameters.join(', ')}`;
          }
          if (func.isStaticCall) {
            line += ' [Chamada Estática]';
          }
          output.appendLine(line);
        });
      }
      
      // Mocks sugeridos
      output.appendLine('\n🎭 MOCKS SUGERIDOS:');
      if (mocks.length === 0) {
        output.appendLine('   Nenhum mock necessário');
      } else {
        mocks.forEach((mock, index) => {
          output.appendLine(`   ${index + 1}. ${mock}`);
        });
      }
      
      // Configuração de teste
      output.appendLine('\n⚙️ CONFIGURAÇÃO DE TESTE:');
      output.appendLine('   Imports necessários:');
      testSuite.imports.forEach(imp => {
        output.appendLine(`     ${imp}`);
      });
      
      output.appendLine('\n   Código de setup:');
      testSuite.setupCode.forEach(setup => {
        output.appendLine(`     ${setup}`);
      });
      
      if (testSuite.dependencies.length > 0) {
        output.appendLine('\n   Dependências:');
        testSuite.dependencies.forEach(dep => {
          output.appendLine(`     ${dep}`);
        });
      }
      
      // Cenários de teste
      output.appendLine('\n🧪 CENÁRIOS DE TESTE:');
      output.appendLine(`   Total de cenários gerados: ${testSuite.scenarios.length}`);
      output.appendLine(`   Cenários filtrados (nível ${level}): ${filteredScenarios.length}`);
      
      const categoryCounts = getCategoryCounts(filteredScenarios);
      Object.entries(categoryCounts).forEach(([category, count]) => {
        const categoryNames = {
          'happy-path': 'Caminho Feliz',
          'edge-case': 'Casos Extremos',
          'error-case': 'Casos de Erro',
          'boundary': 'Valores Limite'
        };
        output.appendLine(`   ${categoryNames[category as keyof typeof categoryNames]}: ${count}`);
      });
      
      // Detalhes dos cenários
      filteredScenarios.forEach((scenario, index) => {
        output.appendLine(`\n   📋 CENÁRIO ${index + 1}: ${scenario.name}`);
        output.appendLine(`      Categoria: ${scenario.category}`);
        output.appendLine(`      Descrição: ${scenario.description}`);
        output.appendLine(`      Comportamento Esperado: ${scenario.expectedBehavior}`);
        
        output.appendLine(`      Entradas:`);
        Object.entries(scenario.inputs).forEach(([key, value]) => {
          output.appendLine(`        ${key}: ${value}`);
        });
        
        if (scenario.mockSetup.length > 0) {
          output.appendLine(`      Mock Setup:`);
          scenario.mockSetup.forEach((mock: string) => {
            output.appendLine(`        ${mock}`);
          });
        }
        
        output.appendLine(`      Asserções:`);
        scenario.assertions.forEach((assertion: string) => {
          output.appendLine(`        ${assertion}`);
        });
      });
      
      output.appendLine('\n' + '='.repeat(60));
      output.appendLine(`ANÁLISE CONCLUÍDA - ${new Date().toLocaleString()}`);
      output.appendLine('='.repeat(60));
      
      output.show();
      
      // Mostra mensagem de sucesso
      vscode.window.showInformationMessage(
        `Análise concluída! ${filteredScenarios.length} cenários gerados (nível ${level}).`
      );
      
    } catch (err) {
      const error = err as Error;
      vscode.window.showErrorMessage(`Erro na análise: ${error.message}`);
      console.error('Erro detalhado:', error);
    }
  });

  context.subscriptions.push(disposable);
}

function filterScenariosByLevel(scenarios: any[], level: number): any[] {
  switch (level) {
    case 1:
      // Nível 1: Apenas cenários básicos de caminho feliz
      return scenarios.filter(s => s.category === 'happy-path').slice(0, 3);
    
    case 2:
      // Nível 2: Caminho feliz + casos extremos básicos
      return scenarios.filter(s => 
        s.category === 'happy-path' || s.category === 'edge-case'
      ).slice(0, 8);
    
    case 3:
      // Nível 3: Todos exceto alguns casos de erro complexos
      return scenarios.filter(s => 
        s.category !== 'error-case' || scenarios.indexOf(s) < 5
      );
    
    case 4:
      // Nível 4: Todos os cenários
      return scenarios;
    
    default:
      return scenarios.filter(s => s.category === 'happy-path').slice(0, 3);
  }
}

function getCategoryCounts(scenarios: any[]): { [key: string]: number } {
  const counts: { [key: string]: number } = {};
  
  scenarios.forEach(scenario => {
    counts[scenario.category] = (counts[scenario.category] || 0) + 1;
  });
  
  return counts;
}

export function deactivate() {}