package src;

public class PremiumLimitStrategy implements LimitStrategy {
    public double calculateLimit(double income, double score) {
        return score * 0.75 + income * 0.1;
    }
}
