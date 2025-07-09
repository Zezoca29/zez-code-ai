import { CalledFunction } from './javaParser';
import { ClassInfo } from './javaParserClass';

export interface ClassField {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  isFinal: boolean;
  annotations: string[];
  initialValue?: string;
}

export interface ClassConstructor {
  visibility: 'public' | 'private' | 'protected' | 'package';
  parameters: Array<{ name: string; type: string; annotations: string[] }>;
  body: string;
  annotations: string[];
}

export interface ClassMethod {
  name: string;
  returnType: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  isAbstract: boolean;
  parameters: Array<{ name: string; type: string; annotations: string[] }>;
  annotations: string[];
  throwsExceptions: string[];
}

export interface DetailedClassInfo {
  name: string;
  fullName: string;
  package: string;
  fields: ClassField[];
  constructors: ClassConstructor[];
  methods: ClassMethod[];
  dependencies: string[]; // imports e dependências
  superClass?: string;
  interfaces: string[];
  isInterface: boolean;
  isAbstract: boolean;
  annotations: string[];
}

export interface MockDependencyInfo {
  className: string;
  fields: ClassField[];
  constructors: ClassConstructor[];
  methods: ClassMethod[];
  dependencies: string[];
  mockSetup: string[];
  mockVerification: string[];
}

export class ClassAnalyzer {
  private static instance: ClassAnalyzer;
  private classCache = new Map<string, DetailedClassInfo>();

  static getInstance(): ClassAnalyzer {
    if (!ClassAnalyzer.instance) {
      ClassAnalyzer.instance = new ClassAnalyzer();
    }
    return ClassAnalyzer.instance;
  }

  /**
   * Analisa todas as classes das funções chamadas e extrai informações detalhadas
   */
  async analyzeCalledClasses(
    code: string, 
    calledFunctions: CalledFunction[]
  ): Promise<MockDependencyInfo[]> {
    const results: MockDependencyInfo[] = [];
    const uniqueClasses = this.getUniqueClasses(calledFunctions);

    for (const className of uniqueClasses) {
      try {
        const classInfo = await this.analyzeClass(code, className);
        if (classInfo) {
          const mockInfo = this.generateMockDependencyInfo(classInfo);
          results.push(mockInfo);
        }
      } catch (error) {
        console.warn(`Erro ao analisar classe ${className}:`, error);
      }
    }

    return results;
  }

  /**
   * Analisa uma classe específica e extrai todas as informações
   */
  async analyzeClass(code: string, className: string): Promise<DetailedClassInfo | null> {
    // Verificar cache primeiro
    const cacheKey = `${className}_${this.generateCodeHash(code)}`;
    if (this.classCache.has(cacheKey)) {
      return this.classCache.get(cacheKey)!;
    }

    try {
      // Encontrar a classe no código
      const classBody = this.extractClassBody(code, className);
      if (!classBody) {
        return null;
      }

      const classInfo: DetailedClassInfo = {
        name: className,
        fullName: this.extractFullClassName(code, className),
        package: this.extractPackage(code),
        fields: this.extractFields(classBody),
        constructors: this.extractConstructors(classBody),
        methods: this.extractMethods(classBody),
        dependencies: this.extractDependencies(code),
        superClass: this.extractSuperClass(classBody),
        interfaces: this.extractInterfaces(classBody),
        isInterface: this.isInterface(classBody),
        isAbstract: this.isAbstract(classBody),
        annotations: this.extractClassAnnotations(classBody)
      };

      // Salvar no cache
      this.classCache.set(cacheKey, classInfo);
      return classInfo;

    } catch (error) {
      console.error(`Erro ao analisar classe ${className}:`, error);
      return null;
    }
  }

  /**
   * Extrai o corpo da classe do código
   */
  private extractClassBody(code: string, className: string): string | null {
    const classPattern = new RegExp(
      `(?:^|\\n)\\s*((?:public|private|protected|static|final|abstract)\\s+)*\\s*(class|interface)\\s+${this.escapeRegex(className)}\\s*(?:extends\\s+([a-zA-Z_$][a-zA-Z0-9_$.<>]*))?\\s*(?:implements\\s+([a-zA-Z_$][a-zA-Z0-9_$.<>, ]*))?\\s*\\{([\\s\\S]*?)\\n\\s*\\}`,
      'gm'
    );

    const match = classPattern.exec(code);
    if (match) {
      return match[5] || '';
    }

    return null;
  }

  /**
   * Extrai campos da classe
   */
  private extractFields(classBody: string): ClassField[] {
    const fields: ClassField[] = [];
    
    // Padrão para campos de classe
    const fieldPattern = /(?:^|\n)\s*((?:public|private|protected|static|final|transient|volatile)\s+)*\s*([a-zA-Z_$][a-zA-Z0-9_$.<>[\]]+)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=\s*([^;]+))?\s*;/gm;
    
    let match;
    while ((match = fieldPattern.exec(classBody)) !== null) {
      const modifiers = match[1] || '';
      const type = match[2].trim();
      const name = match[3].trim();
      const initialValue = match[4]?.trim();

      fields.push({
        name,
        type,
        visibility: this.extractVisibility(modifiers),
        isStatic: modifiers.includes('static'),
        isFinal: modifiers.includes('final'),
        annotations: this.extractFieldAnnotations(classBody, name),
        initialValue
      });
    }

    return fields;
  }

  /**
   * Extrai construtores da classe
   */
  private extractConstructors(classBody: string): ClassConstructor[] {
    const constructors: ClassConstructor[] = [];
    
    // Padrão para construtores
    const constructorPattern = /(?:^|\n)\s*((?:public|private|protected)\s+)*\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\s*\}/gm;
    
    let match;
    while ((match = constructorPattern.exec(classBody)) !== null) {
      const modifiers = match[1] || '';
      const className = match[2].trim();
      const paramsString = match[3].trim();
      const body = match[4].trim();

      // Verificar se é realmente um construtor (nome igual ao da classe)
      if (className && this.isConstructorName(className)) {
        constructors.push({
          visibility: this.extractVisibility(modifiers),
          parameters: this.parseParameters(paramsString),
          body,
          annotations: this.extractMethodAnnotations(classBody, className)
        });
      }
    }

    return constructors;
  }

  /**
   * Extrai métodos da classe
   */
  private extractMethods(classBody: string): ClassMethod[] {
    const methods: ClassMethod[] = [];
    
    // Padrão para métodos
    const methodPattern = /(?:^|\n)\s*((?:public|private|protected|static|final|abstract|synchronized|native)\s+)*\s*([a-zA-Z_$][a-zA-Z0-9_$.<>[\]]+)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*(?:throws\s+([^{]+))?\s*\{([\s\S]*?)\n\s*\}/gm;
    
    let match;
    while ((match = methodPattern.exec(classBody)) !== null) {
      const modifiers = match[1] || '';
      const returnType = match[2].trim();
      const name = match[3].trim();
      const paramsString = match[4].trim();
      const throwsString = match[5]?.trim();
      const body = match[6].trim();

      // Verificar se não é um construtor
      if (!this.isConstructorName(name)) {
        methods.push({
          name,
          returnType,
          visibility: this.extractVisibility(modifiers),
          isStatic: modifiers.includes('static'),
          isAbstract: modifiers.includes('abstract'),
          parameters: this.parseParameters(paramsString),
          annotations: this.extractMethodAnnotations(classBody, name),
          throwsExceptions: throwsString ? throwsString.split(',').map(e => e.trim()) : []
        });
      }
    }

    return methods;
  }

  /**
   * Gera informações de dependência para mocks
   */
  private generateMockDependencyInfo(classInfo: DetailedClassInfo): MockDependencyInfo {
    const mockSetup: string[] = [];
    const mockVerification: string[] = [];

    // Setup básico do mock
    mockSetup.push(`@Mock`);
    mockSetup.push(`private ${classInfo.name} ${classInfo.name.toLowerCase()}Mock;`);
    mockSetup.push('');

    // Setup para campos que podem ser injetados
    const injectableFields = classInfo.fields.filter(f => 
      f.visibility === 'private' && !f.isFinal && !f.isStatic
    );

    if (injectableFields.length > 0) {
      mockSetup.push('// Campos injetáveis:');
      injectableFields.forEach(field => {
        mockSetup.push(`// ${field.name}: ${field.type}`);
        if (field.initialValue) {
          mockSetup.push(`// Valor inicial: ${field.initialValue}`);
        }
      });
      mockSetup.push('');
    }

    // Setup para construtores
    if (classInfo.constructors.length > 0) {
      mockSetup.push('// Construtores disponíveis:');
      classInfo.constructors.forEach(constructor => {
        const params = constructor.parameters.map(p => `${p.type} ${p.name}`).join(', ');
        mockSetup.push(`// ${constructor.visibility} ${classInfo.name}(${params})`);
      });
      mockSetup.push('');
    }

    // Setup para métodos públicos que podem ser mockados
    const publicMethods = classInfo.methods.filter(m => 
      m.visibility === 'public' && !m.isAbstract
    );

    if (publicMethods.length > 0) {
      mockSetup.push('// Métodos públicos para mock:');
      publicMethods.forEach(method => {
        const params = method.parameters.map(p => `${p.type} ${p.name}`).join(', ');
        mockSetup.push(`// ${method.returnType} ${method.name}(${params})`);
        
        // Gerar mock básico para o método
        const mockParams = method.parameters.length > 0 
          ? method.parameters.map(() => 'any()').join(', ')
          : '';
        mockSetup.push(`when(${classInfo.name.toLowerCase()}Mock.${method.name}(${mockParams})).thenReturn(mock${method.returnType}());`);
      });
    }

    // Verificações básicas
    mockVerification.push(`// Verificações básicas:`);
    mockVerification.push(`verify(${classInfo.name.toLowerCase()}Mock, times(1)).${publicMethods[0]?.name || 'someMethod'}();`);

    return {
      className: classInfo.name,
      fields: classInfo.fields,
      constructors: classInfo.constructors,
      methods: classInfo.methods,
      dependencies: classInfo.dependencies,
      mockSetup,
      mockVerification
    };
  }

  /**
   * Obtém classes únicas das funções chamadas
   */
  private getUniqueClasses(calledFunctions: CalledFunction[]): string[] {
    const uniqueClasses = new Set<string>();
    
    calledFunctions.forEach(func => {
      if (func.className) {
        uniqueClasses.add(func.className);
      }
    });

    return Array.from(uniqueClasses);
  }

  /**
   * Extrai visibilidade dos modificadores
   */
  private extractVisibility(modifiers: string): 'public' | 'private' | 'protected' | 'package' {
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('protected')) return 'protected';
    return 'package';
  }

  /**
   * Extrai anotações de campos
   */
  private extractFieldAnnotations(classBody: string, fieldName: string): string[] {
    const annotations: string[] = [];
    const fieldPattern = new RegExp(`@([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\n\\s*[^\\n]*\\b${this.escapeRegex(fieldName)}\\b`, 'g');
    
    let match;
    while ((match = fieldPattern.exec(classBody)) !== null) {
      annotations.push(match[1]);
    }

    return annotations;
  }

  /**
   * Extrai anotações de métodos
   */
  private extractMethodAnnotations(classBody: string, methodName: string): string[] {
    const annotations: string[] = [];
    const methodPattern = new RegExp(`@([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\n\\s*[^\\n]*\\b${this.escapeRegex(methodName)}\\s*\\(`, 'g');
    
    let match;
    while ((match = methodPattern.exec(classBody)) !== null) {
      annotations.push(match[1]);
    }

    return annotations;
  }

  /**
   * Extrai anotações da classe
   */
  private extractClassAnnotations(classBody: string): string[] {
    const annotations: string[] = [];
    const classPattern = /@([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\n\s*(?:public|private|protected|static|final|abstract)\s+(?:class|interface)/g;
    
    let match;
    while ((match = classPattern.exec(classBody)) !== null) {
      annotations.push(match[1]);
    }

    return annotations;
  }

  /**
   * Verifica se é um nome de construtor
   */
  private isConstructorName(name: string): boolean {
    // Construtores têm o mesmo nome da classe
    return Boolean(name && name.length > 0 && name[0] === name[0].toUpperCase());
  }

  /**
   * Parseia parâmetros de método/construtor
   */
  private parseParameters(paramsString: string): Array<{ name: string; type: string; annotations: string[] }> {
    if (!paramsString.trim()) return [];

    const params: Array<{ name: string; type: string; annotations: string[] }> = [];
    const paramParts = this.smartSplit(paramsString, ',');

    paramParts.forEach(param => {
      const trimmed = param.trim();
      if (trimmed) {
        // Padrão: [anotações] tipo nome
        const paramMatch = trimmed.match(/([a-zA-Z_$][a-zA-Z0-9_$.<>[\]]+)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (paramMatch) {
          params.push({
            type: paramMatch[1].trim(),
            name: paramMatch[2].trim(),
            annotations: [] // Anotações de parâmetros são mais complexas, implementar se necessário
          });
        }
      }
    });

    return params;
  }

  /**
   * Extrai package do código
   */
  private extractPackage(code: string): string {
    const packageMatch = code.match(/package\s+([a-zA-Z_$][a-zA-Z0-9_$.]*);/);
    return packageMatch ? packageMatch[1] : '';
  }

  /**
   * Extrai nome completo da classe
   */
  private extractFullClassName(code: string, className: string): string {
    const packageName = this.extractPackage(code);
    return packageName ? `${packageName}.${className}` : className;
  }

  /**
   * Extrai superclasse
   */
  private extractSuperClass(classBody: string): string | undefined {
    const extendsMatch = classBody.match(/extends\s+([a-zA-Z_$][a-zA-Z0-9_$.<>]*)/);
    return extendsMatch ? extendsMatch[1] : undefined;
  }

  /**
   * Extrai interfaces
   */
  private extractInterfaces(classBody: string): string[] {
    const implementsMatch = classBody.match(/implements\s+([a-zA-Z_$][a-zA-Z0-9_$.<>, ]*)/);
    if (implementsMatch) {
      return implementsMatch[1].split(',').map(i => i.trim());
    }
    return [];
  }

  /**
   * Verifica se é interface
   */
  private isInterface(classBody: string): boolean {
    return classBody.includes('interface') && !classBody.includes('class');
  }

  /**
   * Verifica se é abstrata
   */
  private isAbstract(classBody: string): boolean {
    return Boolean(classBody.includes('abstract'));
  }

  /**
   * Extrai dependências (imports)
   */
  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    const importPattern = /import\s+([a-zA-Z_$][a-zA-Z0-9_$.]*);/g;
    
    let match;
    while ((match = importPattern.exec(code)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  /**
   * Gera hash do código para cache
   */
  private generateCodeHash(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Escapa caracteres especiais para regex
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Split inteligente que respeita parênteses e chaves
   */
  private smartSplit(str: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let parenCount = 0;
    let braceCount = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (char === '(') parenCount++;
      else if (char === ')') parenCount--;
      else if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === delimiter && parenCount === 0 && braceCount === 0) {
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

  /**
   * Limpa o cache
   */
  clearCache(): void {
    this.classCache.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats(): { size: number } {
    return { size: this.classCache.size };
  }
} 