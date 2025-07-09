# Geração Automática de Testes Unitários

## Funcionalidade Implementada

A extensão agora inclui geração automática de testes unitários no padrão **AAA (Arrange, Act, Assert)** após a análise de um método Java.

## Como Funciona

### 1. Análise do Método
- Execute o comando `extension.analyzeJavaFunction`
- Selecione o nome da classe e método
- Escolha o nível de detalhamento (1-4)

### 2. Geração de Cenários
- A extensão analisa o método e gera cenários de teste
- Filtra os cenários baseado no nível selecionado
- Categoriza em: Caminho Feliz, Casos Extremos, Casos de Erro, Valores Limite

### 3. Criação do Arquivo de Testes
- **Condição**: A pasta `src/test/` deve existir no workspace
- **Arquivo gerado**: `{ClassName}Test.java`
- **Padrão**: AAA (Arrange, Act, Assert)
- **Framework**: JUnit 5 + Mockito

## Estrutura do Teste Gerado

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import static org.mockito.Mockito.*;

public class CalculatorTest {

    @BeforeEach
    public void setUp() {
        // Setup code here
    }

    /**
     * Testa add com entradas válidas
     * Categoria: Caminho Feliz
     */
    @Test
    public void testAddWithValidInputs() {
        // Arrange
        int a = 1;
        int b = 2;

        // Act
        int result = add(a, b);

        // Assert
        assertEquals(3, result);
    }
}
```

## Níveis de Detalhamento

### Nível 1 - Básico
- Apenas cenários de caminho feliz (máximo 3)

### Nível 2 - Intermediário
- Caminho feliz + casos extremos básicos (máximo 8)

### Nível 3 - Avançado
- Todos os cenários exceto casos de erro complexos

### Nível 4 - Completo
- Todos os cenários gerados

## Características dos Testes

### Arrange (Preparação)
- Setup de mocks quando necessário
- Declaração de variáveis de entrada
- Preparação de dados de teste

### Act (Execução)
- Chamada do método sob teste
- Captura do resultado

### Assert (Verificação)
- Verificações de resultado esperado
- Validações de comportamento
- Tratamento de exceções

## Dependências Incluídas

Os testes gerados incluem automaticamente:
- JUnit 5 (Jupiter)
- Mockito para mocks
- Assertions estáticas
- Imports necessários

## Exemplo de Uso

1. Abra um arquivo Java com métodos
2. Execute `Ctrl+Shift+P` → "Analyze Java Function"
3. Digite o nome da classe (ex: "Calculator")
4. Digite o nome do método (ex: "add")
5. Escolha o nível (1-4)
6. Aguarde a análise e geração do arquivo de testes

## Saída

A extensão mostrará:
- Análise completa do método
- Cenários de teste gerados
- Informações sobre o arquivo de testes criado
- Localização do arquivo: `src/test/{ClassName}Test.java`

## Limitações

- A pasta `src/test/` deve existir previamente
- Se a pasta não existir, o arquivo não será criado (sem erro)
- Os testes são gerados em Java puro (sem framework específico de projeto)
- Requer configuração manual de dependências no projeto

## Benefícios

- **Produtividade**: Geração automática de testes
- **Padrão**: Segue o padrão AAA universalmente aceito
- **Cobertura**: Múltiplos cenários baseados na análise do código
- **Manutenibilidade**: Código de teste bem estruturado e documentado 