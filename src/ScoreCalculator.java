package src;

public class ScoreCalculator {
    public static double calculateScore(Client client, double income, double expenses) {
        double baseScore = income - expenses;
        switch (client.getType()) {
            case VIP:
                baseScore *= 1.2;
                break;
            case PREMIUM:
                baseScore *= 1.1;
                break;
            default:
                break;
        }
        return Math.max(0, baseScore);
    }
}
