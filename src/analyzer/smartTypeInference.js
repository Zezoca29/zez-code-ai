"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartTypeInference = void 0;
class SmartTypeInference {
    static TYPE_MAPPINGS = {
        // Primitive types
        'int': {
            javaType: 'int',
            defaultValue: '1',
            validValues: ['1', '10', '100', '0', '-1'],
            imports: [],
            edgeCases: [
                { name: 'Zero', value: '0', description: 'zero value' },
                { name: 'Negative', value: '-1', description: 'negative value' },
                { name: 'MaxValue', value: 'Integer.MAX_VALUE', description: 'maximum value' }
            ]
        },
        'Integer': {
            javaType: 'Integer',
            defaultValue: '1',
            validValues: ['1', '10', '100', 'null'],
            imports: [],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' },
                { name: 'Zero', value: '0', description: 'zero value' }
            ]
        },
        'long': {
            javaType: 'long',
            defaultValue: '1L',
            validValues: ['1L', '100L', '1000L'],
            imports: [],
            edgeCases: [
                { name: 'Zero', value: '0L', description: 'zero value' },
                { name: 'MaxValue', value: 'Long.MAX_VALUE', description: 'maximum value' }
            ]
        },
        'Long': {
            javaType: 'Long',
            defaultValue: '1L',
            validValues: ['1L', '100L', '1000L', 'null'],
            imports: [],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        },
        'double': {
            javaType: 'double',
            defaultValue: '1.0',
            validValues: ['1.0', '10.5', '100.99'],
            imports: [],
            edgeCases: [
                { name: 'Zero', value: '0.0', description: 'zero value' },
                { name: 'Negative', value: '-1.0', description: 'negative value' }
            ]
        },
        'Double': {
            javaType: 'Double',
            defaultValue: '1.0',
            validValues: ['1.0', '10.5', '100.99', 'null'],
            imports: [],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        },
        'boolean': {
            javaType: 'boolean',
            defaultValue: 'true',
            validValues: ['true', 'false'],
            imports: [],
            edgeCases: [
                { name: 'False', value: 'false', description: 'false value' }
            ]
        },
        'Boolean': {
            javaType: 'Boolean',
            defaultValue: 'true',
            validValues: ['true', 'false', 'null'],
            imports: [],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        },
        'String': {
            javaType: 'String',
            defaultValue: '"test"',
            validValues: ['"test"', '"hello"', '"world"', '""'],
            imports: [],
            edgeCases: [
                { name: 'Empty', value: '""', description: 'empty string' },
                { name: 'Null', value: 'null', description: 'null value' },
                { name: 'Whitespace', value: '" "', description: 'whitespace only' }
            ]
        },
        'char': {
            javaType: 'char',
            defaultValue: "'a'",
            validValues: ["'a'", "'b'", "'c'"],
            imports: [],
            edgeCases: [
                { name: 'Space', value: "' '", description: 'space character' }
            ]
        },
        'Character': {
            javaType: 'Character',
            defaultValue: "'a'",
            validValues: ["'a'", "'b'", "'c'", 'null'],
            imports: [],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        },
        // Collection types
        'List': {
            javaType: 'List<Object>',
            defaultValue: 'new ArrayList<>()',
            validValues: ['new ArrayList<>()', 'Arrays.asList()', 'new LinkedList<>()'],
            imports: ['import java.util.List;', 'import java.util.ArrayList;'],
            edgeCases: [
                { name: 'Empty', value: 'new ArrayList<>()', description: 'empty list' },
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        },
        'List<String>': {
            javaType: 'List<String>',
            defaultValue: 'new ArrayList<>()',
            validValues: ['new ArrayList<>()', 'Arrays.asList("test")'],
            imports: ['import java.util.List;', 'import java.util.ArrayList;'],
            edgeCases: [
                { name: 'Empty', value: 'new ArrayList<>()', description: 'empty list' }
            ]
        },
        'List<Integer>': {
            javaType: 'List<Integer>',
            defaultValue: 'new ArrayList<>()',
            validValues: ['new ArrayList<>()', 'Arrays.asList(1, 2, 3)'],
            imports: ['import java.util.List;', 'import java.util.ArrayList;'],
            edgeCases: [
                { name: 'Empty', value: 'new ArrayList<>()', description: 'empty list' }
            ]
        },
        'Set': {
            javaType: 'Set<Object>',
            defaultValue: 'new HashSet<>()',
            validValues: ['new HashSet<>()', 'new TreeSet<>()'],
            imports: ['import java.util.Set;', 'import java.util.HashSet;'],
            edgeCases: [
                { name: 'Empty', value: 'new HashSet<>()', description: 'empty set' }
            ]
        },
        'Map': {
            javaType: 'Map<String, Object>',
            defaultValue: 'new HashMap<>()',
            validValues: ['new HashMap<>()', 'new TreeMap<>()'],
            imports: ['import java.util.Map;', 'import java.util.HashMap;'],
            edgeCases: [
                { name: 'Empty', value: 'new HashMap<>()', description: 'empty map' }
            ]
        },
        // Date/Time types
        'Date': {
            javaType: 'Date',
            defaultValue: 'new Date()',
            validValues: ['new Date()', 'new Date(System.currentTimeMillis())'],
            imports: ['import java.util.Date;'],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        },
        'LocalDate': {
            javaType: 'LocalDate',
            defaultValue: 'LocalDate.now()',
            validValues: ['LocalDate.now()', 'LocalDate.of(2023, 1, 1)'],
            imports: ['import java.time.LocalDate;'],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' },
                { name: 'Past', value: 'LocalDate.of(2020, 1, 1)', description: 'past date' }
            ]
        },
        'LocalDateTime': {
            javaType: 'LocalDateTime',
            defaultValue: 'LocalDateTime.now()',
            validValues: ['LocalDateTime.now()', 'LocalDateTime.of(2023, 1, 1, 12, 0)'],
            imports: ['import java.time.LocalDateTime;'],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        },
        // Common Java types
        'BigDecimal': {
            javaType: 'BigDecimal',
            defaultValue: 'new BigDecimal("1.0")',
            validValues: ['new BigDecimal("1.0")', 'new BigDecimal("100.50")'],
            imports: ['import java.math.BigDecimal;'],
            edgeCases: [
                { name: 'Zero', value: 'BigDecimal.ZERO', description: 'zero value' },
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        },
        'UUID': {
            javaType: 'UUID',
            defaultValue: 'UUID.randomUUID()',
            validValues: ['UUID.randomUUID()'],
            imports: ['import java.util.UUID;'],
            edgeCases: [
                { name: 'Null', value: 'null', description: 'null value' }
            ]
        }
    };
    /**
     * Infers Java type and value from a given type string
     */
    static inferType(type, parameterName) {
        // Clean the type string
        const cleanType = this.cleanTypeString(type);
        // Check if we have a direct mapping
        if (this.TYPE_MAPPINGS[cleanType]) {
            const mapping = this.TYPE_MAPPINGS[cleanType];
            return {
                javaType: mapping.javaType,
                javaValue: mapping.defaultValue,
                imports: mapping.imports,
                isValid: true,
                suggestions: []
            };
        }
        // Handle array types
        if (cleanType.endsWith('[]')) {
            const elementType = cleanType.slice(0, -2);
            const elementInference = this.inferType(elementType);
            return {
                javaType: `${elementInference.javaType}[]`,
                javaValue: `new ${elementInference.javaType}[0]`,
                imports: elementInference.imports,
                isValid: true,
                suggestions: []
            };
        }
        // Handle generic types
        if (cleanType.includes('<')) {
            return this.inferGenericType(cleanType);
        }
        // Handle custom classes
        return this.inferCustomClass(cleanType, parameterName);
    }
    /**
     * Converts a value to proper Java representation
     */
    static convertToJavaValue(value, targetType) {
        // If value is already a string that looks like Java code, return it
        if (typeof value === 'string') {
            if (value.startsWith('new ') || value.includes('(') || value === 'null') {
                return {
                    javaType: targetType,
                    javaValue: value,
                    imports: [],
                    isValid: true,
                    suggestions: []
                };
            }
            // Check if it's a string literal
            if (value.startsWith('"') && value.endsWith('"')) {
                return {
                    javaType: 'String',
                    javaValue: value,
                    imports: [],
                    isValid: true,
                    suggestions: []
                };
            }
        }
        // Handle null values
        if (value === null) {
            return {
                javaType: targetType,
                javaValue: 'null',
                imports: [],
                isValid: true,
                suggestions: []
            };
        }
        // Handle primitive types
        if (typeof value === 'boolean') {
            return {
                javaType: 'boolean',
                javaValue: value ? 'true' : 'false',
                imports: [],
                isValid: true,
                suggestions: []
            };
        }
        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                return {
                    javaType: 'int',
                    javaValue: value.toString(),
                    imports: [],
                    isValid: true,
                    suggestions: []
                };
            }
            else {
                return {
                    javaType: 'double',
                    javaValue: value.toString(),
                    imports: [],
                    isValid: true,
                    suggestions: []
                };
            }
        }
        if (typeof value === 'string') {
            return {
                javaType: 'String',
                javaValue: `"${value}"`,
                imports: [],
                isValid: true,
                suggestions: []
            };
        }
        // Handle arrays
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return {
                    javaType: 'List<Object>',
                    javaValue: 'new ArrayList<>()',
                    imports: ['import java.util.List;', 'import java.util.ArrayList;'],
                    isValid: true,
                    suggestions: []
                };
            }
            const elementType = this.inferTypeFromArray(value);
            return {
                javaType: `List<${elementType}>`,
                javaValue: `Arrays.asList(${value.map(v => this.convertToJavaValue(v, elementType).javaValue).join(', ')})`,
                imports: ['import java.util.List;', 'import java.util.Arrays;'],
                isValid: true,
                suggestions: []
            };
        }
        // Default case
        return {
            javaType: targetType || 'Object',
            javaValue: value.toString(),
            imports: [],
            isValid: false,
            suggestions: [`Unable to convert value ${value} to Java type ${targetType}`]
        };
    }
    /**
     * Generates mock return value for a given type
     */
    static generateMockReturnValue(returnType) {
        const inference = this.inferType(returnType);
        if (!inference.isValid) {
            return 'mock(Object.class)';
        }
        // For primitive types and common objects, return specific values
        switch (inference.javaType) {
            case 'String': return '"mockedString"';
            case 'int':
            case 'Integer': return '1';
            case 'long':
            case 'Long': return '1L';
            case 'double':
            case 'Double': return '1.0';
            case 'float':
            case 'Float': return '1.0f';
            case 'boolean':
            case 'Boolean': return 'true';
            case 'char':
            case 'Character': return "'m'";
            case 'List':
            case 'List<Object>': return 'new ArrayList<>()';
            case 'Set':
            case 'Set<Object>': return 'new HashSet<>()';
            case 'Map':
            case 'Map<String, Object>': return 'new HashMap<>()';
            case 'Date': return 'new Date()';
            case 'LocalDate': return 'LocalDate.now()';
            case 'LocalDateTime': return 'LocalDateTime.now()';
            case 'BigDecimal': return 'new BigDecimal("1.0")';
            case 'UUID': return 'UUID.randomUUID()';
            default:
                // For custom classes, try to create a mock
                if (inference.javaType.includes('[]')) {
                    return 'new ' + inference.javaType.replace('[]', '[0]');
                }
                return `mock(${inference.javaType}.class)`;
        }
    }
    /**
     * Cleans a type string for better matching
     */
    static cleanTypeString(type) {
        return type.trim().replace(/\s+/g, '');
    }
    /**
     * Infers generic types like List<String>, Map<String, Integer>, etc.
     */
    static inferGenericType(genericType) {
        const match = genericType.match(/(\w+)<(.+)>/);
        if (!match) {
            return {
                javaType: genericType,
                javaValue: `new ${genericType}()`,
                imports: [],
                isValid: false,
                suggestions: [`Unable to parse generic type: ${genericType}`]
            };
        }
        const baseType = match[1];
        const typeParams = match[2].split(',').map(t => t.trim());
        // Handle common generic types
        switch (baseType) {
            case 'List':
                const elementType = this.inferType(typeParams[0]);
                return {
                    javaType: `List<${elementType.javaType}>`,
                    javaValue: 'new ArrayList<>()',
                    imports: ['import java.util.List;', 'import java.util.ArrayList;', ...elementType.imports],
                    isValid: true,
                    suggestions: []
                };
            case 'Set':
                const setElementType = this.inferType(typeParams[0]);
                return {
                    javaType: `Set<${setElementType.javaType}>`,
                    javaValue: 'new HashSet<>()',
                    imports: ['import java.util.Set;', 'import java.util.HashSet;', ...setElementType.imports],
                    isValid: true,
                    suggestions: []
                };
            case 'Map':
                const keyType = this.inferType(typeParams[0]);
                const valueType = this.inferType(typeParams[1]);
                return {
                    javaType: `Map<${keyType.javaType}, ${valueType.javaType}>`,
                    javaValue: 'new HashMap<>()',
                    imports: ['import java.util.Map;', 'import java.util.HashMap;', ...keyType.imports, ...valueType.imports],
                    isValid: true,
                    suggestions: []
                };
            case 'Optional':
                const optionalType = this.inferType(typeParams[0]);
                return {
                    javaType: `Optional<${optionalType.javaType}>`,
                    javaValue: 'Optional.empty()',
                    imports: ['import java.util.Optional;', ...optionalType.imports],
                    isValid: true,
                    suggestions: []
                };
            default:
                return {
                    javaType: genericType,
                    javaValue: `new ${genericType}()`,
                    imports: [],
                    isValid: false,
                    suggestions: [`Unsupported generic type: ${genericType}`]
                };
        }
    }
    /**
     * Infers custom class types
     */
    static inferCustomClass(className, parameterName) {
        // Try to infer from parameter name
        if (parameterName) {
            const nameInference = this.inferFromParameterName(parameterName);
            if (nameInference) {
                return nameInference;
            }
        }
        // Default custom class handling
        return {
            javaType: className,
            javaValue: `new ${className}()`,
            imports: [],
            isValid: true,
            suggestions: [`Consider creating a test data builder for ${className}`]
        };
    }
    /**
     * Infers type from parameter name (heuristic approach)
     */
    static inferFromParameterName(parameterName) {
        const name = parameterName.toLowerCase();
        if (name.includes('id') || name.includes('id')) {
            return {
                javaType: 'Long',
                javaValue: '1L',
                imports: [],
                isValid: true,
                suggestions: []
            };
        }
        if (name.includes('name') || name.includes('title') || name.includes('description')) {
            return {
                javaType: 'String',
                javaValue: '"test"',
                imports: [],
                isValid: true,
                suggestions: []
            };
        }
        if (name.includes('date') || name.includes('time')) {
            return {
                javaType: 'LocalDate',
                javaValue: 'LocalDate.now()',
                imports: ['import java.time.LocalDate;'],
                isValid: true,
                suggestions: []
            };
        }
        if (name.includes('amount') || name.includes('price') || name.includes('value')) {
            return {
                javaType: 'BigDecimal',
                javaValue: 'new BigDecimal("100.00")',
                imports: ['import java.math.BigDecimal;'],
                isValid: true,
                suggestions: []
            };
        }
        if (name.includes('enabled') || name.includes('active') || name.includes('valid')) {
            return {
                javaType: 'boolean',
                javaValue: 'true',
                imports: [],
                isValid: true,
                suggestions: []
            };
        }
        return null;
    }
    /**
     * Infers type from array values
     */
    static inferTypeFromArray(array) {
        if (array.length === 0)
            return 'Object';
        const firstElement = array[0];
        if (typeof firstElement === 'string')
            return 'String';
        if (typeof firstElement === 'number')
            return Number.isInteger(firstElement) ? 'Integer' : 'Double';
        if (typeof firstElement === 'boolean')
            return 'Boolean';
        return 'Object';
    }
}
exports.SmartTypeInference = SmartTypeInference;
//# sourceMappingURL=smartTypeInference.js.map