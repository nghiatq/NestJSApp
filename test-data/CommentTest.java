package com.example.test;

/**
 * This is a test class to verify that SQL in comments is ignored.
 * SELECT * FROM users WHERE id = 1
 */
public class CommentTest {
    
    // This is a comment with SQL: SELECT * FROM users
    public void testMethod() {
        // Another comment with SQL: INSERT INTO users VALUES (1, 'test')
        String validSql = "SELECT * FROM users WHERE username = 'test'";
        
        /* Multi-line comment with SQL
         * SELECT * FROM products
         * WHERE price > 100
         */
        String anotherSql = "UPDATE users SET active = true WHERE id = 5";
        
        // This should be detected
        executeQuery("SELECT COUNT(*) FROM orders");
        
        /* This is a comment */String mixedCase = "select * from CUSTOMERS";
    }
    
    private void executeQuery(String sql) {
        // Implementation
        System.out.println(sql);
    }
}
