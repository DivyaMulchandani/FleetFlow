// src/app/page.js
"use client";

import { useState } from "react";
import {
  FaTruck,
  FaUserCircle,
  FaLock,
  FaEnvelope,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaClipboardCheck,
  FaChartLine,
  FaExclamationTriangle
} from "react-icons/fa";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    confirmPassword: "",
    role: "dispatcher",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  const roles = [
    { value: "fleet_manager", label: "Fleet Manager", icon: FaTruck, color: "#4A70A9" },
    { value: "dispatcher", label: "Dispatcher", icon: FaClipboardCheck, color: "#8FABD4" },
    { value: "safety_officer", label: "Safety Officer", icon: FaShieldAlt, color: "#4A70A9" },
    { value: "financial_analyst", label: "Financial Analyst", icon: FaChartLine, color: "#8FABD4" },
  ];

  const getRoleIcon = (roleValue) => {
    const role = roles.find(r => r.value === roleValue);
    return role ? role.icon : FaUser;
  };

  const RoleIcon = getRoleIcon(formData.role);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#EFECE3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Decorative Background Elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(143, 171, 212, 0.1)',
          filter: 'blur(80px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(74, 112, 169, 0.1)',
          filter: 'blur(80px)'
        }} />
      </div>

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #4A70A9 0%, #8FABD4 100%)',
            borderRadius: '24px',
            marginBottom: '20px',
            boxShadow: '0 10px 30px rgba(74, 112, 169, 0.3)'
          }}>
            <FaTruck size={40} color="white" />
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '800',
            color: '#4A70A9',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            FleetFlow
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#000000',
            opacity: 0.7
          }}>
            Modular Fleet & Logistics Management
          </p>
        </div>

        {/* Auth Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '32px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1), 0 10px 30px rgba(74, 112, 169, 0.1)',
          overflow: 'hidden'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #EFECE3'
          }}>
            <button
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1,
                padding: '20px',
                background: isLogin ? 'white' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                color: isLogin ? '#4A70A9' : '#000000',
                borderBottom: isLogin ? '3px solid #4A70A9' : '3px solid transparent',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              Login
              {isLogin && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: '#4A70A9'
                }} />
              )}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1,
                padding: '20px',
                background: !isLogin ? 'white' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                color: !isLogin ? '#4A70A9' : '#000000',
                borderBottom: !isLogin ? '3px solid #4A70A9' : '3px solid transparent',
                transition: 'all 0.3s ease'
              }}
            >
              Register
            </button>
          </div>

          {/* Form Section */}
          <div style={{ padding: '40px' }}>
            {/* Role Selection - Highlighted Section */}
            <div style={{
              background: '#EFECE3',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '15px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#4A70A9',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <RoleIcon size={20} color="white" />
                </div>
                <div>
                  <div style={{
                    fontSize: '14px',
                    color: '#000000',
                    opacity: 0.6,
                    marginBottom: '4px'
                  }}>
                    Logging in as
                  </div>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#4A70A9',
                      cursor: 'pointer',
                      outline: 'none',
                      padding: '4px 0'
                    }}
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Badges */}
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                {roles.map((role) => {
                  const Icon = role.icon;
                  const isSelected = formData.role === role.value;
                  return (
                    <button
                      key={role.value}
                      onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: isSelected ? role.color : 'white',
                        border: 'none',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isSelected ? 'white' : '#000000',
                        boxShadow: isSelected ? '0 4px 10px rgba(74, 112, 169, 0.3)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={14} />
                      {role.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Username Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: '8px'
                }}>
                  <FaUser style={{ marginRight: '8px', opacity: 0.6 }} />
                  Username
                </label>
                <div style={{
                  position: 'relative'
                }}>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username"
                    required
                    style={{
                      boxSizing: 'border-box', // ADDED FIX
                      width: '100%',
                      padding: '15px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '16px',
                      color: '#000000',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  />
                </div>
              </div>

              {/* Email Field - Registration only */}
              {!isLogin && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '8px'
                  }}>
                    <FaEnvelope style={{ marginRight: '8px', opacity: 0.6 }} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    style={{
                      boxSizing: 'border-box', // ADDED FIX
                      width: '100%',
                      padding: '15px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '16px',
                      color: '#000000',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  />
                </div>
              )}

              {/* Password Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: '8px'
                }}>
                  <FaLock style={{ marginRight: '8px', opacity: 0.6 }} />
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    style={{
                      boxSizing: 'border-box', // ADDED FIX
                      width: '100%',
                      padding: '15px 20px',
                      paddingRight: '50px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '16px',
                      color: '#000000',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8FABD4',
                      fontSize: '18px'
                    }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Confirm Password - Registration only */}
              {!isLogin && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '8px'
                  }}>
                    <FaLock style={{ marginRight: '8px', opacity: 0.6 }} />
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      required
                      style={{
                        boxSizing: 'border-box', // ADDED FIX
                        width: '100%',
                        padding: '15px 20px',
                        paddingRight: '50px',
                        background: '#EFECE3',
                        border: '2px solid transparent',
                        borderRadius: '16px',
                        fontSize: '16px',
                        color: '#000000',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                      onBlur={(e) => e.target.style.borderColor = 'transparent'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#8FABD4',
                        fontSize: '18px'
                      }}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot Password - Login only */}
              {isLogin && (
                <div style={{
                  textAlign: 'right',
                  marginBottom: '25px'
                }}>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8FABD4',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(143, 171, 212, 0.3)'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '18px',
                  background: 'linear-gradient(135deg, #4A70A9 0%, #8FABD4 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 10px 20px rgba(74, 112, 169, 0.3)',
                  marginBottom: '20px'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                {isLogin ? 'Sign In to Dashboard' : 'Create Account'}
              </button>

              {/* Security Note */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '15px',
                background: 'rgba(143, 171, 212, 0.1)',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#4A70A9'
              }}>
                <FaShieldAlt />
                <span>Role-Based Access Control • Enterprise Grade Security</span>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          fontSize: '14px',
          color: '#000000',
          opacity: 0.6
        }}>
          © 2026 FleetFlow. All rights reserved.
        </div>
      </div>
    </div>
  );
}
