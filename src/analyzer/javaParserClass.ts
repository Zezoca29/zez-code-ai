// Parser Java melhorado com busca por classe e método

import { CalledFunction, LocalVariable, Parameter, ParsedFunction } from "./javaParser";

export interface ClassInfo {
  name: string;
  fullName: string; // com package
  startLine: number;
  endLine: number;
  body: string;
  isInterface: boolean;
  isAbstract: boolean;
  superClass?: string;
  interfaces: string[];
}

export interface MethodSearchResult {
  found: boolean;
  method?: ParsedFunction;
  className?: string;
  suggestions?: string[];
  error?: string;
}

export async function parseJavaFunctionInClass(
  code: string, 
  className: string, 
  methodName: string
): Promise<MethodSearchResult> {
  console.log(`=== BUSCA MELHORADA: ${className}.${methodName} ===`);
  
  try {
    // 1. Limpar código e normalizar
    const cleanedCode = cleanJavaCode(code);
    const normalizedClassName = normalizeIdentifier(className);
    const normalizedMethodName = normalizeIdentifier(methodName);
    
    // 2. Encontrar todas as classes no código
    const classes = findAllClasses(cleanedCode);
    console.log(`Classes encontradas: ${classes.map(c => c.name).join(', ')}`);
    
    // 3. Buscar a classe específica
    const targetClass = findTargetClass(classes, normalizedClassName);
    
    if (!targetClass) {
      return {
        found: false,
        error: `Classe "${className}" não encontrada`,
        suggestions: classes.map(c => c.name)
      };
    }
    
    console.log(`Classe encontrada: ${targetClass.name}`);
    
    // 4. Buscar o método dentro da classe
    const methodResult = findMethodInClass(targetClass, normalizedMethodName);
    
    if (!methodResult.found) {
      // 5. Buscar métodos similares para sugestões
      const similarMethods = findSimilarMethods(targetClass, normalizedMethodName);
      
      return {
        found: false,
        className: targetClass.name,
        error: `Método "${methodName}" não encontrado na classe "${className}"`,
        suggestions: similarMethods
      };
    }
    
    // 6. Fazer parse completo do método encontrado
    const parsedMethod = await parseMethodDetails(methodResult.method!, targetClass, cleanedCode);
    
    return {
      found: true,
      method: parsedMethod,
      className: targetClass.name
    };
    
  } catch (error) {
    console.error('Erro na busca melhorada:', error);
    return {
      found: false,
      error: `Erro no parsing: ${error.message}`
    };
  }
}

function normalizeIdentifier(name: string): string {
  // Remove espaços e normaliza o nome
  return name.trim().replace(/\s+/g, '');
}

function findAllClasses(code: string): ClassInfo[] {
  const classes: ClassInfo[] = [];
  
  // Padrões para encontrar classes (incluindo interfaces)
  const classPatterns = [
    // Classe normal: public class MyClass extends SuperClass implements Interface
    /(?:^|\n)\s*((?:public|private|protected|static|final|abstract)\s+)*\s*(class|interface)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+([a-zA-Z_$][a-zA-Z0-9_$.<>]*))?\s*(?:implements\s+([a-zA-Z_$][a-zA-Z0-9_$.<>, ]*))?\s*\{/g,
    
    // Classe anônima ou interna
    /(?:^|\n)\s*((?:public|private|protected|static|final|abstract)\s+)*\s*class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\{/g
  ];
  
  for (const pattern of classPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const modifiers = match[1] || '';
      const classType = match[2] || 'class';
      const className = match[3] || match[2]; // Para o segundo padrão
      const superClass = match[4];
      const interfaces = match[5] ? match[5].split(',').map(i => i.trim()) : [];
      
      const startIndex = match.index!;
      const classBody = extractClassBody(code, startIndex + match[0].length - 1);
      
      if (classBody) {
        classes.push({
          name: className,
          fullName: extractFullClassName(code, className),
          startLine: code.substring(0, startIndex).split('\n').length,
          endLine: code.substring(0, startIndex + match[0].length + classBody.length).split('\n').length,
          body: classBody,
          isInterface: classType === 'interface',
          isAbstract: modifiers.includes('abstract'),
          superClass: superClass,
          interfaces: interfaces
        });
      }
    }
  }
  
  return classes;
}

function extractClassBody(code: string, startIndex: number): string {
  let braceCount = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  
  for (let i = startIndex; i < code.length; i++) {
    const char = code[i];
    const nextChar = i + 1 < code.length ? code[i + 1] : '';
    const prevChar = i > 0 ? code[i - 1] : '';
    
    // Ignorar comentários
    if (char === '/' && nextChar === '/' && !inString) {
      // Pular até o final da linha
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    
    if (char === '/' && nextChar === '*' && !inString) {
      inComment = true;
      i++; // pular o *
      continue;
    }
    
    if (char === '*' && nextChar === '/' && inComment) {
      inComment = false;
      i++; // pular o /
      continue;
    }
    
    if (inComment) continue;
    
    // Controle de strings
    if ((char === '"' || char === "'") && prevChar !== '\\' && !inComment) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
    
    if (!inString) {
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
  }
  
  if (bodyStart !== -1 && bodyEnd !== -1) {
    return code.substring(bodyStart, bodyEnd).trim();
  }
  
  return '';
}

function extractFullClassName(code: string, className: string): string {
  // Tentar extrair o nome completo incluindo package
  const packageMatch = code.match(/package\s+([a-zA-Z_$][a-zA-Z0-9_$.]*);\s*/);
  if (packageMatch) {
    return `${packageMatch[1]}.${className}`;
  }
  return className;
}

function findTargetClass(classes: ClassInfo[], normalizedClassName: string): ClassInfo | null {
  // Busca exata primeiro
  let found = classes.find(c => normalizeIdentifier(c.name) === normalizedClassName);
  if (found) return found;
  
  // Busca por nome simples (ignorando package)
  found = classes.find(c => {
    const simpleName = c.name.split('.').pop() || c.name;
    return normalizeIdentifier(simpleName) === normalizedClassName;
  });
  if (found) return found;
  
  // Busca case-insensitive
  found = classes.find(c => 
    normalizeIdentifier(c.name).toLowerCase() === normalizedClassName.toLowerCase()
  );
  if (found) return found;
  
  // Busca por similaridade (contém)
  return classes.find(c => 
    normalizeIdentifier(c.name).toLowerCase().includes(normalizedClassName.toLowerCase())
  ) || null;
}

interface MethodSearchInClassResult {
  found: boolean;
  method?: FunctionInfo;
  allMethods?: string[];
}

function findMethodInClass(classInfo: ClassInfo, normalizedMethodName: string): MethodSearchInClassResult {
  console.log(`Buscando método "${normalizedMethodName}" na classe "${classInfo.name}"`);
  
  const methods = extractAllMethodsFromClass(classInfo.body);
  console.log(`Métodos encontrados na classe: ${methods.map(m => m.name).join(', ')}`);
  
  // Busca exata
  let found = methods.find(m => normalizeIdentifier(m.name) === normalizedMethodName);
  if (found) {
    return { found: true, method: found, allMethods: methods.map(m => m.name) };
  }
  
  // Busca case-insensitive
  found = methods.find(m => 
    normalizeIdentifier(m.name).toLowerCase() === normalizedMethodName.toLowerCase()
  );
  if (found) {
    return { found: true, method: found, allMethods: methods.map(m => m.name) };
  }
  
  return { found: false, allMethods: methods.map(m => m.name) };
}

interface FunctionInfo {
  name: string;
  signature: string;
  body: string;
  startLine: number;
  endLine: number;
}

function extractAllMethodsFromClass(classBody: string): FunctionInfo[] {
  const methods: FunctionInfo[] = [];
  
  // Padrões mais abrangentes para métodos
  const methodPatterns = [
    // Método completo com modificadores
    /((?:public|private|protected|static|final|abstract|synchronized|native|strictfp)\s+)*([a-zA-Z_$][a-zA-Z0-9_$<>\[\]]*(?:\s*\[\s*\])*)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*(?:throws\s+[^{]*)?\s*\{/g,
    
    // Construtor
    /((?:public|private|protected)\s+)?([A-Z][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*(?:throws\s+[^{]*)?\s*\{/g,
    
    // Método sem modificadores explícitos
    /([a-zA-Z_$][a-zA-Z0-9_$<>\[\]]*(?:\s*\[\s*\])*)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g
  ];
  
  for (const pattern of methodPatterns) {
    let match;
    while ((match = pattern.exec(classBody)) !== null) {
      const methodName = match[3] || match[2]; // Para construtores
      const signature = match[0];
      const startIndex = match.index!;
      
      const methodBody = extractMethodBody(classBody, startIndex + signature.length - 1);
      
      if (methodBody && methodName) {
        methods.push({
          name: methodName,
          signature: signature,
          body: methodBody,
          startLine: classBody.substring(0, startIndex).split('\n').length,
          endLine: classBody.substring(0, startIndex + signature.length + methodBody.length).split('\n').length
        });
      }
    }
  }
  
  // Remover duplicatas
  const uniqueMethods = methods.filter((method, index, self) => 
    index === self.findIndex(m => m.name === method.name && m.signature === method.signature)
  );
  
  return uniqueMethods;
}

function extractMethodBody(code: string, startIndex: number): string {
  let braceCount = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  let inString = false;
  let stringChar = '';
  
  for (let i = startIndex; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : '';
    
    // Controle de strings
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
  }
  
  if (bodyStart !== -1 && bodyEnd !== -1) {
    return code.substring(bodyStart, bodyEnd).trim();
  }
  
  return '';
}

function findSimilarMethods(classInfo: ClassInfo, methodName: string): string[] {
  const methods = extractAllMethodsFromClass(classInfo.body);
  const normalized = methodName.toLowerCase();
  
  return methods
    .filter(m => {
      const mName = m.name.toLowerCase();
      // Buscar métodos que contenham o nome buscado ou vice-versa
      return mName.includes(normalized) || normalized.includes(mName);
    })
    .map(m => m.name)
    .slice(0, 5); // Limitar a 5 sugestões
}

async function parseMethodDetails(
  methodInfo: FunctionInfo, 
  classInfo: ClassInfo, 
  fullCode: string
): Promise<ParsedFunction> {
  
  // Usar o parser existente adaptado para o método encontrado
  const functionDetails = extractFunctionDetails(methodInfo, fullCode);
  const complexity = calculateBasicComplexity(methodInfo.body);
  const localVariables = extractLocalVariables(methodInfo.body);
  const calledFunctions = extractCalledFunctions(methodInfo.body);
  
  return {
    name: methodInfo.name,
    returnType: functionDetails.returnType,
    visibility: functionDetails.visibility,
    isStatic: functionDetails.isStatic,
    complexity: complexity,
    lines: methodInfo.body.split('\n').length,
    annotations: functionDetails.annotations,
    throwsExceptions: functionDetails.throwsExceptions,
    parameters: functionDetails.parameters,
    localVariables: localVariables,
    calledFunctions: calledFunctions
  };
}

// Funções auxiliares do parser original (mantidas para compatibilidade)
function cleanJavaCode(code: string): string {
  // Remove comentários de linha
  let cleaned = code.replace(/\/\/.*$/gm, '');
  
  // Remove comentários de bloco
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Normaliza espaços em branco mas preserva quebras de linha
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  return cleaned;
}

function extractFunctionDetails(functionInfo: FunctionInfo, code: string): any {
  const signature = functionInfo.signature;
  
  const visibility = extractVisibility(signature);
  const isStatic = signature.includes('static');
  const returnType = extractReturnType(signature, functionInfo.body);
  const parameters = extractParameters(signature);
  const annotations = extractAnnotations(code, functionInfo.startLine);
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
  return 'package';
}

function extractReturnType(signature: string, body: string): string {
  // Primeiro, tentar extrair da assinatura
  const signatureParts = signature.split(/\s+/);
  let returnType = 'void';
  
  for (let i = 0; i < signatureParts.length; i++) {
    const part = signatureParts[i];
    
    // Pular modificadores
    if (['public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized'].includes(part)) {
      continue;
    }
    
    // Se o próximo token contém parênteses, o atual é o tipo de retorno
    if (i + 1 < signatureParts.length && signatureParts[i + 1].includes('(')) {
      returnType = part;
      break;
    }
  }
  
  // Se não encontrou, tentar inferir do corpo
  if (returnType === 'void') {
    const returnMatches = body.match(/return\s+([^;]+);/g);
    if (returnMatches) {
      const returnValue = returnMatches[0].replace(/return\s+/, '').replace(';', '').trim();
      
      if (/^\d+$/.test(returnValue)) return 'int';
      if (/^\d+\.\d+$/.test(returnValue)) return 'double';
      if (/^".*"$/.test(returnValue)) return 'String';
      if (/^(true|false)$/.test(returnValue)) return 'boolean';
    }
  }
  
  return returnType;
}

function extractParameters(signature: string): Parameter[] {
  const parenStart = signature.indexOf('(');
  const parenEnd = signature.lastIndexOf(')');
  
  if (parenStart === -1 || parenEnd === -1) return [];
  
  const paramString = signature.substring(parenStart + 1, parenEnd).trim();
  if (!paramString) return [];
  
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

function calculateBasicComplexity(body: string): number {
  let complexity = 1;
  
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

function extractLocalVariables(body: string): LocalVariable[] {
  const variables: LocalVariable[] = [];
  
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
  
  const pattern = /([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*\(([^)]*)\)/g;
  
  let match;
  while ((match = pattern.exec(body)) !== null) {
    const fullCall = match[1];
    const paramString = match[2];
    const parts = fullCall.split('.');
    
    const parameters = extractMethodCallParameters(paramString);
    
    if (parts.length > 1) {
      functions.push({
        methodName: parts[parts.length - 1],
        className: parts[parts.length - 2],
        parameters: parameters,
        isStaticCall: /^[A-Z]/.test(parts[0])
      });
    } else {
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

function extractMethodCallParameters(paramString: string): string[] {
  if (!paramString || paramString.trim() === '') {
    return [];
  }
  
  const params = smartSplit(paramString, ',');
  return params.map(param => param.trim()).filter(param => param.length > 0);
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
  return /^[A-Z]/.test(word) && word.length > 1;
}