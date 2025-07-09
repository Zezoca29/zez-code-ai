# Nova Funcionalidade: Análise Avançada de Classes para Mocks

## Visão Geral

Esta nova funcionalidade permite que o analisador Java entre em todas as classes das funções chamadas e extraia informações detalhadas para gerar mocks mais específicos e precisos.

## Funcionalidades Principais

### 1. Análise Detalhada de Classes
- **Campos**: Extrai todos os campos da classe com visibilidade, tipo, modificadores e valores iniciais
- **Construtores**: Identifica todos os construtores disponíveis com parâmetros e anotações
- **Métodos**: Analisa todos os métodos públicos, privados e protegidos
- **Dependências**: Lista todos os imports e dependências da classe
- **Anotações**: Captura anotações em campos, métodos e construtores

### 2. Geração de Mocks Inteligente
- **Mocks Específicos**: Gera mocks baseados no tipo de retorno real dos métodos
- **Setup Completo**: Cria setup de mocks com todas as dependências necessárias
- **Verificações**: Sugere verificações específicas para cada método mockado
- **Imports Automáticos**: Adiciona todos os imports necessários para Mockito

### 3. Cache Inteligente
- **Cache de Classes**: Armazena análises de classes para melhor performance
- **Hash de Código**: Identifica mudanças no código para invalidar cache
- **Estatísticas**: Fornece informações sobre o uso do cache

## Arquivos Criados/Modificados

### Novos Arquivos
- `src/analyzer/classAnalyzer.ts` - Analisador principal de classes
- `CLASS_ANALYSIS_FEATURE.md` - Esta documentação

### Arquivos Modificados
- `src/analyzer/mockGenerator.ts` - Adicionadas funções para mocks avançados
- `src/extension.ts` - Integração da nova funcionalidade

## Interfaces Principais

### ClassField
```typescript
interface ClassField {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  isFinal: boolean;
  annotations: string[];
  initialValue?: string;
}
```

### ClassMethod
```typescript
interface ClassMethod {
  name: string;
  returnType: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  isAbstract: boolean;
  parameters: Array<{ name: string; type: string; annotations: string[] }>;
  annotations: string[];
  throwsExceptions: string[];
}
```

### MockDependencyInfo
```typescript
interface MockDependencyInfo {
  className: string;
  fields: ClassField[];
  constructors: ClassConstructor[];
  methods: ClassMethod[];
  dependencies: string[];
  mockSetup: string[];
  mockVerification: string[];
}
```

## Como Funciona

### 1. Análise de Classes
```typescript
const classAnalyzer = ClassAnalyzer.getInstance();
const classAnalysis = await classAnalyzer.analyzeCalledClasses(code, calledFunctions);
```

### 2. Geração de Mocks Avançados
```typescript
const advancedMockResult = await generateAdvancedMocks(code, calledFunctions);
```

### 3. Setup Completo
```typescript
const completeSetup = await generateCompleteMockSetup(code, calledFunctions);
```

## Exemplo de Saída

### Análise de Classe
```
📦 CLASSE 1: CreditAnalyzer
📋 Campos (3):
   1. private FraudService fraudService
   2. private ScoreCalculator scoreCalculator
   3. private LimitStrategyFactory limitStrategyFactory

🔨 Construtores (1):
   1. public CreditAnalyzer(FraudService fraudService, ScoreCalculator scoreCalculator)

⚙️ Métodos (5):
   1. public LoanResult analyzeCredit(Client client, Transaction transaction)
   2. private boolean validateTransaction(Transaction transaction)
   3. public void setLimitStrategy(LimitStrategy strategy)
```

### Mocks Gerados
```
// Setup avançado com análise de classes:
// === ANÁLISE DA CLASSE: FraudService ===
// Campos da classe:
//   private String serviceUrl
//   private int timeout = 5000

// Métodos da classe:
//   public boolean checkFraud(Transaction transaction) throws FraudException
//   public FraudReport generateReport(Client client)

// Setup de mocks específicos:
@Mock
private FraudService fraudServiceMock;

when(fraudServiceMock.checkFraud(any(Transaction.class))).thenReturn(true);
when(fraudServiceMock.generateReport(any(Client.class))).thenReturn(mockFraudReport());
```

## Benefícios

1. **Mocks Mais Precisos**: Baseados na estrutura real das classes
2. **Setup Completo**: Inclui todas as dependências necessárias
3. **Performance Otimizada**: Cache inteligente para análises repetidas
4. **Documentação Automática**: Gera documentação detalhada das classes
5. **Manutenibilidade**: Mocks se adaptam automaticamente a mudanças nas classes

## Comandos Disponíveis

- `extension.analyzeJavaFunction` - Análise principal com nova funcionalidade
- `extension.clearParserCache` - Limpa cache do parser (inclui cache de classes)

## Configurações

A funcionalidade é ativada automaticamente e não requer configuração adicional. O cache é gerenciado automaticamente para otimizar performance.

## Limitações Atuais

1. Análise limitada a classes definidas no mesmo arquivo
2. Não analisa classes de bibliotecas externas
3. Análise de anotações de parâmetros ainda em desenvolvimento

## Próximas Melhorias

1. Análise de classes em arquivos separados
2. Suporte a análise de bibliotecas externas
3. Análise de herança e interfaces
4. Geração de mocks para exceções específicas
5. Integração com frameworks de injeção de dependência 