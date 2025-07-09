package src;

import java.util.ArrayList;
import java.util.List;

public class Order {
    
    private String id;
    private String customerId;
    private OrderStatus status;
    private List<OrderItem> items;
    private double total;
    
    public Order(String id, String customerId, OrderStatus status) {
        this.id = id;
        this.customerId = customerId;
        this.status = status;
        this.items = new ArrayList<>();
        this.total = 0.0;
    }
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getCustomerId() {
        return customerId;
    }
    
    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }
    
    public OrderStatus getStatus() {
        return status;
    }
    
    public void setStatus(OrderStatus status) {
        this.status = status;
    }
    
    public List<OrderItem> getItems() {
        return items;
    }
    
    public void setItems(List<OrderItem> items) {
        this.items = items;
        calculateTotal();
    }
    
    public double getTotal() {
        return total;
    }
    
    public void setTotal(double total) {
        this.total = total;
    }
    
    public void addItem(OrderItem item) {
        if (item != null) {
            items.add(item);
            calculateTotal();
        }
    }
    
    public void removeItem(OrderItem item) {
        if (items.remove(item)) {
            calculateTotal();
        }
    }
    
    private void calculateTotal() {
        this.total = items.stream()
                .mapToDouble(item -> item.getPrice() * item.getQuantity())
                .sum();
    }
    
    @Override
    public String toString() {
        return "Order{" +
                "id='" + id + '\'' +
                ", customerId='" + customerId + '\'' +
                ", status=" + status +
                ", total=" + total +
                ", items=" + items.size() +
                '}';
    }
} 