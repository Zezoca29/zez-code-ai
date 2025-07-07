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
exports.getFunctionFromUser = getFunctionFromUser;
exports.isValidJavaIdentifier = isValidJavaIdentifier;
exports.showAnalysisLevelHelp = showAnalysisLevelHelp;
const vscode = __importStar(require("vscode"));
async function getFunctionFromUser() {
    // Primeiro, solicita o nome da função
    const name = await vscode.window.showInputBox({
        prompt: 'Digite o nome da função Java a ser analisada',
        placeHolder: 'ex: processName, calculateTotal, validateUser',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'O nome da função não pode estar vazio';
            }
            if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value.trim())) {
                return 'Nome da função deve ser um identificador Java válido';
            }
            return null;
        }
    });
    // Se o usuário cancelou ou não informou nome, retorna undefined
    if (!name) {
        return { name: undefined, level: 1 };
    }
    // Solicita o nível de análise com descrições detalhadas
    const levelItems = [
        {
            label: '1 - Básico',
            description: 'Cenários básicos de caminho feliz',
            detail: 'Gera apenas os cenários mais simples e essenciais (3-5 cenários)'
        },
        {
            label: '2 - Intermediário',
            description: 'Caminho feliz + casos extremos básicos',
            detail: 'Inclui cenários de sucesso e casos extremos simples (8-12 cenários)'
        },
        {
            label: '3 - Avançado',
            description: 'Inclui casos de erro e validações',
            detail: 'Cenários completos incluindo tratamento de erros (15-20 cenários)'
        },
        {
            label: '4 - Completo',
            description: 'Análise exhaustiva com todos os cenários',
            detail: 'Todos os cenários possíveis incluindo casos extremos e limites (20+ cenários)'
        }
    ];
    const selectedLevel = await vscode.window.showQuickPick(levelItems, {
        placeHolder: 'Selecione o nível de análise desejado',
        ignoreFocusOut: true,
        matchOnDescription: true,
        matchOnDetail: true
    });
    // Se o usuário cancelou a seleção do nível, usa o nível 1 como padrão
    if (!selectedLevel) {
        vscode.window.showInformationMessage('Nível não selecionado, usando nível básico (1)');
        return { name: name.trim(), level: 1 };
    }
    // Extrai o número do nível da label
    const level = parseInt(selectedLevel.label.charAt(0));
    // Mostra confirmação do que será analisado
    const shouldProceed = await vscode.window.showInformationMessage(`Analisar função "${name.trim()}" no nível ${level}?`, { modal: true }, 'Sim', 'Não');
    if (shouldProceed !== 'Sim') {
        return { name: undefined, level: 1 };
    }
    return {
        name: name.trim(),
        level: level
    };
}
/**
 * Função auxiliar para validar se um nome é um identificador Java válido
 */
function isValidJavaIdentifier(name) {
    if (!name || name.length === 0) {
        return false;
    }
    // Verifica se o primeiro caractere é válido
    const firstChar = name.charAt(0);
    if (!/[a-zA-Z_$]/.test(firstChar)) {
        return false;
    }
    // Verifica se todos os outros caracteres são válidos
    for (let i = 1; i < name.length; i++) {
        const char = name.charAt(i);
        if (!/[a-zA-Z0-9_$]/.test(char)) {
            return false;
        }
    }
    // Verifica se não é uma palavra reservada do Java
    const javaKeywords = [
        'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
        'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
        'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
        'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
        'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
        'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
        'try', 'void', 'volatile', 'while'
    ];
    return !javaKeywords.includes(name.toLowerCase());
}
/**
 * Função para mostrar ajuda sobre os níveis de análise
 */
async function showAnalysisLevelHelp() {
    const helpText = `
NÍVEIS DE ANÁLISE - JAVA FUNCTION ANALYZER

🔹 NÍVEL 1 - BÁSICO
  • Cenários de caminho feliz (happy path)
  • Testes com entradas válidas típicas
  • Foco em funcionalidade principal
  • Ideal para: Testes rápidos e validação básica

🔹 NÍVEL 2 - INTERMEDIÁRIO  
  • Cenários de caminho feliz
  • Casos extremos básicos (edge cases)
  • Entradas vazias, nulas quando aplicável
  • Ideal para: Cobertura de teste padrão

🔹 NÍVEL 3 - AVANÇADO
  • Todos os cenários anteriores
  • Casos de erro e exceções
  • Validação de entrada
  • Ideal para: Aplicações críticas

🔹 NÍVEL 4 - COMPLETO
  • Análise exhaustiva
  • Valores limites (boundary values)
  • Casos extremos complexos
  • Ideal para: Máxima cobertura de teste
  `;
    await vscode.window.showInformationMessage(helpText, { modal: true });
}
//# sourceMappingURL=functionPicker.js.map