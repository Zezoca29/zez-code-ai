"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMock = generateMock;
exports.generateMocks = generateMocks;
exports.generateMockSetup = generateMockSetup;
exports.generateAdvancedMocks = generateAdvancedMocks;
exports.generateCompleteMockSetup = generateCompleteMockSetup;
const classAnalyzer_1 = require("./classAnalyzer");
function generateMock(calledFunction) {
    const { methodName, className, parameters, isStaticCall, returnType } = calledFunction;
    // Determinar o tipo de retorno baseado na classe ou usar padrão
    let mockReturnType = returnType || 'Object';
    // Se temos o nome da classe, usar para gerar um mock mais específico
    if (className) {
        // Mapear tipos comuns para mocks apropriados
        const typeMapping = {
            'String': 'String',
            'Integer': 'Integer',
            'Long': 'Long',
            'Double': 'Double',
            'Float': 'Float',
            'Boolean': 'Boolean',
            'List': 'List',
            'Map': 'Map',
            'Set': 'Set',
            'Optional': 'Optional',
            'BigDecimal': 'BigDecimal',
            'Date': 'Date',
            'LocalDate': 'LocalDate',
            'LocalDateTime': 'LocalDateTime',
            'UUID': 'UUID'
        };
        // Verificar se a classe é um tipo conhecido
        if (typeMapping[className]) {
            mockReturnType = typeMapping[className];
        }
        else {
            // Para classes customizadas, usar o nome da classe
            mockReturnType = className;
        }
    }
    // Gerar parâmetros para o mock
    const mockParameters = parameters.length > 0
        ? parameters.map(() => 'any()').join(', ')
        : '';
    // Gerar o mock baseado no tipo de chamada
    if (isStaticCall && className) {
        // Para chamadas estáticas, mockar a classe
        return `when(${className}.${methodName}(${mockParameters})).thenReturn(mock${mockReturnType}());`;
    }
    else if (className) {
        // Para chamadas de instância, mockar o objeto
        const mockObjectName = `${className.toLowerCase()}Mock`;
        return `when(${mockObjectName}.${methodName}(${mockParameters})).thenReturn(mock${mockReturnType}());`;
    }
    else {
        // Fallback para métodos sem classe identificada
        return `when(${methodName}(${mockParameters})).thenReturn(mock${mockReturnType}());`;
    }
}
function generateMocks(calledFunctions) {
    return calledFunctions.map((func) => generateMock(func));
}
function generateMockSetup(calledFunctions) {
    const setup = [];
    // Agrupar por classe para criar mocks organizados
    const groupedByClass = {};
    calledFunctions.forEach(func => {
        if (func.className) {
            if (!groupedByClass[func.className]) {
                groupedByClass[func.className] = [];
            }
            groupedByClass[func.className].push(func);
        }
    });
    // Gerar setup para cada classe
    Object.entries(groupedByClass).forEach(([className, functions]) => {
        const mockObjectName = `${className.toLowerCase()}Mock`;
        // Adicionar declaração do mock se não for estático
        const nonStaticFunctions = functions.filter(f => !f.isStaticCall);
        if (nonStaticFunctions.length > 0) {
            setup.push(`@Mock`);
            setup.push(`private ${className} ${mockObjectName};`);
            setup.push('');
        }
        // Adicionar mocks para cada função
        functions.forEach(func => {
            setup.push(generateMock(func));
        });
    });
    // Adicionar mocks para funções sem classe identificada
    const functionsWithoutClass = calledFunctions.filter(f => !f.className);
    if (functionsWithoutClass.length > 0) {
        setup.push('');
        setup.push('// Mocks para funções sem classe identificada:');
        functionsWithoutClass.forEach(func => {
            setup.push(generateMock(func));
        });
    }
    return setup;
}
/**
 * Gera mocks avançados baseados na análise detalhada das classes
 */
async function generateAdvancedMocks(code, calledFunctions) {
    const classAnalyzer = classAnalyzer_1.ClassAnalyzer.getInstance();
    // Gerar mocks básicos (comportamento atual)
    const basicMocks = generateMocks(calledFunctions);
    const basicSetup = generateMockSetup(calledFunctions);
    // Analisar classes das funções chamadas
    const classAnalysis = await classAnalyzer.analyzeCalledClasses(code, calledFunctions);
    // Gerar mocks avançados baseados na análise das classes
    const advancedMocks = [];
    const enhancedSetup = [];
    classAnalysis.forEach(classInfo => {
        // Adicionar informações da análise da classe
        enhancedSetup.push(`// === ANÁLISE DA CLASSE: ${classInfo.className} ===`);
        // Informações sobre campos
        if (classInfo.fields.length > 0) {
            enhancedSetup.push('// Campos da classe:');
            classInfo.fields.forEach(field => {
                let fieldInfo = `//   ${field.visibility} ${field.type} ${field.name}`;
                if (field.isStatic)
                    fieldInfo += ' (static)';
                if (field.isFinal)
                    fieldInfo += ' (final)';
                if (field.initialValue)
                    fieldInfo += ` = ${field.initialValue}`;
                if (field.annotations.length > 0) {
                    fieldInfo += ` [@${field.annotations.join(', @')}]`;
                }
                enhancedSetup.push(fieldInfo);
            });
            enhancedSetup.push('');
        }
        // Informações sobre construtores
        if (classInfo.constructors.length > 0) {
            enhancedSetup.push('// Construtores disponíveis:');
            classInfo.constructors.forEach(constructor => {
                const params = constructor.parameters.map(p => `${p.type} ${p.name}`).join(', ');
                let constructorInfo = `//   ${constructor.visibility} ${classInfo.className}(${params})`;
                if (constructor.annotations.length > 0) {
                    constructorInfo += ` [@${constructor.annotations.join(', @')}]`;
                }
                enhancedSetup.push(constructorInfo);
            });
            enhancedSetup.push('');
        }
        // Informações sobre métodos
        if (classInfo.methods.length > 0) {
            enhancedSetup.push('// Métodos da classe:');
            classInfo.methods.forEach(method => {
                const params = method.parameters.map(p => `${p.type} ${p.name}`).join(', ');
                let methodInfo = `//   ${method.visibility} ${method.returnType} ${method.name}(${params})`;
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
                enhancedSetup.push(methodInfo);
            });
            enhancedSetup.push('');
        }
        // Dependências da classe
        if (classInfo.dependencies.length > 0) {
            enhancedSetup.push('// Dependências da classe:');
            classInfo.dependencies.forEach(dep => {
                enhancedSetup.push(`//   import ${dep};`);
            });
            enhancedSetup.push('');
        }
        // Setup de mocks específicos para a classe
        enhancedSetup.push('// Setup de mocks específicos:');
        classInfo.mockSetup.forEach(setup => {
            enhancedSetup.push(setup);
        });
        enhancedSetup.push('');
        // Verificações específicas
        enhancedSetup.push('// Verificações específicas:');
        classInfo.mockVerification.forEach(verification => {
            enhancedSetup.push(verification);
        });
        enhancedSetup.push('');
        // Gerar mocks avançados baseados nos métodos públicos
        const publicMethods = classInfo.methods.filter(m => m.visibility === 'public' && !m.isAbstract);
        publicMethods.forEach(method => {
            const mockParams = method.parameters.length > 0
                ? method.parameters.map(p => `any(${p.type}.class)`).join(', ')
                : '';
            // Mock com retorno específico baseado no tipo
            let mockReturn = `mock${method.returnType}()`;
            if (method.returnType === 'void') {
                mockReturn = 'doNothing()';
            }
            else if (method.returnType === 'String') {
                mockReturn = '"mockString"';
            }
            else if (method.returnType === 'Integer' || method.returnType === 'int') {
                mockReturn = '1';
            }
            else if (method.returnType === 'Boolean' || method.returnType === 'boolean') {
                mockReturn = 'true';
            }
            else if (method.returnType === 'Long' || method.returnType === 'long') {
                mockReturn = '1L';
            }
            else if (method.returnType === 'Double' || method.returnType === 'double') {
                mockReturn = '1.0';
            }
            else if (method.returnType === 'Float' || method.returnType === 'float') {
                mockReturn = '1.0f';
            }
            const mockObjectName = `${classInfo.className.toLowerCase()}Mock`;
            const advancedMock = `when(${mockObjectName}.${method.name}(${mockParams})).thenReturn(${mockReturn});`;
            advancedMocks.push(advancedMock);
        });
    });
    return {
        basicMocks,
        advancedMocks,
        classAnalysis,
        enhancedSetup
    };
}
/**
 * Gera setup completo de mocks com análise de classes
 */
async function generateCompleteMockSetup(code, calledFunctions) {
    const result = await generateAdvancedMocks(code, calledFunctions);
    const completeSetup = [];
    // Adicionar imports necessários
    completeSetup.push('// Imports necessários para mocks:');
    completeSetup.push('import static org.mockito.Mockito.*;');
    completeSetup.push('import org.mockito.Mock;');
    completeSetup.push('import org.mockito.InjectMocks;');
    completeSetup.push('import org.mockito.junit.jupiter.MockitoExtension;');
    completeSetup.push('import org.junit.jupiter.api.extension.ExtendWith;');
    completeSetup.push('');
    // Adicionar setup básico
    completeSetup.push('// Setup básico de mocks:');
    result.basicMocks.forEach(mock => {
        completeSetup.push(mock);
    });
    completeSetup.push('');
    // Adicionar setup avançado
    completeSetup.push('// Setup avançado com análise de classes:');
    result.enhancedSetup.forEach(setup => {
        completeSetup.push(setup);
    });
    return completeSetup;
}
//# sourceMappingURL=mockGenerator.js.map