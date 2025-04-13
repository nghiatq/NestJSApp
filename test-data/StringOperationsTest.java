package com.example.test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * This is a test class to verify that SQL in string operations is properly detected.
 */
public class StringOperationsTest {
    
    // Test string concatenation
    public void testStringConcatenation() {
        // Simple string concatenation
        String sql1 = "SELECT * FROM users WHERE id = 1";
        
        // Multi-line string concatenation
        String sql2 = "SELECT u.id, u.username, " +
                      "u.email, u.created_at " +
                      "FROM users u " +
                      "WHERE u.active = true";
        
        // String concatenation with variables
        String tableName = "products";
        String sql3 = "SELECT * FROM " + tableName + " WHERE price > 100";
        
        // String concatenation with +=
        String sql4 = "SELECT p.id, p.name";
        sql4 += " FROM products p";
        sql4 += " WHERE p.category = 'electronics'";
        
        executeQuery(sql1);
        executeQuery(sql2);
        executeQuery(sql3);
        executeQuery(sql4);
    }
    
    // Test StringBuilder
    public void testStringBuilder() {
        // Simple StringBuilder
        StringBuilder sql1 = new StringBuilder();
        sql1.append("SELECT * FROM orders WHERE status = 'pending'");
        
        // Multi-line StringBuilder
        StringBuilder sql2 = new StringBuilder();
        sql2.append("SELECT o.id, o.customer_id, ");
        sql2.append("o.order_date, o.total ");
        sql2.append("FROM orders o ");
        sql2.append("WHERE o.status = 'completed'");
        
        // StringBuilder with variables
        String condition = "price > 100";
        StringBuilder sql3 = new StringBuilder();
        sql3.append("SELECT * FROM products WHERE ");
        sql3.append(condition);
        
        executeQuery(sql1.toString());
        executeQuery(sql2.toString());
        executeQuery(sql3.toString());
    }
    
    // Test mixed string operations
    public void testMixedOperations() {
        // Mix of concatenation and StringBuilder
        String select = "SELECT * ";
        StringBuilder sqlBuilder = new StringBuilder(select);
        sqlBuilder.append("FROM customers ");
        sqlBuilder.append("WHERE ");
        String condition = "active = true";
        sqlBuilder.append(condition);
        
        // Complex SQL construction
        StringBuilder complexSql = new StringBuilder();
        complexSql.append("SELECT p.id, p.name, p.price, ");
        complexSql.append("c.name as category_name ");
        complexSql.append("FROM products p ");
        complexSql.append("JOIN categories c ON p.category_id = c.id ");
        String whereClause = "WHERE p.price > 50 ";
        complexSql.append(whereClause);
        complexSql.append("ORDER BY p.price DESC");
        
        executeQuery(sqlBuilder.toString());
        executeQuery(complexSql.toString());
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
