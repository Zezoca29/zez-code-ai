package src;

public class VipLimitStrategy implements LimitStrategy {
    public double calculateLimit(double income, double score) {
        return score + income * 0.2;
    }
}
