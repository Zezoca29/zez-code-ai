package src;

import java.util.List;
import java.util.concurrent.TimeoutException;

public class ExternalOrderApi {
    
    public List<Order> fetchPendingOrders() throws TimeoutException {
        // Simulação de chamada para API externa
        // Em uma implementação real, isso faria uma chamada HTTP
        return List.of(
            new Order("ORD001", "CUST001", OrderStatus.PENDING),
            new Order("ORD002", "CUST002", OrderStatus.PENDING),
            new Order("ORD003", "CUST003", OrderStatus.PENDING)
        );
    }
    
    public Order getOrderById(String orderId) throws TimeoutException {
        // Simulação de busca de pedido por ID
        if (orderId == null || orderId.isEmpty()) {
            throw new IllegalArgumentException("Order ID cannot be null or empty");
        }
        return new Order(orderId, "CUST" + orderId.substring(3), OrderStatus.PENDING);
    }
    
    public void updateOrderStatus(String orderId, OrderStatus status) throws TimeoutException {
        // Simulação de atualização de status
        if (orderId == null || orderId.isEmpty()) {
            throw new IllegalArgumentException("Order ID cannot be null or empty");
        }
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
    }
} 