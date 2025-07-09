# Comparação: Mocks Antigos vs Novos

## Cenário de Teste
Analisando o método `CreditAnalyzer.analyzeClient()` que chama várias funções de diferentes classes.

## Mocks Antigos (Básicos)

### Problemas Identificados:
- ❌ Todos os mocks retornavam `mockObject()` genérico
- ❌ Não distinguiam entre chamadas estáticas e de instância
- ❌ Não usavam nomes de classes reais
- ❌ Não geravam setup organizado
- ❌ Parâmetros sempre eram `...` genérico

### Exemplo de Saída Anterior:
```
🎭 MOCKS SUGERIDOS:
   1. when(calculateScore(...)).thenReturn(mockObject());
   2. when(isBlocked(...)).thenReturn(mockObject());
   3. when(isFraudulent(...)).thenReturn(mockObject());
   4. when(getStrategy(...)).thenReturn(mockObject());
   5. when(calculateLimit(...)).thenReturn(mockObject());
```

## Mocks Novos (Baseados em Classes Reais)

### Melhorias Implementadas:
- ✅ Mocks com tipos específicos apropriados
- ✅ Distinção entre chamadas estáticas e de instância
- ✅ Uso de nomes de classes reais
- ✅ Setup organizado com declarações @Mock
- ✅ Parâmetros inteligentes com `any()`

### Exemplo de Saída Nova:
```
🎭 MOCKS SUGERIDOS:
   Mocks individuais:
   1. when(ScoreCalculator.calculateScore(any(), any(), any())).thenReturn(mockDouble());
   2. when(clientMock.isBlocked()).thenReturn(mockBoolean());
   3. when(FraudService.isFraudulent(any())).thenReturn(mockBoolean());
   4. when(LimitStrategyFactory.getStrategy(any())).thenReturn(mockLimitStrategy());
   5. when(limitStrategyMock.calculateLimit(any(), any())).thenReturn(mockDouble());

   Setup completo de mocks:
   @Mock
   private Client clientMock;

   @Mock
   private LimitStrategy limitStrategyMock;

   when(ScoreCalculator.calculateScore(any(), any(), any())).thenReturn(mockDouble());
   when(clientMock.isBlocked()).thenReturn(mockBoolean());
   when(FraudService.isFraudulent(any())).thenReturn(mockBoolean());
   when(LimitStrategyFactory.getStrategy(any())).thenReturn(mockLimitStrategy());
   when(limitStrategyMock.calculateLimit(any(), any())).thenReturn(mockDouble());
```

## Mapeamento de Tipos Inteligente

### Tipos Comuns Mapeados:
- `String` → `mockString()`
- `Integer` → `mockInteger()`
- `Long` → `mockLong()`
- `Double` → `mockDouble()`
- `Float` → `mockFloat()`
- `Boolean` → `mockBoolean()`
- `List` → `mockList()`
- `Map` → `mockMap()`
- `Set` → `mockSet()`
- `Optional` → `mockOptional()`
- `BigDecimal` → `mockBigDecimal()`
- `Date` → `mockDate()`
- `LocalDate` → `mockLocalDate()`
- `LocalDateTime` → `mockLocalDateTime()`
- `UUID` → `mockUUID()`
- Classes customizadas → `mock[NomeDaClasse]()`

## Benefícios Práticos

### 1. Tipagem Mais Precisa
```java
// Antes: Genérico
when(calculateScore(...)).thenReturn(mockObject());

// Agora: Específico
when(ScoreCalculator.calculateScore(any(), any(), any())).thenReturn(mockDouble());
```

### 2. Setup Organizado
```java
// Antes: Sem organização
when(isBlocked(...)).thenReturn(mockObject());
when(calculateLimit(...)).thenReturn(mockObject());

// Agora: Agrupado por classe
@Mock
private Client clientMock;

@Mock
private LimitStrategy limitStrategyMock;

when(clientMock.isBlocked()).thenReturn(mockBoolean());
when(limitStrategyMock.calculateLimit(any(), any())).thenReturn(mockDouble());
```

### 3. Distinção de Chamadas
```java
// Chamadas estáticas
when(ScoreCalculator.calculateScore(any(), any(), any())).thenReturn(mockDouble());

// Chamadas de instância
when(clientMock.isBlocked()).thenReturn(mockBoolean());
```

### 4. Parâmetros Inteligentes
```java
// Antes: Genérico
when(method(...)).thenReturn(mockObject());

// Agora: Específico
when(method(any(), any(), any())).thenReturn(mockSpecificType());
```

## Resultado Final

Os novos mocks são muito mais úteis para desenvolvedores porque:
- Fornecem código de teste mais preciso e pronto para uso
- Reduzem a necessidade de ajustes manuais
- Seguem as melhores práticas de mocking
- Facilitam a criação de testes unitários eficazes 