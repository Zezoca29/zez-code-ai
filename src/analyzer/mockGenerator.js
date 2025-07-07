"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMock = generateMock;
exports.generateMocks = generateMocks;
function generateMock(functionName, returnType = "Object") {
    return `when(${functionName}(...)).thenReturn(mock${returnType}());`;
}
function generateMocks(functions) {
    return functions.map((fn) => generateMock(fn));
}
//# sourceMappingURL=mockGenerator.js.map