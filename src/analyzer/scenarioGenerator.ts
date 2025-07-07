interface Parameter {
  name: string;
  type: string;
}

export function generateScenarios(parameters: Parameter[], calledFunctions: string[]): any[][] {
  const paramScenarios = parameters.map(p => {
    if (p.type === 'int' || p.type === 'Integer') return [0, 1, -1];
    if (p.type === 'String') return ["", "test", null];
    return [null];
  });

  const combine = (arrs: any[][], prefix: any[] = []): any[][] => {
    if (!arrs.length) return [prefix];
    const [head, ...tail] = arrs;
    return head.flatMap(val => combine(tail, [...prefix, val]));
  };

  return combine(paramScenarios);
}