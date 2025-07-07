export async function parseJavaFunction(code: string, targetName: string) {
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

  const methods = findMethods(cst);
  const method = methods.find((m: any) => m.name?.identifier === targetName);

  if (!method) {
    throw new Error(`Função '${targetName}' não encontrada no código.`);
  }

  const parameters = method?.parameters?.map((param: any) => ({
    name: param.name?.identifier,
    type: param.type?.name?.identifier
  })) || [];

  const localVariables = method?.body?.statements?.filter((stmt: any) => stmt.node === 'LocalVariableDeclaration')?.map((decl: any) => ({
    name: decl.variableDeclarators?.[0]?.id?.identifier,
    type: decl.type?.name?.identifier
  })) || [];

  const calledFunctions: string[] = [];
  const collectCalls = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (node.node === 'MethodInvocation') {
      calledFunctions.push(node.member);
    }
    Object.values(node).forEach(collectCalls);
  };
  collectCalls(method?.body);

  return { parameters, localVariables, calledFunctions };
}