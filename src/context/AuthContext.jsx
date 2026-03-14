import React, { createContext, useContext, useState, useEffect } from 'react';
import { base, TABLE_NAMES } from '../api/airtable';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // On mount, check if there's a stored session
  useEffect(() => {
    const storedUser = localStorage.getItem('silica_auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username) => {
    setLoading(true);
    setError('');
    try {
      // Find user in Airtable by username
      const records = await base(TABLE_NAMES.USERS).select({
        filterByFormula: `{username} = '${username}'`,
        maxRecords: 1
      }).firstPage();

      if (records.length > 0) {
        const userData = {
          id: records[0].id,
          username: records[0].fields.username,
          role: records[0].fields.role // 'admin' or 'manager'
        };
        setUser(userData);
        localStorage.setItem('silica_auth_user', JSON.stringify(userData));
        setLoading(false);
        return true;
      } else {
        setError('User not found.');
        setLoading(false);
        return false;
      }
    } catch (err) {
      console.error(err);
      setError('Connection error or table missing. Please ensure Airtable is configured correctly.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('silica_auth_user');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    error,
    setError
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
