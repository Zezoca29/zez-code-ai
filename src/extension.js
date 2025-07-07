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
const mockGenerator_1 = require("./analyzer/mockGenerator");
const scenarioGenerator_1 = require("./analyzer/scenarioGenerator");
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.analyzeJavaFunction', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Nenhum editor de texto ativo.');
            return;
        }
        const document = editor.document;
        const code = document.getText();
        const { name, level } = await (0, functionPicker_1.getFunctionFromUser)();
        if (!name) {
            vscode.window.showWarningMessage('Nome da função não informado.');
            return;
        }
        if (level !== 1) {
            vscode.window.showInformationMessage('Apenas o nível 1 está implementado.');
            return;
        }
        try {
            const { parseJavaFunction } = await import('./analyzer/javaParser.js');
            const result = await parseJavaFunction(code, name);
            const mocks = (0, mockGenerator_1.generateMocks)(result.calledFunctions);
            const scenarios = (0, scenarioGenerator_1.generateScenarios)(result.parameters, result.calledFunctions);
            const output = vscode.window.createOutputChannel('Java Function Analyzer');
            output.clear();
            output.appendLine(`Função analisada: ${name}`);
            output.appendLine(`Parâmetros: ${JSON.stringify(result.parameters, null, 2)}`);
            output.appendLine(`Variáveis locais: ${JSON.stringify(result.localVariables, null, 2)}`);
            output.appendLine(`Funções chamadas: ${JSON.stringify(result.calledFunctions, null, 2)}`);
            output.appendLine(`\nMocks sugeridos:`);
            mocks.forEach((mock) => output.appendLine(mock));
            output.appendLine(`\nCenários possíveis:`);
            scenarios.forEach((s, i) => output.appendLine(`Cenário ${i + 1}: ${JSON.stringify(s)}`));
            output.show();
        }
        catch (err) {
            vscode.window.showErrorMessage(err.message);
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map