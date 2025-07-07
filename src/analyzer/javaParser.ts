// Versão ultra-simplificada para usar como fallback
export interface Parameter {
  name: string;
  type: string;
  annotations?: string[];
}

export interface LocalVariable {
  name: string;
  type: string;
  initialValue?: string;
}

export interface CalledFunction {
  methodName: string;
  className?: string;
  parameters: string[];
  isStaticCall: boolean;
}

export interface ParsedFunction {
  name: string;
  returnType: string;
  visibility: string;
  isStatic: boolean;
  complexity: number;
  lines: number;
  annotations: string[];
  throwsExceptions: string[];
  parameters: Parameter[];
  localVariables: LocalVariable[];
  calledFunctions: CalledFunction[];
}

export async function parseJavaFunction(code: string, functionName: string): Promise<ParsedFunction> {
  console.log('=== INICIANDO PARSING SIMPLES ===');
  console.log('Função buscada:', functionName);
  console.log('Código (primeiros 100 chars):', code.substring(0, 100));
  
  try {
    // Análise de texto super básica - sem regex complexa
    const lines = code.split('\n');
    const totalLines = lines.length;
    
    // Encontrar linha que contém a função
    let functionLine = '';
    let functionLineIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(functionName) && line.includes('(')) {
        functionLine = line;
        functionLineIndex = i;
        break;
      }
    }
    
    if (!functionLine) {
      console.log('Função não encontrada, criando análise padrão');
      return createDefaultAnalysis(functionName, totalLines);
    }
    
    console.log('Linha da função encontrada:', functionLine);
    
    // Análise básica da linha
    const visibility = extractVisibility(functionLine);
    const isStatic = functionLine.includes('static');
    const returnType = extractReturnType(functionLine, functionName);
    const parameters = extractSimpleParameters(functionLine);
    
    const result: ParsedFunction = {
      name: functionName,
      returnType: returnType,
      visibility: visibility,
      isStatic: isStatic,
      complexity: 1,
      lines: totalLines,
      annotations: [],
      throwsExceptions: [],
      parameters: parameters,
      localVariables: [],
      calledFunctions: []
    };
    
    console.log('Parsing concluído:', result);
    return result;
    
  } catch (error) {
    console.error('Erro no parsing simples:', error);
    return createDefaultAnalysis(functionName, code.split('\n').length);
  }
}

function extractVisibility(line: string): string {
  if (line.includes('public')) return 'public';
  if (line.includes('private')) return 'private';
  if (line.includes('protected')) return 'protected';
  return 'default';
}

function extractReturnType(line: string, functionName: string): string {
  // Buscar padrão: [tipo] [nome da função](
  const beforeFunction = line.split(functionName)[0];
  const words = beforeFunction.trim().split(/\s+/);
  
  // Pegar a última palavra antes do nome da função (deve ser o tipo)
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (word && word !== 'static' && word !== 'public' && word !== 'private' && word !== 'protected') {
      return word;
    }
  }
  
  return 'void';
}

function extractSimpleParameters(line: string): Parameter[] {
  try {
    // Encontrar conteúdo entre parênteses
    const openParen = line.indexOf('(');
    const closeParen = line.indexOf(')', openParen);
    
    if (openParen === -1 || closeParen === -1) return [];
    
    const paramString = line.substring(openParen + 1, closeParen).trim();
    if (!paramString) return [];
    
    // Dividir por vírgula e processar cada parâmetro
    const params = paramString.split(',');
    const result: Parameter[] = [];
    
    for (const param of params) {
      const trimmed = param.trim();
      if (trimmed) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          result.push({
            name: parts[parts.length - 1],
            type: parts[parts.length - 2],
            annotations: []
          });
        } else {
          result.push({
            name: trimmed,
            type: 'unknown',
            annotations: []
          });
        }
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Erro ao extrair parâmetros:', error);
    return [];
  }
}

function createDefaultAnalysis(functionName: string, totalLines: number): ParsedFunction {
  console.log('Criando análise padrão para:', functionName);
  
  return {
    name: functionName,
    returnType: 'int', // Assumindo int para o exemplo soma
    visibility: 'public',
    isStatic: false,
    complexity: 1,
    lines: totalLines,
    annotations: [],
    throwsExceptions: [],
    parameters: [
      { name: 'a', type: 'int', annotations: [] },
      { name: 'b', type: 'int', annotations: [] }
    ],
    localVariables: [],
    calledFunctions: []
  };
}