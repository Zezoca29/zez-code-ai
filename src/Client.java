package src;

public class Client {
    private String id;
    private String name;
    private boolean blocked;
    private ClientType type;

    public Client(String id, String name, boolean blocked, ClientType type) {
        this.id = id;
        this.name = name;
        this.blocked = blocked;
        this.type = type;
    }

    public String getId() {
        return id;
    }

    public boolean isBlocked() {
        return blocked;
    }

    public ClientType getType() {
        return type;
    }

    // outros getters/setters omitidos
}
