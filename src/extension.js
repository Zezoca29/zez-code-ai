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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const functionPicker_1 = require("./ui/functionPicker");
const scenarioGenerator_1 = require("./analyzer/scenarioGenerator");
const javaParserClass_1 = require("./analyzer/javaParserClass"); // Parser com busca em classe
const unitTestGenerator_1 = require("./analyzer/unitTestGenerator");
const mockGenerator_1 = require("./analyzer/mockGenerator");
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.analyzeJavaFunction', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Nenhum editor de texto ativo.');
            return;
        }
        const document = editor.document;
        const code = document.getText();
        const { name, level, className } = await (0, functionPicker_1.getFunctionFromUser)();
        if (!name) {
            vscode.window.showWarningMessage('Nome da função não informado.');
            return;
        }
        // NOVA VALIDAÇÃO: Tornar className obrigatório
        if (!className || className.trim() === '') {
            vscode.window.showWarningMessage('Nome da classe é obrigatório.');
            return;
        }
        try {
            let parsedFunction;
            let searchResult;
            // Log de debug para cache
            const cacheStats = (0, javaParserClass_1.getCacheStats)();
            console.log(`Cache stats antes da busca: ${JSON.stringify(cacheStats)}`);
            // Sempre usar o parser com busca em classe (agora obrigatório)
            console.log(`Iniciando busca para: ${className.trim()}.${name}`);
            searchResult = await (0, javaParserClass_1.parseJavaFunctionInClass)(code, className.trim(), name);
            if (!searchResult.className) {
                // Mostrar erro com sugestões
                let errorMessage = searchResult.error || 'Método não encontrado';
                if (searchResult.suggestions && searchResult.suggestions.length > 0) {
                    errorMessage += `\n\nSugestões disponíveis: ${searchResult.suggestions.join(', ')}`;
                }
                console.error(`Busca falhou: ${errorMessage}`);
                vscode.window.showErrorMessage(errorMessage);
                return;
            }
            console.log(`Busca bem-sucedida: ${searchResult.className}.${name}`);
            parsedFunction = searchResult.method;
            const decisionAnalysis = await (0, javaParserClass_1.analyzeDecisionBranches)(code, searchResult.className, name);
            // Gera mocks avançados baseados nas funções chamadas com análise detalhada das classes
            const advancedMockResult = await (0, mockGenerator_1.generateAdvancedMocks)(code, parsedFunction.calledFunctions);
            const mocks = advancedMockResult.basicMocks;
            const mockSetup = advancedMockResult.enhancedSetup;
            // Gera cenários de teste baseados no nível selecionado
            const testSuite = scenarioGenerator_1.EnhancedScenarioGenerator.generateTestSuite(parsedFunction);
            // Filtra cenários baseado no nível selecionado
            const filteredScenarios = filterScenariosByLevel(testSuite.scenarios, level);
            // Gera testes unitários no padrão AAA
            const unitTestSuite = unitTestGenerator_1.UnitTestGenerator.generateUnitTestSuite({ ...testSuite, scenarios: filteredScenarios }, searchResult.className);
            // Tenta salvar o arquivo de testes unitários
            let testFileCreated = false;
            try {
                testFileCreated = await saveUnitTestFile(unitTestSuite, document.uri);
            }
            catch (error) {
                console.warn('Erro ao salvar arquivo de testes:', error);
            }
            const output = vscode.window.createOutputChannel('Java Function Analyzer');
            output.clear();
            output.appendLine('='.repeat(60));
            // Título sempre com classe e método
            output.appendLine(`ANÁLISE DO MÉTODO: ${searchResult.className}.${name}`);
            output.appendLine('='.repeat(60));
            // Informações sobre a busca (sempre presente agora)
            output.appendLine('\n🔍 INFORMAÇÕES DA BUSCA:');
            output.appendLine(`   Classe: ${searchResult.className}`);
            output.appendLine(`   Método: ${name}`);
            output.appendLine(`   Status: Encontrado com sucesso`);
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
            }
            else {
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
            }
            else {
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
            }
            else {
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
            // Mocks sugeridos com análise de classes
            output.appendLine('\n🎭 MOCKS AVANÇADOS COM ANÁLISE DE CLASSES:');
            if (mocks.length === 0) {
                output.appendLine('   Nenhum mock necessário');
            }
            else {
                output.appendLine('   Mocks básicos:');
                mocks.forEach((mock, index) => {
                    output.appendLine(`   ${index + 1}. ${mock}`);
                });
                if (mockSetup.length > 0) {
                    output.appendLine('\n   Setup avançado com análise de classes:');
                    mockSetup.forEach((setup) => {
                        output.appendLine(`   ${setup}`);
                    });
                }
                // Informações sobre análise de classes
                if (advancedMockResult.classAnalysis.length > 0) {
                    output.appendLine('\n   📊 ANÁLISE DETALHADA DAS CLASSES:');
                    advancedMockResult.classAnalysis.forEach((classInfo, index) => {
                        output.appendLine(`   ${index + 1}. Classe: ${classInfo.className}`);
                        output.appendLine(`      Campos: ${classInfo.fields.length}`);
                        output.appendLine(`      Construtores: ${classInfo.constructors.length}`);
                        output.appendLine(`      Métodos: ${classInfo.methods.length}`);
                        output.appendLine(`      Dependências: ${classInfo.dependencies.length}`);
                    });
                }
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
            // Informações detalhadas das classes analisadas
            if (advancedMockResult.classAnalysis.length > 0) {
                output.appendLine('\n🏗️ INFORMAÇÕES DETALHADAS DAS CLASSES:');
                advancedMockResult.classAnalysis.forEach((classInfo, index) => {
                    output.appendLine(`\n   📦 CLASSE ${index + 1}: ${classInfo.className}`);
                    // Campos da classe
                    if (classInfo.fields.length > 0) {
                        output.appendLine(`   📋 Campos (${classInfo.fields.length}):`);
                        classInfo.fields.forEach((field, fieldIndex) => {
                            let fieldInfo = `     ${fieldIndex + 1}. ${field.visibility} ${field.type} ${field.name}`;
                            if (field.isStatic)
                                fieldInfo += ' (static)';
                            if (field.isFinal)
                                fieldInfo += ' (final)';
                            if (field.initialValue)
                                fieldInfo += ` = ${field.initialValue}`;
                            if (field.annotations.length > 0) {
                                fieldInfo += ` [@${field.annotations.join(', @')}]`;
                            }
                            output.appendLine(fieldInfo);
                        });
                    }
                    // Construtores da classe
                    if (classInfo.constructors.length > 0) {
                        output.appendLine(`   🔨 Construtores (${classInfo.constructors.length}):`);
                        classInfo.constructors.forEach((constructor, constIndex) => {
                            const params = constructor.parameters.map(p => `${p.type} ${p.name}`).join(', ');
                            let constInfo = `     ${constIndex + 1}. ${constructor.visibility} ${classInfo.className}(${params})`;
                            if (constructor.annotations.length > 0) {
                                constInfo += ` [@${constructor.annotations.join(', @')}]`;
                            }
                            output.appendLine(constInfo);
                        });
                    }
                    // Métodos da classe
                    if (classInfo.methods.length > 0) {
                        output.appendLine(`   ⚙️ Métodos (${classInfo.methods.length}):`);
                        classInfo.methods.forEach((method, methodIndex) => {
                            const params = method.parameters.map(p => `${p.type} ${p.name}`).join(', ');
                            let methodInfo = `     ${methodIndex + 1}. ${method.visibility} ${method.returnType} ${method.name}(${params})`;
                            if (method.isStatic)
                                methodInfo += ' (static)';
                            if (method.isAbstract)
                                methodInfo += ' (abstract)';
                            if (method.annotations.length > 0) {
                                methodInfo += ` [@${method.annotations.join(', @')}]`;
                            }
                            if (method.throwsExceptions.length > 0) {
                                methodInfo += ` throws ${method.throwsExceptions.join(', ')}`;
                            }
                            output.appendLine(methodInfo);
                        });
                    }
                    // Dependências da classe
                    if (classInfo.dependencies.length > 0) {
                        output.appendLine(`   📚 Dependências (${classInfo.dependencies.length}):`);
                        classInfo.dependencies.forEach((dep, depIndex) => {
                            output.appendLine(`     ${depIndex + 1}. ${dep}`);
                        });
                    }
                });
            }
            // Análise de Ramos de Decisão
            output.appendLine('\n🔀 ANÁLISE DE RAMOS DE DECISÃO:');
            output.appendLine(`   Total de ramos: ${decisionAnalysis.totalBranches}`);
            output.appendLine(`   Complexidade Ciclomática: ${decisionAnalysis.cyclomaticComplexity}`);
            decisionAnalysis.scenarios.forEach((scenario, index) => {
                output.appendLine(`\n   🧩 CENÁRIO ${index + 1}: ${scenario.scenario}`);
                output.appendLine(`      Cobertura: ${scenario.coverage} ramos`);
                output.appendLine(`      Nível de risco: ${scenario.riskLevel.toUpperCase()}`);
                scenario.branches.forEach((branch, idx) => {
                    output.appendLine(`        ${idx + 1}. [${branch.type}] ${branch.condition}`);
                    output.appendLine(`           Linha: ${branch.startLine} → ${branch.endLine}`);
                    output.appendLine(`           Complexidade: ${branch.complexity}`);
                    if (branch.calledFunctions.length > 0) {
                        output.appendLine(`           Funções chamadas: ${branch.calledFunctions.map(f => f.methodName).join(', ')}`);
                    }
                });
            });
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
                output.appendLine(`   ${categoryNames[category]}: ${count}`);
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
                    scenario.mockSetup.forEach((mock) => {
                        output.appendLine(`        ${mock}`);
                    });
                }
                output.appendLine(`      Asserções:`);
                scenario.assertions.forEach((assertion) => {
                    output.appendLine(`        ${assertion}`);
                });
            });
            output.appendLine('\n' + '='.repeat(60));
            output.appendLine(`ANÁLISE CONCLUÍDA - ${new Date().toLocaleString()}`);
            output.appendLine('='.repeat(60));
            // Informações sobre o arquivo de testes gerado
            if (testFileCreated) {
                output.appendLine('\n📁 ARQUIVO DE TESTES GERADO:');
                output.appendLine(`   Arquivo: ${searchResult.className}Test.java`);
                output.appendLine(`   Localização: pasta test/`);
                output.appendLine(`   Padrão: AAA (Arrange, Act, Assert)`);
                output.appendLine(`   Total de testes: ${unitTestSuite.tests.length}`);
            }
            output.appendLine('='.repeat(60));
            output.show();
            // Resumo final da análise
            output.appendLine('\n📊 RESUMO FINAL DA ANÁLISE:');
            output.appendLine('='.repeat(60));
            if (searchResult) {
                output.appendLine(`✅ Método ${searchResult.className}.${name} encontrado com sucesso`);
            }
            output.appendLine(`📋 Cenários gerados: ${filteredScenarios.length} (nível ${level})`);
            output.appendLine(`🔀 Ramos analisados: ${decisionAnalysis.totalBranches}`);
            output.appendLine(`📈 Complexidade Ciclomática: ${decisionAnalysis.cyclomaticComplexity}`);
            output.appendLine(`🏗️ Classes analisadas: ${advancedMockResult.classAnalysis.length}`);
            if (testFileCreated) {
                output.appendLine(`📁 Arquivo de testes gerado: ${searchResult.className}Test.java`);
            }
            output.appendLine('='.repeat(60));
            // Mensagem de sucesso simplificada
            vscode.window.showInformationMessage(`Análise concluída! ${filteredScenarios.length} cenários gerados (nível ${level}).`);
        }
        catch (err) {
            const error = err;
            vscode.window.showErrorMessage(`Erro na análise: ${error.message}`);
            console.error('Erro detalhado:', error);
        }
    });
    context.subscriptions.push(disposable);
    // Comando para limpar cache do parser
    let clearCacheDisposable = vscode.commands.registerCommand('extension.clearParserCache', () => {
        (0, javaParserClass_1.clearParserCache)();
        const stats = (0, javaParserClass_1.getCacheStats)();
        vscode.window.showInformationMessage(`Cache limpo! Estatísticas: ${JSON.stringify(stats)}`);
    });
    context.subscriptions.push(clearCacheDisposable);
}
function filterScenariosByLevel(scenarios, level) {
    switch (level) {
        case 1:
            // Nível 1: Apenas cenários básicos de caminho feliz
            return scenarios.filter(s => s.category === 'happy-path').slice(0, 3);
        case 2:
            // Nível 2: Caminho feliz + casos extremos básicos
            return scenarios.filter(s => s.category === 'happy-path' || s.category === 'edge-case').slice(0, 8);
        case 3:
            // Nível 3: Todos exceto alguns casos de erro complexos
            return scenarios.filter(s => s.category !== 'error-case' || scenarios.indexOf(s) < 5);
        case 4:
            // Nível 4: Todos os cenários
            return scenarios;
        default:
            return scenarios.filter(s => s.category === 'happy-path').slice(0, 3);
    }
}
function getCategoryCounts(scenarios) {
    const counts = {};
    scenarios.forEach(scenario => {
        counts[scenario.category] = (counts[scenario.category] || 0) + 1;
    });
    return counts;
}
async function saveUnitTestFile(unitTestSuite, documentUri) {
    try {
        // Obtém o diretório do arquivo atual
        const currentDir = vscode.Uri.file(vscode.workspace.getWorkspaceFolder(documentUri)?.uri.fsPath || '');
        // Define o caminho para a pasta test
        const testDir = vscode.Uri.joinPath(currentDir, 'src', 'test');
        // Verifica se existe a pasta test, se não existir, cria
        try {
            await vscode.workspace.fs.stat(testDir);
            console.log('Pasta test já existe');
        }
        catch (error) {
            // Pasta test não existe, vamos criar
            console.log('Pasta test não encontrada, criando...');
            try {
                await vscode.workspace.fs.createDirectory(testDir);
                console.log('Pasta test criada com sucesso');
            }
            catch (createError) {
                console.error('Erro ao criar pasta test:', createError);
                return false;
            }
        }
        // Gera o conteúdo do arquivo de teste
        const testContent = unitTestGenerator_1.UnitTestGenerator.generateJavaTestFile(unitTestSuite);
        // Define o nome do arquivo
        const testFileName = `${unitTestSuite.className}Test.java`;
        const testFilePath = vscode.Uri.joinPath(testDir, testFileName);
        // Converte o conteúdo para Uint8Array
        const contentBytes = new TextEncoder().encode(testContent);
        // Salva o arquivo
        await vscode.workspace.fs.writeFile(testFilePath, contentBytes);
        console.log(`Arquivo de testes criado: ${testFilePath.fsPath}`);
        return true;
    }
    catch (error) {
        console.error('Erro ao salvar arquivo de testes:', error);
        return false;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map