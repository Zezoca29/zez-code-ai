package src;

import java.time.LocalDate;

public class Transaction {
    private TransactionType type;
    private double amount;
    private LocalDate date;

    public Transaction(TransactionType type, double amount, LocalDate date) {
        this.type = type;
        this.amount = amount;
        this.date = date;
    }

    public TransactionType getType() {
        return type;
    }

    public double getAmount() {
        return amount;
    }

    public LocalDate getDate() {
        return date;
    }
}
