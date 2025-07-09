package src;

import java.util.HashMap;
import java.util.Map;

public class Cache {
    
    private Map<String, Object> cacheStorage = new HashMap<>();
    
    public void put(String key, Object value) {
        if (key == null) {
            throw new IllegalArgumentException("Cache key cannot be null");
        }
        cacheStorage.put(key, value);
    }
    
    public boolean contains(String key) {
        if (key == null) {
            return false;
        }
        return cacheStorage.containsKey(key);
    }
    
    public Object get(String key) {
        if (key == null) {
            return null;
        }
        return cacheStorage.get(key);
    }
    
    public void remove(String key) {
        if (key != null) {
            cacheStorage.remove(key);
        }
    }
    
    public void clear() {
        cacheStorage.clear();
    }
    
    public int size() {
        return cacheStorage.size();
    }
    
    public boolean isEmpty() {
        return cacheStorage.isEmpty();
    }
} 