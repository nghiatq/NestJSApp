package com.example.test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * This is a test class to verify that StringBuilder operations are properly detected.
 */
public class StringBuilderTest {
    
    // Test simple StringBuilder
    public void testSimpleStringBuilder() {
        // Simple StringBuilder
        StringBuilder sql1 = new StringBuilder();
        sql1.append("SELECT * FROM users WHERE id = 1");
        
        executeQuery(sql1.toString());
    }
    
    // Test multi-line StringBuilder
    public void testMultiLineStringBuilder() {
        // Multi-line StringBuilder
        StringBuilder sql2 = new StringBuilder();
        sql2.append("SELECT o.id, o.customer_id, ");
        sql2.append("o.order_date, o.total ");
        sql2.append("FROM orders o ");
        sql2.append("WHERE o.status = 'completed'");
        
        executeQuery(sql2.toString());
    }
    
    // Test StringBuilder with variables
    public void testStringBuilderWithVariables() {
        // StringBuilder with variables
        String condition = "price > 100";
        StringBuilder sql3 = new StringBuilder();
        sql3.append("SELECT * FROM products WHERE ");
        sql3.append(condition);
        
        executeQuery(sql3.toString());
    }
    
    // Test StringBuilder with constructor initialization
    public void testStringBuilderWithConstructor() {
        // StringBuilder with constructor initialization
        StringBuilder sql4 = new StringBuilder("SELECT * FROM categories");
        sql4.append(" WHERE active = true");
        
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
