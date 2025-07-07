import * as vscode from 'vscode';
import { getFunctionFromUser } from './ui/functionPicker';
import { generateMocks } from './analyzer/mockGenerator';
import { generateScenarios } from './analyzer/scenarioGenerator';

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

    if (level !== 1) {
      vscode.window.showInformationMessage('Apenas o nível 1 está implementado.');
      return;
    }

    try {
      const { parseJavaFunction } = await import('./analyzer/javaParser.js');
      const result = await parseJavaFunction(code, name);
      const mocks = generateMocks(result.calledFunctions);
      const scenarios = generateScenarios(result.parameters, result.calledFunctions);

      const output = vscode.window.createOutputChannel('Java Function Analyzer');
      output.clear();
      output.appendLine(`Função analisada: ${name}`);
      output.appendLine(`Parâmetros: ${JSON.stringify(result.parameters, null, 2)}`);
      output.appendLine(`Variáveis locais: ${JSON.stringify(result.localVariables, null, 2)}`);
      output.appendLine(`Funções chamadas: ${JSON.stringify(result.calledFunctions, null, 2)}`);
      output.appendLine(`\nMocks sugeridos:`);
      mocks.forEach((mock: string) => output.appendLine(mock));
      output.appendLine(`\nCenários possíveis:`);
      scenarios.forEach((s: any[], i: number) => output.appendLine(`Cenário ${i + 1}: ${JSON.stringify(s)}`));
      output.show();
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}