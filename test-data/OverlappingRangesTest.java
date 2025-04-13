package com.example.test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * This is a test class to verify that overlapping line ranges are properly merged.
 */
public class OverlappingRangesTest {
    
    // Test overlapping line ranges
    public void testOverlappingRanges() {
        // These two SQL statements have overlapping line ranges (19-19 and 19-21)
        String sql1 = "SELECT * FROM users";
        
        // This is a multi-line SQL statement
        String sql2 = "SELECT u.id, u.username, " +
                      "u.email, u.created_at " +
                      "FROM users u";
        
        // This is another SQL statement with a different line range
        String sql3 = "INSERT INTO users (username, email) VALUES ('test', 'test@example.com')";
        
        executeQuery(sql1);
        executeQuery(sql2);
        executeQuery(sql3);
    }
    
    // Test adjacent line ranges
    public void testAdjacentRanges() {
        // These two SQL statements have adjacent line ranges
        String sql1 = "SELECT * FROM products";
        
        // This is the next line
        String sql2 = "SELECT * FROM categories";
        
        executeQuery(sql1);
        executeQuery(sql2);
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
