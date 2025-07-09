package src;

public class LoanResult {
    private boolean approved;
    private String message;
    private double limit;

    public LoanResult(boolean approved, String message) {
        this(approved, message, 0.0);
    }

    public LoanResult(boolean approved, String message, double limit) {
        this.approved = approved;
        this.message = message;
        this.limit = limit;
    }

    public boolean isApproved() {
        return approved;
    }

    public String getMessage() {
        return message;
    }

    public double getLimit() {
        return limit;
    }

    @Override
    public String toString() {
        return "LoanResult{" +
                "approved=" + approved +
                ", message='" + message + '\'' +
                ", limit=" + limit +
                '}';
    }
}
