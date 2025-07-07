export interface Parameter {
  name: string;
  type: string;
  annotations?: string[];
  isOptional?: boolean;
}

export interface LocalVariable {
  name: string;
  type: string;
  initialValue?: string;
}

export interface MethodCall {
  methodName: string;
  className?: string;
  parameters: string[];
  returnType?: string;
  isStaticCall?: boolean;
}

export interface ParsedFunction {
  name: string;
  returnType: string;
  parameters: Parameter[];
  localVariables: LocalVariable[];
  calledFunctions: MethodCall[];
  annotations: string[];
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  throwsExceptions: string[];
  complexity: number;
  lines: number;
}

export async function parseJavaFunction(code: string, targetName: string): Promise<ParsedFunction> {
  const { parse } = await import('java-parser');
  const cst: any = parse(code);

  // Função recursiva para encontrar todos os métodos
  function findMethods(node: any): any[] {
    if (!node || typeof node !== 'object') return [];
    let found: any[] = [];
    if (node.node === 'MethodDeclaration') {
      found.push(node);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        value.forEach(child => found.push(...findMethods(child)));
      } else if (typeof value === 'object') {
        found.push(...findMethods(value));
      }
    }
    return found;
  }

  // Função para extrair anotações
  function extractAnnotations(node: any): string[] {
    if (!node?.annotations) return [];
    return node.annotations.map((annotation: any) => 
      annotation.name?.identifier || annotation.name?.name || 'Unknown'
    );
  }

  // Função para determinar visibilidade
  function getVisibility(modifiers: any[]): 'public' | 'private' | 'protected' | 'package' {
    if (!modifiers) return 'package';
    for (const modifier of modifiers) {
      if (modifier.token === 'public') return 'public';
      if (modifier.token === 'private') return 'private';
      if (modifier.token === 'protected') return 'protected';
    }
    return 'package';
  }

  // Função para verificar se é estático
  function isStaticMethod(modifiers: any[]): boolean {
    if (!modifiers) return false;
    return modifiers.some(mod => mod.token === 'static');
  }

  // Função para extrair exceções
  function extractThrows(node: any): string[] {
    if (!node?.throws) return [];
    return node.throws.map((throwsItem: any) => 
      throwsItem.name?.identifier || throwsItem.identifier || 'Unknown'
    );
  }

  // Função para calcular complexidade ciclomática
  function calculateComplexity(node: any): number {
    let complexity = 1; // Complexidade base
    
    function traverse(n: any) {
      if (!n || typeof n !== 'object') return;
      
      // Incrementa para estruturas de controle
      if (n.node === 'IfStatement') complexity++;
      if (n.node === 'WhileStatement') complexity++;
      if (n.node === 'ForStatement') complexity++;
      if (n.node === 'DoWhileStatement') complexity++;
      if (n.node === 'SwitchStatement') complexity++;
      if (n.node === 'CatchClause') complexity++;
      if (n.node === 'ConditionalExpression') complexity++;
      
      // Traverse recursivamente
      Object.values(n).forEach(value => {
        if (Array.isArray(value)) {
          value.forEach(traverse);
        } else if (typeof value === 'object') {
          traverse(value);
        }
      });
    }
    
    traverse(node);
    return complexity;
  }

  // Função para contar linhas
  function countLines(node: any): number {
    if (!node?.body) return 0;
    const bodyText = JSON.stringify(node.body);
    return (bodyText.match(/\n/g) || []).length + 1;
  }

  // Função para extrair chamadas de método melhorada
  function extractMethodCalls(node: any): MethodCall[] {
    const calls: MethodCall[] = [];
    
    function traverse(n: any) {
      if (!n || typeof n !== 'object') return;
      
      if (n.node === 'MethodInvocation') {
        const methodCall: MethodCall = {
          methodName: n.member || 'unknown',
          className: n.expression?.identifier,
          parameters: n.arguments?.map((arg: any) => arg.value || arg.identifier || 'unknown') || [],
          isStaticCall: !!n.expression?.name
        };
        calls.push(methodCall);
      }
      
      Object.values(n).forEach(value => {
        if (Array.isArray(value)) {
          value.forEach(traverse);
        } else if (typeof value === 'object') {
          traverse(value);
        }
      });
    }
    
    traverse(node);
    return calls;
  }

  // Função para extrair parâmetros melhorada
  function extractParameters(method: any): Parameter[] {
    if (!method.parameters) return [];
    
    return method.parameters.map((param: any) => ({
      name: param.name?.identifier || 'unknown',
      type: extractTypeInfo(param.type),
      annotations: extractAnnotations(param),
      isOptional: false // Java não tem parâmetros opcionais nativamente
    }));
  }

  // Função para extrair informações de tipo
  function extractTypeInfo(typeNode: any): string {
    if (!typeNode) return 'unknown';
    
    if (typeNode.name?.identifier) {
      return typeNode.name.identifier;
    }
    
    if (typeNode.identifier) {
      return typeNode.identifier;
    }
    
    // Para tipos genéricos
    if (typeNode.typeArguments) {
      const baseType = typeNode.name?.identifier || 'unknown';
      const typeArgs = typeNode.typeArguments.map((arg: any) => extractTypeInfo(arg)).join(', ');
      return `${baseType}<${typeArgs}>`;
    }
    
    // Para arrays
    if (typeNode.dimensions) {
      const baseType = extractTypeInfo(typeNode.type || typeNode);
      return baseType + '[]'.repeat(typeNode.dimensions.length);
    }
    
    return 'unknown';
  }

  // Função para extrair variáveis locais melhorada
  function extractLocalVariables(method: any): LocalVariable[] {
    if (!method.body?.statements) return [];
    
    const variables: LocalVariable[] = [];
    
    function traverse(statements: any[]) {
      statements.forEach(stmt => {
        if (stmt.node === 'LocalVariableDeclaration') {
          stmt.variableDeclarators?.forEach((decl: any) => {
            variables.push({
              name: decl.id?.identifier || 'unknown',
              type: extractTypeInfo(stmt.type),
              initialValue: decl.init?.value || decl.init?.identifier
            });
          });
        }
        
        // Traverse blocos aninhados
        if (stmt.statements) {
          traverse(stmt.statements);
        }
        if (stmt.body?.statements) {
          traverse(stmt.body.statements);
        }
      });
    }
    
    traverse(method.body.statements);
    return variables;
  }

  const methods = findMethods(cst);
  const method = methods.find((m: any) => m.name?.identifier === targetName);

  if (!method) {
    throw new Error(`Função '${targetName}' não encontrada no código.`);
  }

  const returnType = extractTypeInfo(method.returnType);
  const parameters = extractParameters(method);
  const localVariables = extractLocalVariables(method);
  const calledFunctions = extractMethodCalls(method);
  const annotations = extractAnnotations(method);
  const visibility = getVisibility(method.modifiers);
  const isStatic = isStaticMethod(method.modifiers);
  const throwsExceptions = extractThrows(method);
  const complexity = calculateComplexity(method);
  const lines = countLines(method);

  return {
    name: targetName,
    returnType,
    parameters,
    localVariables,
    calledFunctions,
    annotations,
    visibility,
    isStatic,
    throwsExceptions,
    complexity,
    lines
  };
}