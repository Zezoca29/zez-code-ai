"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScenarios = generateScenarios;
function generateScenarios(parameters, calledFunctions) {
    const paramScenarios = parameters.map(p => {
        if (p.type === 'int' || p.type === 'Integer')
            return [0, 1, -1];
        if (p.type === 'String')
            return ["", "test", null];
        return [null];
    });
    const combine = (arrs, prefix = []) => {
        if (!arrs.length)
            return [prefix];
        const [head, ...tail] = arrs;
        return head.flatMap(val => combine(tail, [...prefix, val]));
    };
    return combine(paramScenarios);
}
//# sourceMappingURL=scenarioGenerator.js.map