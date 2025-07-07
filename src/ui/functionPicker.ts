import * as vscode from 'vscode';

export async function getFunctionFromUser(): Promise<{ name: string | undefined; level: number }> {
  const name = await vscode.window.showInputBox({
    prompt: 'Digite o nome da função Java a ser analisada',
    placeHolder: 'ex: processName'
  });
  const level = await vscode.window.showQuickPick(['1', '2', '3', '4'], {
    placeHolder: 'Selecione o nível de análise'
  });
  return { name, level: Number(level) };
}