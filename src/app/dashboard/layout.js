// src/app/dashboard/layout.js
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  FaBell, 
  FaCog, 
  FaUser, 
  FaWrench, 
  FaTruck, 
  FaGasPump, 
  FaFileInvoiceDollar, 
  FaChartBar, 
  FaUsers 
} from "react-icons/fa";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  // Define our navigation routes based on the teammate's tabs
  const tabs = [
    { id: 'maintenance', label: 'Maintenance', icon: FaWrench, href: '/dashboard/maintenance' },
    { id: 'dispatch', label: 'Dispatch', icon: FaTruck, href: '/dashboard/trips' }, // Assuming this connects to your existing trips page
    { id: 'vehicles', label: 'Vehicles', icon: FaTruck, href: '/dashboard/vehicles' }, // Added your existing vehicle page
    { id: 'fuel', label: 'Fuel', icon: FaGasPump, href: '/dashboard/fuel' },
    { id: 'finance', label: 'Finance', icon: FaFileInvoiceDollar, href: '/dashboard/finance' },
    { id: 'analytics', label: 'Analytics', icon: FaChartBar, href: '/dashboard/analytics' },
    { id: 'users', label: 'Users', icon: FaUsers, href: '/dashboard/users' }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#EFECE3', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
    }}>
      
      {/* Top Header */}
      <header style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #d4d4d4', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>
            
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #4A70A9 0%, #8FABD4 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaTruck size={20} color="white" />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#4A70A9', margin: 0, letterSpacing: '-0.5px' }}>
                FleetFlow
              </h1>
            </div>

            {/* Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button style={{ padding: '8px', color: '#8FABD4', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#4A70A9'} onMouseLeave={(e) => e.target.style.color = '#8FABD4'}>
                <FaBell size={20} />
              </button>
              <button style={{ padding: '8px', color: '#8FABD4', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#4A70A9'} onMouseLeave={(e) => e.target.style.color = '#8FABD4'}>
                <FaCog size={20} />
              </button>
              
              <div style={{ width: '1px', height: '30px', background: '#d4d4d4' }} /> {/* Divider */}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#000000' }}>Admin User</div>
                  <div style={{ fontSize: '12px', color: '#000000', opacity: 0.6 }}>Fleet Manager</div>
                </div>
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  backgroundColor: 'rgba(74, 112, 169, 0.1)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <FaUser size={16} color="#4A70A9" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #d4d4d4',
        position: 'sticky',
        top: '70px',
        zIndex: 40
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 30px' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {tabs.map(tab => {
              // Check if the current URL matches the tab's link to highlight it
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 20px',
                    color: isActive ? '#4A70A9' : '#000000',
                    opacity: isActive ? 1 : 0.6,
                    borderBottom: isActive ? '3px solid #4A70A9' : '3px solid transparent',
                    background: isActive ? '#EFECE3' : 'transparent',
                    textDecoration: 'none',
                    fontWeight: isActive ? '600' : '500',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.opacity = '1';
                      e.target.style.background = '#EFECE3';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.opacity = '0.6';
                      e.target.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Page Content rendered here */}
      <main>
        {children}
      </main>
      
    </div>
  );
}