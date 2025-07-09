# Exemplo de Mocks Baseados em Classes Reais

## Método Analisado: CreditAnalyzer.analyzeClient

### Funções Chamadas Identificadas:

1. **ScoreCalculator.calculateScore()** - Chamada estática
2. **client.isBlocked()** - Chamada de instância (Client)
3. **FraudService.isFraudulent()** - Chamada estática
4. **LimitStrategyFactory.getStrategy()** - Chamada estática
5. **strategy.calculateLimit()** - Chamada de instância (LimitStrategy)

### Mocks Gerados Anteriormente (Básico):
```
when(calculateScore(...)).thenReturn(mockObject());
when(isBlocked(...)).thenReturn(mockObject());
when(isFraudulent(...)).thenReturn(mockObject());
when(getStrategy(...)).thenReturn(mockObject());
when(calculateLimit(...)).thenReturn(mockObject());
```

### Mocks Gerados Agora (Baseados em Classes):

#### Mocks Individuais:
```
1. when(ScoreCalculator.calculateScore(any(), any(), any())).thenReturn(mockDouble());
2. when(clientMock.isBlocked()).thenReturn(mockBoolean());
3. when(FraudService.isFraudulent(any())).thenReturn(mockBoolean());
4. when(LimitStrategyFactory.getStrategy(any())).thenReturn(mockLimitStrategy());
5. when(limitStrategyMock.calculateLimit(any(), any())).thenReturn(mockDouble());
```

#### Setup Completo de Mocks:
```
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

## Benefícios dos Novos Mocks:

1. **Tipos Específicos**: Os mocks agora retornam tipos apropriados (Boolean, Double, etc.) em vez de Object genérico
2. **Nomes de Classes Reais**: Usa os nomes reais das classes chamadas
3. **Distinção entre Estáticos e Instância**: Trata diferentemente chamadas estáticas e de instância
4. **Setup Organizado**: Agrupa mocks por classe e gera declarações @Mock apropriadas
5. **Parâmetros Inteligentes**: Usa `any()` para parâmetros quando necessário

## Mapeamento de Tipos Comuns:

- String → mockString()
- Integer → mockInteger()
- Boolean → mockBoolean()
- Double → mockDouble()
- List → mockList()
- Map → mockMap()
- Classes customizadas → mock[NomeDaClasse]() 