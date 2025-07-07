export function generateMock(functionName: string, returnType = "Object"): string {
  return `when(${functionName}(...)).thenReturn(mock${returnType}());`;
}

export function generateMocks(functions: string[]): string[] {
  return functions.map((fn: string) => generateMock(fn));
}
