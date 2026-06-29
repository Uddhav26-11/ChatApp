import React, { createContext, useState, useEffect, useContext } from "react";
import { io } from "socket.io-client";

const AuthContext = createContext();

export const SOCKET_URL = "https://chatapp-w395.onrender.com";
export const API_URL = "https://chatapp-w395.onrender.com/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("chatUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      const newSocket = io(SOCKET_URL, {
        transports: ["websocket"],

        withCredentials: true,
      });
      setSocket(newSocket);

      newSocket.emit("user-online", user._id);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const login = (userData) => {
    localStorage.setItem("chatUser", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("chatUser");
    setUser(null);
    if (socket) socket.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, socket }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
