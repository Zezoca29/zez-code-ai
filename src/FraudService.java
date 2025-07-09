package src;

public class FraudService {
    public static boolean isFraudulent(String clientId) {
        // Simulação de uma regra arbitrária
        return clientId.endsWith("999");
    }
}
