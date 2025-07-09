package src;

import java.time.LocalDate;
import java.util.List;

public class CreditAnalyzer {

    public LoanResult analyzeClient(Client client, List<Transaction> transactions, LocalDate analysisDate) {
        if (client == null || transactions == null || analysisDate == null) {
            throw new IllegalArgumentException("Invalid input");
        }

        double income = calculateIncome(transactions, analysisDate);
        double expenses = calculateExpenses(transactions, analysisDate);
        double score = ScoreCalculator.calculateScore(client, income, expenses);

        if (score < 300) {
            return new LoanResult(false, "Score too low");
        }

        if (client.isBlocked() || FraudService.isFraudulent(client.getId())) {
            return new LoanResult(false, "Client is blocked or fraudulent");
        }

        double limit = LimitStrategyFactory.getStrategy(client.getType()).calculateLimit(income, score);

        return new LoanResult(true, "Approved", limit);
    }

    private double calculateIncome(List<Transaction> transactions, LocalDate date) {
        return transactions.stream()
            .filter(t -> t.getType() == TransactionType.CREDIT && t.getDate().isAfter(date.minusMonths(3)))
            .mapToDouble(Transaction::getAmount)
            .sum();
    }

    private double calculateExpenses(List<Transaction> transactions, LocalDate date) {
        return transactions.stream()
            .filter(t -> t.getType() == TransactionType.DEBIT && t.getDate().isAfter(date.minusMonths(3)))
            .mapToDouble(Transaction::getAmount)
            .sum();
    }
}
