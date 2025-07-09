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
      error: `Erro no parsing: ${error}`
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

export interface DecisionBranch {
  type: 'if' | 'else' | 'elseif' | 'switch' | 'case' | 'default';
  condition: string;
  body: string;
  startLine: number;
  endLine: number;
  scenario?: string;
  complexity: number;
  nestedLevel: number;
  variables: LocalVariable[];
  calledFunctions: CalledFunction[];
}

export interface SwitchStatement {
  expression: string;
  cases: DecisionBranch[];
  defaultCase?: DecisionBranch;
  startLine: number;
  endLine: number;
  scenario?: string;
}

export interface ConditionalStatement {
  type: 'if-else' | 'ternary';
  mainCondition: string;
  branches: DecisionBranch[];
  startLine: number;
  endLine: number;
  scenario?: string;
  hasElse: boolean;
}

export interface DecisionAnalysis {
  conditionals: ConditionalStatement[];
  switches: SwitchStatement[];
  totalBranches: number;
  cyclomaticComplexity: number;
  scenarios: ScenarioMapping[];
}

export interface ScenarioMapping {
  scenario: string;
  branches: DecisionBranch[];
  coverage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export async function analyzeDecisionBranches(
  code: string,
  className: string,
  methodName: string
): Promise<DecisionAnalysis> {
  console.log(`=== ANÁLISE DE RAMOS DE DECISÃO: ${className}.${methodName} ===`);
  
  try {
    // Primeiro, obter o método usando o parser existente
    const methodResult = await parseJavaFunctionInClass(code, className, methodName);
    
    if (!methodResult.found || !methodResult.method) {
      throw new Error(`Método ${methodName} não encontrado na classe ${className}`);
    }
    
    const method = methodResult.method;
    const methodBody = extractMethodBodyFromCode(code, className, methodName);
    
    // Analisar ramos de decisão
    const conditionals = extractConditionalStatements(methodBody);
    const switches = extractSwitchStatements(methodBody);
    const scenarios = generateScenarioMappings(conditionals, switches);
    
    const totalBranches = conditionals.reduce((sum, c) => sum + c.branches.length, 0) +
                         switches.reduce((sum, s) => sum + s.cases.length, 0);
    
    const cyclomaticComplexity = calculateCyclomaticComplexity(conditionals, switches);
    
    return {
      conditionals,
      switches,
      totalBranches,
      cyclomaticComplexity,
      scenarios
    };
    
  } catch (error) {
    console.error('Erro na análise de ramos de decisão:', error);
    throw error;
  }
}

function extractMethodBodyFromCode(code: string, className: string, methodName: string): string {
  // Simplificação: buscar o método no código
  const methodPattern = new RegExp(
    `(public|private|protected|static|final|abstract|synchronized)\\s+.*\\s+${methodName}\\s*\\([^)]*\\)\\s*\\{`
  );
  
  const match = code.match(methodPattern);
  if (!match) {
    throw new Error(`Método ${methodName} não encontrado`);
  }
  
  const startIndex = match.index! + match[0].length - 1;
  return extractMethodBody(code, startIndex);
}

function extractConditionalStatements(code: string): ConditionalStatement[] {
  const conditionals: ConditionalStatement[] = [];
  const lines = code.split('\n');
  
  // Padrão para if-else completo
  const ifPattern = /\bif\s*\(\s*([^)]+)\s*\)\s*\{?/g;
  
  let match;
  while ((match = ifPattern.exec(code)) !== null) {
    const startIndex = match.index!;
    const condition = match[1].trim();
    const startLine = code.substring(0, startIndex).split('\n').length;
    
    // Extrair toda a estrutura if-else
    const ifElseStructure = extractIfElseStructure(code, startIndex);
    
    if (ifElseStructure) {
      const branches = analyzeIfElseBranches(ifElseStructure, startLine);
      const scenario = inferScenarioFromCondition(condition);
      
      conditionals.push({
        type: 'if-else',
        mainCondition: condition,
        branches,
        startLine,
        endLine: startLine + ifElseStructure.split('\n').length,
        scenario,
        hasElse: branches.some(b => b.type === 'else')
      });
    }
  }
  
  // Também detectar operadores ternários
  const ternaryPattern = /([^?]+)\?\s*([^:]+)\s*:\s*([^;,)]+)/g;
  
  while ((match = ternaryPattern.exec(code)) !== null) {
    const startIndex = match.index!;
    const condition = match[1].trim();
    const trueValue = match[2].trim();
    const falseValue = match[3].trim();
    const startLine = code.substring(0, startIndex).split('\n').length;
    
    const trueBranch: DecisionBranch = {
      type: 'if',
      condition,
      body: trueValue,
      startLine,
      endLine: startLine,
      complexity: 1,
      nestedLevel: 0,
      variables: [],
      calledFunctions: []
    };
    
    const falseBranch: DecisionBranch = {
      type: 'else',
      condition: `!(${condition})`,
      body: falseValue,
      startLine,
      endLine: startLine,
      complexity: 1,
      nestedLevel: 0,
      variables: [],
      calledFunctions: []
    };
    
    conditionals.push({
      type: 'ternary',
      mainCondition: condition,
      branches: [trueBranch, falseBranch],
      startLine,
      endLine: startLine,
      scenario: inferScenarioFromCondition(condition),
      hasElse: true
    });
  }
  
  return conditionals;
}

function extractIfElseStructure(code: string, startIndex: number): string | null {
  let braceCount = 0;
  let current = '';
  let inString = false;
  let stringChar = '';
  let foundEnd = false;
  
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
    
    current += char;
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          // Verificar se há else após este }
          const remaining = code.substring(i + 1).trim();
          if (remaining.startsWith('else')) {
            // Continuar para incluir o else
            continue;
          } else {
            foundEnd = true;
            break;
          }
        }
      }
    }
  }
  
  return foundEnd ? current : null;
}

function analyzeIfElseBranches(ifElseCode: string, startLine: number): DecisionBranch[] {
  const branches: DecisionBranch[] = [];
  
  // Extrair ramos if, else if, else
  const ifMatch = ifElseCode.match(/if\s*\(\s*([^)]+)\s*\)\s*\{([^}]*)\}/);
  if (ifMatch) {
    const condition = ifMatch[1].trim();
    const body = ifMatch[2].trim();
    
    branches.push({
      type: 'if',
      condition,
      body,
      startLine,
      endLine: startLine + body.split('\n').length,
      scenario: inferScenarioFromCondition(condition),
      complexity: calculateBranchComplexity(body),
      nestedLevel: 0,
      variables: extractLocalVariables(body),
      calledFunctions: extractCalledFunctions(body)
    });
  }
  
  // Extrair else if
  const elseIfPattern = /else\s+if\s*\(\s*([^)]+)\s*\)\s*\{([^}]*)\}/g;
  let elseIfMatch;
  while ((elseIfMatch = elseIfPattern.exec(ifElseCode)) !== null) {
    const condition = elseIfMatch[1].trim();
    const body = elseIfMatch[2].trim();
    
    branches.push({
      type: 'elseif',
      condition,
      body,
      startLine: startLine + 1,
      endLine: startLine + 1 + body.split('\n').length,
      scenario: inferScenarioFromCondition(condition),
      complexity: calculateBranchComplexity(body),
      nestedLevel: 0,
      variables: extractLocalVariables(body),
      calledFunctions: extractCalledFunctions(body)
    });
  }
  
  // Extrair else
  const elseMatch = ifElseCode.match(/else\s*\{([^}]*)\}/);
  if (elseMatch) {
    const body = elseMatch[1].trim();
    
    branches.push({
      type: 'else',
      condition: 'default',
      body,
      startLine: startLine + 2,
      endLine: startLine + 2 + body.split('\n').length,
      scenario: 'Caso padrão',
      complexity: calculateBranchComplexity(body),
      nestedLevel: 0,
      variables: extractLocalVariables(body),
      calledFunctions: extractCalledFunctions(body)
    });
  }
  
  return branches;
}

function extractSwitchStatements(code: string): SwitchStatement[] {
  const switches: SwitchStatement[] = [];
  const switchPattern = /switch\s*\(\s*([^)]+)\s*\)\s*\{([^}]+)\}/g;
  
  let match;
  while ((match = switchPattern.exec(code)) !== null) {
    const expression = match[1].trim();
    const switchBody = match[2];
    const startIndex = match.index!;
    const startLine = code.substring(0, startIndex).split('\n').length;
    
    const cases = extractSwitchCases(switchBody, startLine);
    const defaultCase = cases.find(c => c.type === 'default');
    const regularCases = cases.filter(c => c.type === 'case');
    
    switches.push({
      expression,
      cases: regularCases,
      defaultCase,
      startLine,
      endLine: startLine + switchBody.split('\n').length,
      scenario: `Switch em ${expression}`
    });
  }
  
  return switches;
}

function extractSwitchCases(switchBody: string, startLine: number): DecisionBranch[] {
  const cases: DecisionBranch[] = [];
  
  // Extrair cases
  const casePattern = /case\s+([^:]+):\s*([^case^default]*?)(?=case|default|$)/g;
  let caseMatch;
  
  while ((caseMatch = casePattern.exec(switchBody)) !== null) {
    const caseValue = caseMatch[1].trim();
    const caseBody = caseMatch[2].trim();
    
    cases.push({
      type: 'case',
      condition: `${caseValue}`,
      body: caseBody,
      startLine: startLine + 1,
      endLine: startLine + 1 + caseBody.split('\n').length,
      scenario: `Caso ${caseValue}`,
      complexity: calculateBranchComplexity(caseBody),
      nestedLevel: 0,
      variables: extractLocalVariables(caseBody),
      calledFunctions: extractCalledFunctions(caseBody)
    });
  }
  
  // Extrair default
  const defaultMatch = switchBody.match(/default\s*:\s*([^}]*)/);
  if (defaultMatch) {
    const defaultBody = defaultMatch[1].trim();
    
    cases.push({
      type: 'default',
      condition: 'default',
      body: defaultBody,
      startLine: startLine + 2,
      endLine: startLine + 2 + defaultBody.split('\n').length,
      scenario: 'Caso padrão',
      complexity: calculateBranchComplexity(defaultBody),
      nestedLevel: 0,
      variables: extractLocalVariables(defaultBody),
      calledFunctions: extractCalledFunctions(defaultBody)
    });
  }
  
  return cases;
}

function inferScenarioFromCondition(condition: string): string {
  // Inferir cenário baseado na condição
  const scenarios = {
    'null': 'Verificação de nulidade',
    'empty': 'Verificação de vazio',
    'size': 'Verificação de tamanho',
    'length': 'Verificação de comprimento',
    'equals': 'Comparação de igualdade',
    'contains': 'Verificação de conteúdo',
    'instanceof': 'Verificação de tipo',
    '==': 'Comparação de igualdade',
    '!=': 'Comparação de desigualdade',
    '<': 'Comparação menor que',
    '>': 'Comparação maior que',
    '<=': 'Comparação menor ou igual',
    '>=': 'Comparação maior ou igual',
    '&&': 'Condição múltipla (E)',
    '||': 'Condição múltipla (OU)'
  };
  
  const lowerCondition = condition.toLowerCase();
  
  for (const [keyword, scenario] of Object.entries(scenarios)) {
    if (lowerCondition.includes(keyword)) {
      return scenario;
    }
  }
  
  return 'Condição personalizada';
}

function calculateBranchComplexity(body: string): number {
  let complexity = 1;
  
  const controlStructures = [
    /\bif\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bswitch\s*\(/g,
    /\btry\s*\{/g,
    /\bcatch\s*\(/g
  ];
  
  for (const pattern of controlStructures) {
    const matches = body.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

function calculateCyclomaticComplexity(
  conditionals: ConditionalStatement[],
  switches: SwitchStatement[]
): number {
  let complexity = 1; // Complexidade base
  
  // Somar complexidade dos condicionais
  for (const conditional of conditionals) {
    complexity += conditional.branches.length - 1; // -1 porque o primeiro ramo não adiciona complexidade
    
    // Adicionar complexidade para operadores lógicos
    const logicalOperators = conditional.mainCondition.match(/&&|\|\|/g);
    if (logicalOperators) {
      complexity += logicalOperators.length;
    }
  }
  
  // Somar complexidade dos switches
  for (const switchStmt of switches) {
    complexity += switchStmt.cases.length;
  }
  
  return complexity;
}

function generateScenarioMappings(
  conditionals: ConditionalStatement[],
  switches: SwitchStatement[]
): ScenarioMapping[] {
  const scenarioMap = new Map<string, DecisionBranch[]>();
  
  // Agrupar branches por cenário
  for (const conditional of conditionals) {
    for (const branch of conditional.branches) {
      const scenario = branch.scenario || 'Cenário desconhecido';
      
      if (!scenarioMap.has(scenario)) {
        scenarioMap.set(scenario, []);
      }
      
      scenarioMap.get(scenario)!.push(branch);
    }
  }
  
  for (const switchStmt of switches) {
    const scenario = switchStmt.scenario || 'Switch desconhecido';
    
    if (!scenarioMap.has(scenario)) {
      scenarioMap.set(scenario, []);
    }
    
    scenarioMap.get(scenario)!.push(...switchStmt.cases);
    
    if (switchStmt.defaultCase) {
      scenarioMap.get(scenario)!.push(switchStmt.defaultCase);
    }
  }
  
  // Converter para array e calcular métricas
  const scenarios: ScenarioMapping[] = [];
  
  for (const [scenario, branches] of scenarioMap) {
    const totalComplexity = branches.reduce((sum, b) => sum + b.complexity, 0);
    const avgComplexity = totalComplexity / branches.length;
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (avgComplexity > 5) riskLevel = 'high';
    else if (avgComplexity > 2) riskLevel = 'medium';
    
    scenarios.push({
      scenario,
      branches,
      coverage: branches.length,
      riskLevel
    });
  }
  
  return scenarios.sort((a, b) => b.coverage - a.coverage);
}

// Função utilitária para imprimir análise
export function printDecisionAnalysis(analysis: DecisionAnalysis): void {
  console.log('\n=== ANÁLISE DE RAMOS DE DECISÃO ===');
  console.log(`Total de ramos: ${analysis.totalBranches}`);
  console.log(`Complexidade ciclomática: ${analysis.cyclomaticComplexity}`);
  
  console.log('\n--- CONDICIONAIS ---');
  analysis.conditionals.forEach((conditional, index) => {
    console.log(`${index + 1}. ${conditional.type.toUpperCase()}`);
    console.log(`   Condição: ${conditional.mainCondition}`);
    console.log(`   Cenário: ${conditional.scenario}`);
    console.log(`   Ramos: ${conditional.branches.length}`);
    console.log(`   Tem else: ${conditional.hasElse ? 'Sim' : 'Não'}`);
    
    conditional.branches.forEach((branch, branchIndex) => {
      console.log(`     ${branchIndex + 1}. ${branch.type}: ${branch.condition}`);
      console.log(`        Complexidade: ${branch.complexity}`);
      console.log(`        Variáveis: ${branch.variables.length}`);
      console.log(`        Funções chamadas: ${branch.calledFunctions.length}`);
    });
  });
  
  console.log('\n--- SWITCHES ---');
  analysis.switches.forEach((switchStmt, index) => {
    console.log(`${index + 1}. SWITCH`);
    console.log(`   Expressão: ${switchStmt.expression}`);
    console.log(`   Cenário: ${switchStmt.scenario}`);
    console.log(`   Cases: ${switchStmt.cases.length}`);
    console.log(`   Tem default: ${switchStmt.defaultCase ? 'Sim' : 'Não'}`);
    
    switchStmt.cases.forEach((caseStmt, caseIndex) => {
      console.log(`     ${caseIndex + 1}. case ${caseStmt.condition}`);
      console.log(`        Complexidade: ${caseStmt.complexity}`);
    });
  });
  
  console.log('\n--- CENÁRIOS ---');
  analysis.scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.scenario}`);
    console.log(`   Cobertura: ${scenario.coverage} ramos`);
    console.log(`   Nível de risco: ${scenario.riskLevel.toUpperCase()}`);
  });
}