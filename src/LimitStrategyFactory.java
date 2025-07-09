package src;

public class LimitStrategyFactory {
    public static LimitStrategy getStrategy(ClientType type) {
        switch (type) {
            case VIP:
                return new VipLimitStrategy();
            case PREMIUM:
                return new PremiumLimitStrategy();
            default:
                return new StandardLimitStrategy();
        }
    }
}

