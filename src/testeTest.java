package src;

public class testeTest {

    // Função criada
    public int soma(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        testeTest teste = new testeTest();
        
        // Teste da função soma
        int resultado = teste.soma(5, 3);
        
        // Verifica se o resultado é igual a 8
        if (resultado == 8) {
            System.out.println("Teste passou: 5 + 3 = " + resultado);
        } else {
            System.out.println("Teste falhou: esperado 8, mas obteve " + resultado);
        }
    }

}
