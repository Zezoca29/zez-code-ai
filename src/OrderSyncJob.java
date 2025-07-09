package src;

import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.TimeoutException;
import java.util.logging.Logger;

public class OrderSyncJob implements Runnable {

    private ExternalOrderApi api;
    private Database db;
    private Cache cache;
    private Logger logger;

    public OrderSyncJob(ExternalOrderApi api, Database db, Cache cache, Logger logger) {
        this.api = api;
        this.db = db;
        this.cache = cache;
        this.logger = logger;
    }

    public void run() {
        List<Order> orders;
        try {
            orders = api.fetchPendingOrders();
        } catch (TimeoutException e) {
            logger.severe("Timeout while fetching orders: " + e.getMessage());
            return;
        }

        for (Order order : orders) {
            if (cache.contains(order.getId())) {
                continue; // já processado
            }

            try {
                db.saveOrder(order);
                cache.put(order.getId(), true);
            } catch (SQLException e) {
                logger.severe("Failed to save order: " + e.getMessage());
            }
        }
    }

    public void processOrder(Order order) {
        if (order == null) {
            logger.warning("Attempted to process null order");
            return;
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            logger.info("Skipping cancelled order: " + order.getId());
            return;
        }

        try {
            if (order.getTotal() > 10000) {
                // Requer aprovação manual para pedidos grandes
                order.setStatus(OrderStatus.PENDING_APPROVAL);
                logger.info("Order " + order.getId() + " requires manual approval");
            } else {
                order.setStatus(OrderStatus.PROCESSING);
                db.saveOrder(order);
                cache.put(order.getId(), true);
                logger.info("Order " + order.getId() + " processed successfully");
            }
        } catch (SQLException e) {
            logger.severe("Failed to save order: " + order.getId() + " - " + e.getMessage());
            order.setStatus(OrderStatus.ERROR);
        }
    }

    public void validateOrder(Order order) throws InvalidOrderException {
        if (order.getCustomerId() == null || order.getCustomerId().isEmpty()) {
            throw new InvalidOrderException("Customer ID is required");
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new InvalidOrderException("Order must have at least one item");
        }

        for (OrderItem item : order.getItems()) {
            if (item.getQuantity() <= 0) {
                throw new InvalidOrderException("Item quantity must be greater than 0");
            }
            if (item.getPrice() < 0) {
                throw new InvalidOrderException("Item price cannot be negative");
            }
        }
    }
} 