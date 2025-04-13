package com.example.test;

import java.util.Scanner;

/**
 * This is a test class to verify that SQL in System.out and System.in is ignored.
 */
public class SystemTest {
    
    public void testSystemOut() {
        // These should be ignored
        System.out.println("SELECT * FROM users WHERE id = 1");
        System.out.print("INSERT INTO users VALUES (1, 'test')");
        System.out.format("UPDATE users SET active = %b WHERE id = %d", true, 5);
        
        // This should be detected
        String validSql = "SELECT * FROM users WHERE username = 'test'";
        
        // This should be ignored
        System.err.println("DELETE FROM users WHERE id = 2");
        
        // This should be detected
        executeQuery("SELECT COUNT(*) FROM orders");
    }
    
    public void testSystemIn() {
        Scanner scanner = new Scanner(System.in);
        
        // This should be ignored
        System.out.println("Enter SQL: ");
        String userSql = scanner.nextLine(); // Could be "SELECT * FROM users"
        
        // This should be detected
        String validSql = "SELECT * FROM products WHERE price > 100";
        
        // This should be ignored
        System.out.println("You entered: " + userSql);
    }
    
    private void executeQuery(String sql) {
        // Implementation
        System.out.println("Executing: " + sql); // This line should be ignored
    }
}
