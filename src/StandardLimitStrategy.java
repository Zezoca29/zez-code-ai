package src;

public class StandardLimitStrategy implements LimitStrategy {
    public double calculateLimit(double income, double score) {
        return score * 0.5;
    }
}
