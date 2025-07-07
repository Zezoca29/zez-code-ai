"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJavaFunction = parseJavaFunction;
async function parseJavaFunction(code, targetName) {
    const { parse } = await import('java-parser');
    const cst = parse(code);
    // Função recursiva para encontrar todos os métodos
    function findMethods(node) {
        if (!node || typeof node !== 'object')
            return [];
        let found = [];
        if (node.node === 'MethodDeclaration') {
            found.push(node);
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) {
                value.forEach(child => found.push(...findMethods(child)));
            }
            else if (typeof value === 'object') {
                found.push(...findMethods(value));
            }
        }
        return found;
    }
    const methods = findMethods(cst);
    const method = methods.find((m) => m.name?.identifier === targetName);
    if (!method) {
        throw new Error(`Função '${targetName}' não encontrada no código.`);
    }
    const parameters = method?.parameters?.map((param) => ({
        name: param.name?.identifier,
        type: param.type?.name?.identifier
    })) || [];
    const localVariables = method?.body?.statements?.filter((stmt) => stmt.node === 'LocalVariableDeclaration')?.map((decl) => ({
        name: decl.variableDeclarators?.[0]?.id?.identifier,
        type: decl.type?.name?.identifier
    })) || [];
    const calledFunctions = [];
    const collectCalls = (node) => {
        if (!node || typeof node !== 'object')
            return;
        if (node.node === 'MethodInvocation') {
            calledFunctions.push(node.member);
        }
        Object.values(node).forEach(collectCalls);
    };
    collectCalls(method?.body);
    return { parameters, localVariables, calledFunctions };
}
//# sourceMappingURL=javaParser.js.map