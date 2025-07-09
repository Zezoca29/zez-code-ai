package src;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

public class Database {
    
    private Map<String, Order> orderStorage = new HashMap<>();
    
    public void saveOrder(Order order) throws SQLException {
        if (order == null) {
            throw new SQLException("Cannot save null order");
        }
        
        if (order.getId() == null || order.getId().isEmpty()) {
            throw new SQLException("Order ID cannot be null or empty");
        }
        
        // Simulação de salvamento no banco de dados
        orderStorage.put(order.getId(), order);
    }
    
    public Order getOrderById(String orderId) throws SQLException {
        if (orderId == null || orderId.isEmpty()) {
            throw new SQLException("Order ID cannot be null or empty");
        }
        
        Order order = orderStorage.get(orderId);
        if (order == null) {
            throw new SQLException("Order not found: " + orderId);
        }
        
        return order;
    }
    
    public void updateOrderStatus(String orderId, OrderStatus status) throws SQLException {
        if (orderId == null || orderId.isEmpty()) {
            throw new SQLException("Order ID cannot be null or empty");
        }
        
        if (status == null) {
            throw new SQLException("Status cannot be null");
        }
        
        Order order = orderStorage.get(orderId);
        if (order == null) {
            throw new SQLException("Order not found: " + orderId);
        }
        
        order.setStatus(status);
        orderStorage.put(orderId, order);
    }
    
    public void deleteOrder(String orderId) throws SQLException {
        if (orderId == null || orderId.isEmpty()) {
            throw new SQLException("Order ID cannot be null or empty");
        }
        
        if (!orderStorage.containsKey(orderId)) {
            throw new SQLException("Order not found: " + orderId);
        }
        
        orderStorage.remove(orderId);
    }
} 