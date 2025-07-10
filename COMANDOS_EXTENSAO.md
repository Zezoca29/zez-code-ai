# Comandos da Extensão Zez Code AI

## Visão Geral

A extensão Zez Code AI oferece 5 comandos principais para análise e geração de testes unitários em Java. Todos os comandos podem ser acessados através do Command Palette do VSCode (Ctrl+Shift+P).

## Comandos Disponíveis

### 1. `extension.analyzeJavaFunction` - Analisar Função Java (Zez Code AI)

**Descrição:** Comando principal que realiza análise completa de uma função Java e gera testes unitários.

**Funcionalidades:**
- ✅ Análise detalhada do método (parâmetros, retorno, complexidade)
- ✅ Geração de cenários de teste baseados no nível selecionado
- ✅ Criação de mocks avançados com análise de classes
- ✅ Análise de ramos de decisão e complexidade ciclomática
- ✅ Validação automática dos testes gerados
- ✅ Integração com LLM para completação de testes
- ✅ Geração de arquivo de teste (.java)
- ✅ Relatório detalhado no Output Channel

**Como usar:**
1. Abra um arquivo Java no VSCode
2. Pressione `Ctrl+Shift+P` e digite "Analisar Função Java"
3. Informe o nome da classe e método
4. Selecione o nível de teste (1-3)
5. Aguarde a análise completa

**Níveis de Teste:**
- **Nível 1:** Testes básicos (caminho feliz)
- **Nível 2:** Testes intermediários (caminho feliz + casos extremos)
- **Nível 3:** Testes avançados (todos os cenários)

---

### 2. `extension.completeTestWithLLM` - Completar Teste com LLM (Zez Code AI)

**Descrição:** Comando específico para completar testes unitários usando Inteligência Artificial.

**Funcionalidades:**
- ✅ Gera teste parcial automaticamente
- ✅ Envia para LLM configurado (OpenAI, Anthropic, etc.)
- ✅ Recebe teste completado e melhorado
- ✅ Valida qualidade antes e depois
- ✅ Relatório de melhorias aplicadas
- ✅ Configuração flexível de provedores LLM

**Como usar:**
1. Abra um arquivo Java no VSCode
2. Pressione `Ctrl+Shift+P` e digite "Completar Teste com LLM"
3. Informe o nome da classe e método
4. Selecione o nível de teste
5. Aguarde o processamento do LLM

**Configuração LLM:**
- Suporte a OpenAI (GPT-4, GPT-3.5)
- Suporte a Anthropic (Claude)
- Suporte a modelos locais
- Configuração de API keys via settings

---

### 3. `extension.showLLMPrompt` - Mostrar Prompt LLM (Zez Code AI)

**Descrição:** **NOVO COMANDO** - Exibe apenas o prompt que seria enviado para a IA, sem executar a completação.

**Funcionalidades:**
- ✅ Gera o prompt completo que seria enviado para o LLM
- ✅ Exibe em nova aba do VSCode
- ✅ Formato Markdown para melhor visualização
- ✅ Inclui contexto completo do método
- ✅ Mostra código parcial gerado
- ✅ Não consome tokens da API

**Como usar:**
1. Abra um arquivo Java no VSCode
2. Pressione `Ctrl+Shift+P` e digite "Mostrar Prompt LLM"
3. Informe o nome da classe e método
4. Selecione o nível de teste
5. O prompt será exibido em nova aba

**Casos de uso:**
- Revisar o que será enviado para a IA
- Ajustar configurações antes de usar tokens
- Entender o contexto extraído
- Debug de problemas de geração

---

### 4. `extension.clearParserCache` - Limpar Cache do Parser (Zez Code AI)

**Descrição:** Comando utilitário para limpar o cache interno do parser Java.

**Funcionalidades:**
- ✅ Limpa cache de análise de classes
- ✅ Reseta estatísticas de cache
- ✅ Força nova análise na próxima execução
- ✅ Útil para resolver problemas de parsing

**Como usar:**
1. Pressione `Ctrl+Shift+P` e digite "Limpar Cache do Parser"
2. Confirme a operação
3. Cache será limpo e estatísticas exibidas

---

### 5. `zez-code-ai.helloWorld` - Hello World

**Descrição:** Comando de exemplo/demonstração da extensão.

**Funcionalidades:**
- ✅ Comando básico de teste
- ✅ Verifica se a extensão está funcionando

---

## Como Acessar os Comandos

### Método 1: Command Palette
1. Pressione `Ctrl+Shift+P` (Windows/Linux) ou `Cmd+Shift+P` (Mac)
2. Digite o nome do comando ou "Zez Code AI"
3. Selecione o comando desejado

### Método 2: Atalhos de Teclado
- Não configurados por padrão, mas podem ser adicionados em `keybindings.json`

### Método 3: Menu de Contexto
- Clique direito em arquivos Java
- Procure por opções "Zez Code AI"

## Configurações

### Configuração LLM
```json
{
  "zezCodeAi.llm.provider": "openai",
  "zezCodeAi.llm.apiKey": "sua-api-key",
  "zezCodeAi.llm.model": "gpt-4",
  "zezCodeAi.llm.maxTokens": 4000,
  "zezCodeAi.llm.temperature": 0.3
}
```

### Configuração de Testes
```json
{
  "zezCodeAi.test.outputPath": "test/",
  "zezCodeAi.test.package": "com.example.tests",
  "zezCodeAi.test.framework": "junit5"
}
```

## Fluxo de Trabalho Recomendado

### Para Desenvolvedores Iniciantes:
1. Use `extension.analyzeJavaFunction` com nível 1
2. Revise os testes gerados
3. Use `extension.showLLMPrompt` para entender o contexto
4. Gradualmente aumente para níveis 2 e 3

### Para Desenvolvedores Experientes:
1. Use `extension.analyzeJavaFunction` com nível 3
2. Use `extension.completeTestWithLLM` para melhorias
3. Revise e ajuste conforme necessário
4. Use `extension.showLLMPrompt` para debug

### Para Debug e Troubleshooting:
1. Use `extension.showLLMPrompt` para verificar contexto
2. Use `extension.clearParserCache` se houver problemas
3. Verifique configurações LLM
4. Revise logs no Output Channel

## Output Channels

A extensão utiliza os seguintes Output Channels:
- **Java Function Analyzer:** Resultados da análise principal
- **LLM Test Completion:** Resultados da completação com LLM

## Troubleshooting

### Problemas Comuns:
1. **Método não encontrado:** Verifique nome da classe e método
2. **Erro de API LLM:** Verifique configuração e API key
3. **Cache desatualizado:** Use `extension.clearParserCache`
4. **Testes com problemas:** Use validação automática para identificar

### Logs e Debug:
- Todos os comandos geram logs detalhados
- Use Output Channels para ver informações completas
- Console do VSCode mostra erros técnicos

## Evolução dos Comandos

### Versão Atual (v0.0.1):
- ✅ Análise básica de funções
- ✅ Geração de testes unitários
- ✅ Integração com LLM
- ✅ Validação automática
- ✅ Comando para mostrar prompt

### Próximas Versões:
- 🔄 Comando para análise de múltiplos métodos
- 🔄 Comando para comparação de testes
- 🔄 Comando para refatoração automática
- 🔄 Comando para análise de cobertura
- 🔄 Comando para geração de documentação 