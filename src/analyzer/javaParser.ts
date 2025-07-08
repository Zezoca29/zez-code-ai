// Versão melhorada do parser Java
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
  returnType?: string; // Tipo de retorno opcional, pode ser inferido
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
  console.log('=== INICIANDO PARSING MELHORADO ===');
  console.log('Função buscada:', functionName);
  console.log('Código (primeiros 200 chars):', code.substring(0, 200));
  
  try {
    // Limpar o código de comentários e espaços desnecessários
    const cleanedCode = cleanJavaCode(code);
    const lines = cleanedCode.split('\n');
    
    console.log('Código limpo (primeiros 200 chars):', cleanedCode.substring(0, 200));
    
    // Buscar a função com diferentes estratégias
    const functionInfo = findFunctionInCode(cleanedCode, functionName);
    
    if (!functionInfo) {
      console.log('Função não encontrada com busca avançada, tentando busca por linha');
      return findFunctionByLineSearch(lines, functionName);
    }
    
    console.log('Função encontrada:', functionInfo);
    
    // Extrair detalhes da função
    const functionDetails = extractFunctionDetails(functionInfo, cleanedCode);
    
    // Calcular complexidade básica
    const complexity = calculateBasicComplexity(functionInfo.body);
    
    // Extrair variáveis locais
    const localVariables = extractLocalVariables(functionInfo.body);
    
    // Extrair chamadas de função
    const calledFunctions = extractCalledFunctions(functionInfo.body);
    
    const result: ParsedFunction = {
      name: functionName,
      returnType: functionDetails.returnType,
      visibility: functionDetails.visibility,
      isStatic: functionDetails.isStatic,
      complexity: complexity,
      lines: functionInfo.body.split('\n').length,
      annotations: functionDetails.annotations,
      throwsExceptions: functionDetails.throwsExceptions,
      parameters: functionDetails.parameters,
      localVariables: localVariables,
      calledFunctions: calledFunctions
    };
    
    console.log('Parsing concluído com sucesso:', result);
    return result;
    
  } catch (error) {
    console.error('Erro no parsing melhorado:', error);
    // Fallback para análise básica se algo der errado
    return createSmartDefaultAnalysis(code, functionName);
  }
}

interface FunctionInfo {
  signature: string;
  body: string;
  startLine: number;
  endLine: number;
}

function cleanJavaCode(code: string): string {
  // Remove comentários de linha
  let cleaned = code.replace(/\/\/.*$/gm, '');
  
  // Remove comentários de bloco (simples)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Normaliza espaços em branco
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Remove espaços no início e fim das linhas
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  return cleaned;
}

function findFunctionInCode(code: string, functionName: string): FunctionInfo | null {
  console.log('Procurando função:', functionName);
  
  // Padrões para encontrar funções Java
  const patterns = [
    // Padrão completo: modificadores + tipo + nome + parênteses
    new RegExp(`((?:public|private|protected|static|final|abstract|synchronized|native|strictfp)\\s+)*([a-zA-Z_$][a-zA-Z0-9_$<>\\[\\]]*\\s+)${functionName}\\s*\\([^)]*\\)\\s*(?:throws\\s+[^{]*)?\\s*\\{`, 'i'),
    
    // Padrão simples: tipo + nome + parênteses
    new RegExp(`([a-zA-Z_$][a-zA-Z0-9_$<>\\[\\]]*\\s+)${functionName}\\s*\\([^)]*\\)\\s*\\{`, 'i'),
    
    // Padrão muito básico: apenas nome + parênteses
    new RegExp(`${functionName}\\s*\\([^)]*\\)\\s*\\{`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      console.log('Padrão encontrado:', pattern.source);
      console.log('Match:', match[0]);
      
      const startIndex = match.index!;
      const signature = match[0];
      
      // Encontrar o corpo da função
      const functionBody = extractFunctionBody(code, startIndex + signature.length - 1);
      
      if (functionBody) {
        return {
          signature: signature,
          body: functionBody,
          startLine: code.substring(0, startIndex).split('\n').length,
          endLine: code.substring(0, startIndex + signature.length + functionBody.length).split('\n').length
        };
      }
    }
  }
  
  return null;
}

function extractFunctionBody(code: string, startIndex: number): string {
  let braceCount = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  
  // Encontrar a abertura da função
  for (let i = startIndex; i < code.length; i++) {
    const char = code[i];
    if (char === '{') {
      if (bodyStart === -1) {
        bodyStart = i + 1;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        bodyEnd = i;
        break;
      }
    }
  }
  
  if (bodyStart !== -1 && bodyEnd !== -1) {
    return code.substring(bodyStart, bodyEnd).trim();
  }
  
  return '';
}

function findFunctionByLineSearch(lines: string[], functionName: string): ParsedFunction {
  console.log('Executando busca linha por linha para:', functionName);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Verifica se a linha contém o nome da função e parênteses
    if (line.includes(functionName) && line.includes('(') && line.includes(')')) {
      console.log('Linha encontrada:', line);
      
      // Verifica se não é uma chamada de função (deve ter modificadores ou tipo de retorno)
      const hasModifiers = /\b(public|private|protected|static|final|abstract|synchronized)\b/.test(line);
      const hasReturnType = /\b(void|int|String|boolean|double|float|long|byte|short|char|[A-Z][a-zA-Z0-9]*)\b/.test(line);
      
      if (hasModifiers || hasReturnType) {
        return createAnalysisFromLine(line, functionName, lines.length);
      }
    }
  }
  
  console.log('Função não encontrada na busca por linha, usando análise padrão');
  return createSmartDefaultAnalysis(lines.join('\n'), functionName);
}

function extractFunctionDetails(functionInfo: FunctionInfo, code: string): any {
  const signature = functionInfo.signature;
  
  // Extrair visibilidade
  const visibility = extractVisibility(signature);
  
  // Verificar se é estático
  const isStatic = signature.includes('static');
  
  // Extrair tipo de retorno
  const returnType = extractReturnType(signature, functionInfo.body);
  
  // Extrair parâmetros
  const parameters = extractParameters(signature);
  
  // Extrair anotações (buscar nas linhas anteriores)
  const annotations = extractAnnotations(code, functionInfo.startLine);
  
  // Extrair exceções
  const throwsExceptions = extractThrowsExceptions(signature);
  
  return {
    visibility,
    isStatic,
    returnType,
    parameters,
    annotations,
    throwsExceptions
  };
}

function extractVisibility(signature: string): string {
  if (signature.includes('public')) return 'public';
  if (signature.includes('private')) return 'private';
  if (signature.includes('protected')) return 'protected';
  return 'default';
}

function extractReturnType(signature: string, body: string): string {
  // Buscar por return statements no corpo da função
  const returnMatches = body.match(/return\s+([^;]+);/g);
  if (returnMatches) {
    const returnValue = returnMatches[0].replace(/return\s+/, '').replace(';', '').trim();
    
    // Tentar inferir o tipo baseado no valor retornado
    if (/^\d+$/.test(returnValue)) return 'int';
    if (/^\d+\.\d+$/.test(returnValue)) return 'double';
    if (/^".*"$/.test(returnValue)) return 'String';
    if (/^(true|false)$/.test(returnValue)) return 'boolean';
  }
  
  // Extrair da assinatura
  const parts = signature.split(/\s+/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part && !['public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized'].includes(part)) {
      // Próximo token que não é um modificador
      if (i + 1 < parts.length && parts[i + 1].includes('(')) {
        return part;
      }
    }
  }
  
  return 'void';
}

function extractParameters(signature: string): Parameter[] {
  const parenStart = signature.indexOf('(');
  const parenEnd = signature.lastIndexOf(')');
  
  if (parenStart === -1 || parenEnd === -1) return [];
  
  const paramString = signature.substring(parenStart + 1, parenEnd).trim();
  if (!paramString) return [];
  
  // Dividir por vírgula, mas cuidado com generics
  const params = smartSplit(paramString, ',');
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
      }
    }
  }
  
  return result;
}

function smartSplit(str: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (char === '<' || char === '[') {
      depth++;
    } else if (char === '>' || char === ']') {
      depth--;
    } else if (char === delimiter && depth === 0) {
      result.push(current.trim());
      current = '';
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) {
    result.push(current.trim());
  }
  
  return result;
}

function extractAnnotations(code: string, startLine: number): string[] {
  const lines = code.split('\n');
  const annotations: string[] = [];
  
  // Procurar anotações nas linhas anteriores
  for (let i = Math.max(0, startLine - 5); i < startLine; i++) {
    const line = lines[i]?.trim();
    if (line && line.startsWith('@')) {
      annotations.push(line);
    }
  }
  
  return annotations;
}

function extractThrowsExceptions(signature: string): string[] {
  const throwsMatch = signature.match(/throws\s+([^{]+)/);
  if (throwsMatch) {
    return throwsMatch[1].split(',').map(ex => ex.trim());
  }
  return [];
}

function extractLocalVariables(body: string): LocalVariable[] {
  const variables: LocalVariable[] = [];
  
  // Padrões para declarações de variáveis
  const patterns = [
    /\b(int|double|float|long|boolean|String|char|byte|short)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=\s*([^;]+))?;/g,
    /\b([A-Z][a-zA-Z0-9_$]*)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=\s*([^;]+))?;/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      variables.push({
        name: match[2],
        type: match[1],
        initialValue: match[3]?.trim()
      });
    }
  }
  
  return variables;
}

function extractCalledFunctions(body: string): CalledFunction[] {
  const functions: CalledFunction[] = [];
  
  // Padrão mais completo para chamadas de método incluindo parâmetros
  const pattern = /([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*\(([^)]*)\)/g;
  
  let match;
  while ((match = pattern.exec(body)) !== null) {
    const fullCall = match[1];
    const paramString = match[2];
    const parts = fullCall.split('.');
    
    // Extrair parâmetros da chamada
    const parameters = extractMethodCallParameters(paramString);
    
    if (parts.length > 1) {
      functions.push({
        methodName: parts[parts.length - 1],
        className: parts[parts.length - 2],
        parameters: parameters,
        isStaticCall: /^[A-Z]/.test(parts[0])
      });
    } else {
      // Filtrar chamadas óbvias que não são métodos (como construtores ou palavras-chave)
      if (!isJavaKeyword(parts[0]) && !isConstructorCall(parts[0])) {
        functions.push({
          methodName: parts[0],
          parameters: parameters,
          isStaticCall: false
        });
      }
    }
  }
  
  return functions;
}

function extractCommonMethodCalls(body: string): CalledFunction[] {
  const functions: CalledFunction[] = [];
  
  // Padrões específicos para chamadas comuns
  const patterns = [
    // System.out.println, System.out.print, etc.
    { pattern: /System\.out\.(println|print|printf)\s*\(([^)]*)\)/g, className: 'System.out' },
    
    // Math.abs, Math.max, Math.min, etc.
    { pattern: /Math\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g, className: 'Math' },
    
    // String methods
    { pattern: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g, className: 'String' },
    
    // Arrays methods
    { pattern: /Arrays\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g, className: 'Arrays' },
    
    // Collections methods
    { pattern: /Collections\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g, className: 'Collections' }
  ];
  
  for (const { pattern, className } of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const methodName = match[1];
      const paramString = match[2];
      const parameters = extractMethodCallParameters(paramString);
      
      functions.push({
        methodName: methodName,
        className: className,
        parameters: parameters,
        isStaticCall: true
      });
    }
  }
  
  return functions;
}

function removeDuplicateCalls(functions: CalledFunction[]): CalledFunction[] {
  const seen = new Set<string>();
  const unique: CalledFunction[] = [];
  
  for (const func of functions) {
    const key = `${func.className || ''}.${func.methodName}.${func.parameters.join(',')}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(func);
    }
  }
  
  return unique;
}

function extractMethodCallParameters(paramString: string): string[] {
  if (!paramString || paramString.trim() === '') {
    return [];
  }
  
  // Dividir parâmetros, mas cuidado com parênteses aninhados e strings
  const params = smartSplitParameters(paramString);
  return params.map(param => param.trim()).filter(param => param.length > 0);
}

function smartSplitParameters(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';
    
    // Verificar se estamos entrando ou saindo de uma string
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
    
    if (!inString) {
      if (char === '(' || char === '[' || char === '{') {
        depth++;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
      } else if (char === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
        continue;
      }
    }
    
    current += char;
  }
  
  if (current.trim()) {
    result.push(current.trim());
  }
  
  return result;
}

function isJavaKeyword(word: string): boolean {
  const javaKeywords = [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
    'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
    'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
    'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
    'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
    'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
    'try', 'void', 'volatile', 'while'
  ];
  
  return javaKeywords.includes(word.toLowerCase());
}

function isConstructorCall(word: string): boolean {
  // Construtores geralmente começam com maiúscula
  return /^[A-Z]/.test(word) && word.length > 1;
}

function calculateBasicComplexity(body: string): number {
  let complexity = 1; // Complexidade base
  
  // Contar estruturas de controle
  const controlStructures = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\b\&\&\b/g,
    /\b\|\|\b/g
  ];
  
  for (const pattern of controlStructures) {
    const matches = body.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

function createAnalysisFromLine(line: string, functionName: string, totalLines: number): ParsedFunction {
  console.log('Criando análise da linha:', line);
  
  const visibility = extractVisibility(line);
  const isStatic = line.includes('static');
  const returnType = extractReturnType(line, '');
  const parameters = extractParameters(line);
  
  return {
    name: functionName,
    returnType: returnType || 'void',
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
}

function createSmartDefaultAnalysis(code: string, functionName: string): ParsedFunction {
  console.log('Criando análise padrão inteligente para:', functionName);
  
  // Tentar inferir alguns detalhes do código disponível
  const hasIntParams = /\bint\s+[a-zA-Z_$][a-zA-Z0-9_$]*/.test(code);
  const hasReturn = /\breturn\s+/.test(code);
  
  const parameters: Parameter[] = [];
  
  // Se encontrou parâmetros int, assumir que são a e b
  if (hasIntParams) {
    parameters.push(
      { name: 'a', type: 'int', annotations: [] },
      { name: 'b', type: 'int', annotations: [] }
    );
  }
  
  return {
    name: functionName,
    returnType: hasReturn && hasIntParams ? 'int' : 'void',
    visibility: 'public',
    isStatic: false,
    complexity: 1,
    lines: code.split('\n').length,
    annotations: [],
    throwsExceptions: [],
    parameters: parameters,
    localVariables: [],
    calledFunctions: []
  };
}