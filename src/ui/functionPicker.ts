import * as vscode from 'vscode';

export interface FunctionPickerResult {
  name: string;
  level: number;
  className?: string;
}

export async function getFunctionFromUser(): Promise<FunctionPickerResult> {
  // Pedir o nome da função
  const functionName = await vscode.window.showInputBox({
    prompt: 'Digite o nome da função/método para analisar',
    placeHolder: 'Ex: processData, calculateTotal, validateUser',
    validateInput: (value) => {
      if (!value || value.trim() === '') {
        return 'Nome da função é obrigatório';
      }
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value.trim())) {
        return 'Nome da função deve ser um identificador Java válido';
      }
      return null;
    }
  });

  if (!functionName) {
    return { name: '', level: 1 };
  }

  // Pedir o nome da classe (opcional)
  const className = await vscode.window.showInputBox({
    prompt: 'Digite o nome da classe (opcional - deixe vazio para busca simples)',
    placeHolder: 'Ex: UserService, DataProcessor, Calculator',
    validateInput: (value) => {
      if (value && value.trim() !== '') {
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value.trim())) {
          return 'Nome da classe deve ser um identificador Java válido';
        }
      }
      return null;
    }
  });

  // Pedir o nível de detalhe dos testes
  const levelOptions = [
    {
      label: '$(star) Nível 1 - Básico',
      description: 'Apenas cenários de caminho feliz (3 cenários)',
      detail: 'Testes básicos para verificar funcionamento normal',
      level: 1
    },
    {
      label: '$(star-full) Nível 2 - Intermediário',
      description: 'Caminho feliz + casos extremos (8 cenários)',
      detail: 'Inclui testes para valores limite e casos especiais',
      level: 2
    },
    {
      label: '$(star-full)$(star-full) Nível 3 - Avançado',
      description: 'Cobertura ampla exceto erros complexos',
      detail: 'Testes abrangentes com foco em robustez',
      level: 3
    },
    {
      label: '$(star-full)$(star-full)$(star-full) Nível 4 - Completo',
      description: 'Todos os cenários possíveis',
      detail: 'Cobertura máxima incluindo todos os casos de erro',
      level: 4
    }
  ];

  const selectedLevel = await vscode.window.showQuickPick(levelOptions, {
    placeHolder: 'Selecione o nível de detalhe dos testes',
    canPickMany: false,
    matchOnDescription: true,
    matchOnDetail: true
  });

  const level = selectedLevel?.level || 1;

  // Mostrar resumo da configuração
  const searchType = className && className.trim() !== '' ? 'Busca em classe específica' : 'Busca simples';
  const summary = [
    `Função: ${functionName}`,
    className && className.trim() !== '' ? `Classe: ${className}` : 'Classe: Não especificada',
    `Tipo de busca: ${searchType}`,
    `Nível: ${level} (${selectedLevel?.description || 'Básico'})`
  ].join('\n');

  const proceed = await vscode.window.showInformationMessage(
    `Configuração da análise:\n\n${summary}\n\nDeseja prosseguir?`,
    { modal: true },
    'Sim, analisar',
    'Cancelar'
  );

  if (proceed === 'Sim, analisar') {
    return { 
      name: functionName, 
      level: level, 
      className: className && className.trim() !== '' ? className.trim() : undefined 
    };
  }

  return { name: '', level: 1 };
}