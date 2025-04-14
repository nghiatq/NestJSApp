package com.example.test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * This is a test class to verify that String and StringBuilder statements are properly separated.
 */
public class MixedStatementsTest {
    
    // Test with both String and StringBuilder in the same method
    public void testMixedStatements() {
        // String statement
        String sql1 = "SELECT * FROM users WHERE id = 1";
        
        // StringBuilder statement
        StringBuilder sql2 = new StringBuilder();
        sql2.append("SELECT * FROM products WHERE price > 100");
        
        // Another String statement
        String sql3 = "SELECT * FROM orders WHERE status = 'pending'";
        
        // Another StringBuilder statement
        StringBuilder sql4 = new StringBuilder();
        sql4.append("SELECT * FROM customers WHERE active = true");
        
        executeQuery(sql1);
        executeQuery(sql2.toString());
        executeQuery(sql3);
        executeQuery(sql4.toString());
    }
    
    private void executeQuery(String sql) {
        try {
            // Implementation would go here
            System.out.println("Executing: " + sql);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
