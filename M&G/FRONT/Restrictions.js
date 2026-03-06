// src/components/AdminRestriction.js
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { store } from "../redux/store";
// For Redux if using hooks:
// import { useSelector } from "react-redux";

const Restrictions = ({ permissionKey, children }) => {
  const [permissions, setPermissions] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const adminPermissions = store.getState().token.Permissions || [];
    const userRole = store.getState().token.Roles[0]?.label || ""; // Get the role from Redux store
    setPermissions(adminPermissions.length > 0 ? adminPermissions[0] : {});
    setRole(userRole.toLowerCase());
  }, []);

  // Show loading indicator while checking permissions
  if (permissions === null || role === null) {
    return <div>Loading...</div>;
  }

  // Skip permission check if the role is 'admin'
  if (role === "admin") {
    return <>{children}</>;
  }

  // Check if the permissionKey exists and its value is "YES"
  if (permissions[permissionKey]?.toLowerCase() !== "yes") {
    return <Navigate to="/notfound" replace />;
  }

  // If permission is granted, render the children
  return <>{children}</>;
};

export default Restrictions;
