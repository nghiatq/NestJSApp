package com.example.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class SampleDao {
    
    private Connection connection;
    
    public SampleDao(Connection connection) {
        this.connection = connection;
    }
    
    public List<User> getAllUsers() throws SQLException {
        List<User> users = new ArrayList<>();
        
        // This is a SQL query to get all users
        String sql = "SELECT id, username, email, created_at FROM users ORDER BY created_at DESC";
        
        try (PreparedStatement stmt = connection.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            
            while (rs.next()) {
                User user = new User();
                user.setId(rs.getLong("id"));
                user.setUsername(rs.getString("username"));
                user.setEmail(rs.getString("email"));
                user.setCreatedAt(rs.getTimestamp("created_at"));
                users.add(user);
            }
        }
        
        return users;
    }
    
    public User getUserById(long id) throws SQLException {
        User user = null;
        
        String sql = "SELECT id, username, email, created_at " +
                     "FROM users " +
                     "WHERE id = ?";
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, id);
            
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    user = new User();
                    user.setId(rs.getLong("id"));
                    user.setUsername(rs.getString("username"));
                    user.setEmail(rs.getString("email"));
                    user.setCreatedAt(rs.getTimestamp("created_at"));
                }
            }
        }
        
        return user;
    }
    
    public void createUser(User user) throws SQLException {
        String sql = "INSERT INTO users (username, email, password_hash, created_at) " +
                     "VALUES (?, ?, ?, CURRENT_TIMESTAMP)";
        
        try (PreparedStatement stmt = connection.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, user.getUsername());
            stmt.setString(2, user.getEmail());
            stmt.setString(3, user.getPasswordHash());
            
            int affectedRows = stmt.executeUpdate();
            
            if (affectedRows == 0) {
                throw new SQLException("Creating user failed, no rows affected.");
            }
            
            try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    user.setId(generatedKeys.getLong(1));
                } else {
                    throw new SQLException("Creating user failed, no ID obtained.");
                }
            }
        }
    }
    
    public void updateUser(User user) throws SQLException {
        // Update user information
        String sql = "UPDATE users SET username = ?, email = ? WHERE id = ?";
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, user.getUsername());
            stmt.setString(2, user.getEmail());
            stmt.setLong(3, user.getId());
            
            stmt.executeUpdate();
        }
    }
    
    public void deleteUser(long id) throws SQLException {
        String sql = "DELETE FROM users WHERE id = ?";
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, id);
            stmt.executeUpdate();
        }
    }
    
    // This method has a complex SQL query with joins
    public List<UserActivity> getUserActivities(long userId) throws SQLException {
        List<UserActivity> activities = new ArrayList<>();
        
        String sql = 
            "SELECT a.id, a.activity_type, a.description, a.created_at, " +
            "       u.username, u.email " +
            "FROM activities a " +
            "JOIN users u ON a.user_id = u.id " +
            "LEFT JOIN activity_details ad ON a.id = ad.activity_id " +
            "WHERE a.user_id = ? " +
            "GROUP BY a.id " +
            "ORDER BY a.created_at DESC";
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setLong(1, userId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    UserActivity activity = new UserActivity();
                    activity.setId(rs.getLong("id"));
                    activity.setActivityType(rs.getString("activity_type"));
                    activity.setDescription(rs.getString("description"));
                    activity.setCreatedAt(rs.getTimestamp("created_at"));
                    activity.setUsername(rs.getString("username"));
                    activity.setEmail(rs.getString("email"));
                    activities.add(activity);
                }
            }
        }
        
        return activities;
    }
    
    // This method doesn't contain SQL
    public void logActivity(String message) {
        System.out.println("Activity: " + message);
        // No SQL here, just logging
    }
}
