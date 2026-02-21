// src/app/dashboard/vehicles/page.js
"use client";

import { useState } from "react";
import { 
  FaTruck, 
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaWrench,
  FaClipboardList,
  FaChartLine,
  FaShieldAlt,
  FaFileExport,
  FaTimes,
  FaSave,
  FaBolt,
  FaGasPump,
  FaRoad,
  FaWeightHanging,
  FaIdCard,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaFilter,
  FaSortAmountDown,
  FaEye
} from "react-icons/fa";

export default function VehicleRegistry() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [vehicles, setVehicles] = useState([
    {
      id: 1,
      name: "Volvo FH16",
      model: "FH16 750",
      licensePlate: "TRK-2024-001",
      type: "Truck",
      maxCapacity: "25 tons",
      currentOdometer: "45,678 km",
      status: "Available",
      lastService: "2026-01-15",
      fuelEfficiency: "3.2 km/l",
      driver: "John Smith",
      location: "Chicago Hub"
    },
    {
      id: 2,
      name: "Mercedes Sprinter",
      model: "316 CDI",
      licensePlate: "VAN-2024-002",
      type: "Van",
      maxCapacity: "3.5 tons",
      currentOdometer: "12,345 km",
      status: "On Trip",
      lastService: "2026-02-01",
      fuelEfficiency: "8.5 km/l",
      driver: "Sarah Johnson",
      location: "En Route to Detroit"
    },
    {
      id: 3,
      name: "Harley-Davidson",
      model: "Road King",
      licensePlate: "BIKE-2024-003",
      type: "Bike",
      maxCapacity: "500 kg",
      currentOdometer: "5,678 km",
      status: "In Shop",
      lastService: "2026-02-20",
      fuelEfficiency: "15 km/l",
      driver: "Mike Wilson",
      location: "Maintenance Bay 2"
    },
    {
      id: 4,
      name: "Scania R500",
      model: "R500 V8",
      licensePlate: "TRK-2024-004",
      type: "Truck",
      maxCapacity: "28 tons",
      currentOdometer: "89,234 km",
      status: "Available",
      lastService: "2026-01-28",
      fuelEfficiency: "2.9 km/l",
      driver: "Unassigned",
      location: "Dallas Depot"
    },
    {
      id: 5,
      name: "Ford Transit",
      model: "350 LWB",
      licensePlate: "VAN-2024-005",
      type: "Van",
      maxCapacity: "4.2 tons",
      currentOdometer: "23,456 km",
      status: "On Trip",
      lastService: "2026-02-10",
      fuelEfficiency: "7.8 km/l",
      driver: "Emily Brown",
      location: "En Route to Nashville"
    },
    {
      id: 6,
      name: "Yamaha MT-07",
      model: "MT-07",
      licensePlate: "BIKE-2024-006",
      type: "Bike",
      maxCapacity: "350 kg",
      currentOdometer: "3,289 km",
      status: "Available",
      lastService: "2026-02-15",
      fuelEfficiency: "22 km/l",
      driver: "Unassigned",
      location: "Miami Base"
    }
  ]);

  const [newVehicle, setNewVehicle] = useState({
    name: "",
    model: "",
    licensePlate: "",
    type: "Truck",
    maxCapacity: "",
    capacityUnit: "tons",
    odometer: "",
    status: "Available",
    notes: ""
  });

  const vehicleTypes = [
    { value: "Truck", label: "Truck", icon: FaTruck, color: "#4A70A9" },
    { value: "Van", label: "Van", icon: FaBolt, color: "#8FABD4" },
    { value: "Bike", label: "Bike", icon: FaRoad, color: "#4A70A9" }
  ];

  const getStatusBadge = (status) => {
    const statusStyles = {
      "Available": { bg: "rgba(40, 167, 69, 0.1)", color: "#28a745", icon: FaToggleOn },
      "On Trip": { bg: "rgba(0, 123, 255, 0.1)", color: "#007bff", icon: FaRoad },
      "In Shop": { bg: "rgba(255, 193, 7, 0.1)", color: "#ffc107", icon: FaWrench },
      "Out of Service": { bg: "rgba(220, 53, 69, 0.1)", color: "#dc3545", icon: FaToggleOff }
    };
    return statusStyles[status] || statusStyles["Available"];
  };

  const getTypeIcon = (type) => {
    const typeObj = vehicleTypes.find(t => t.value === type);
    return typeObj ? typeObj.icon : FaTruck;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVehicle(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveVehicle = () => {
    const vehicle = {
      id: vehicles.length + 1,
      ...newVehicle,
      currentOdometer: `${parseInt(newVehicle.odometer).toLocaleString()} km`,
      lastService: "Not serviced",
      fuelEfficiency: "—",
      driver: "Unassigned",
      location: "Pending Assignment"
    };
    setVehicles([vehicle, ...vehicles]);
    setShowAddModal(false);
    setNewVehicle({
      name: "",
      model: "",
      licensePlate: "",
      type: "Truck",
      maxCapacity: "",
      capacityUnit: "tons",
      odometer: "",
      status: "Available",
      notes: ""
    });
  };

  const handleDeleteVehicle = () => {
    setVehicles(vehicles.filter(v => v.id !== selectedVehicle.id));
    setShowDeleteModal(false);
    setSelectedVehicle(null);
  };

  // Filter vehicles based on search and filters
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.driver.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || vehicle.status === filterStatus;
    const matchesType = filterType === "all" || vehicle.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === "Available").length,
    onTrip: vehicles.filter(v => v.status === "On Trip").length,
    inShop: vehicles.filter(v => v.status === "In Shop").length,
    trucks: vehicles.filter(v => v.type === "Truck").length,
    vans: vehicles.filter(v => v.type === "Van").length,
    bikes: vehicles.filter(v => v.type === "Bike").length
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#EFECE3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        padding: '20px 30px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #4A70A9 0%, #8FABD4 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaTruck size={24} color="white" />
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#4A70A9',
                  marginBottom: '4px'
                }}>
                  Vehicle Registry
                </h1>
                <p style={{ fontSize: '14px', color: '#000000', opacity: 0.6 }}>
                  Manage your fleet assets • {vehicles.length} vehicles registered
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#28a745'
                }} />
                <span style={{ fontSize: '14px', color: '#000000', opacity: 0.7 }}>
                  Available: {stats.available}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#007bff'
                }} />
                <span style={{ fontSize: '14px', color: '#000000', opacity: 0.7 }}>
                  On Trip: {stats.onTrip}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ffc107'
                }} />
                <span style={{ fontSize: '14px', color: '#000000', opacity: 0.7 }}>
                  In Shop: {stats.inShop}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid #8FABD4',
              borderRadius: '12px',
              color: '#4A70A9',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#8FABD4';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#4A70A9';
            }}
            >
              <FaDownload />
              Export
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #4A70A9 0%, #8FABD4 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(74, 112, 169, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <FaPlus />
              Add Vehicle
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '30px auto',
        padding: '0 30px'
      }}>
        {/* Filters */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '30px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
              <FaSearch style={{
                position: 'absolute',
                left: '15px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#8FABD4',
                fontSize: '16px'
              }} />
              <input
                type="text"
                placeholder="Search by name, plate, model, or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px 14px 45px',
                  background: '#EFECE3',
                  border: '2px solid transparent',
                  borderRadius: '12px',
                  fontSize: '15px',
                  color: '#000000',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <FaFilter style={{ color: '#8FABD4' }} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '12px 20px',
                  background: '#EFECE3',
                  border: '2px solid transparent',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#000000',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '140px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
              >
                <option value="all">All Status</option>
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="In Shop">In Shop</option>
                <option value="Out of Service">Out of Service</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '12px 20px',
                  background: '#EFECE3',
                  border: '2px solid transparent',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#000000',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
              >
                <option value="all">All Types</option>
                <option value="Truck">Trucks</option>
                <option value="Van">Vans</option>
                <option value="Bike">Bikes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vehicle Table */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                background: '#EFECE3',
                borderBottom: '2px solid #8FABD4'
              }}>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Vehicle</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>License Plate</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Type</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Capacity</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Odometer</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Driver</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVehicles.map((vehicle, index) => {
                const TypeIcon = getTypeIcon(vehicle.type);
                const statusStyle = getStatusBadge(vehicle.status);
                const StatusIcon = statusStyle.icon;
                
                return (
                  <tr key={vehicle.id} style={{
                    borderBottom: index < paginatedVehicles.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'background 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#EFECE3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: `linear-gradient(135deg, ${vehicle.type === 'Truck' ? '#4A70A9' : '#8FABD4'} 0%, ${vehicle.type === 'Bike' ? '#4A70A9' : '#8FABD4'} 100%)`,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.8
                        }}>
                          <TypeIcon size={20} color="white" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#4A70A9', marginBottom: '4px' }}>{vehicle.name}</div>
                          <div style={{ fontSize: '13px', color: '#000000', opacity: 0.6 }}>{vehicle.model}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#000000', fontWeight: '500' }}>{vehicle.licensePlate}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        padding: '6px 12px',
                        background: vehicle.type === 'Truck' ? 'rgba(74, 112, 169, 0.1)' : 'rgba(143, 171, 212, 0.1)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: vehicle.type === 'Truck' ? '#4A70A9' : '#8FABD4'
                      }}>
                        {vehicle.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#000000' }}>{vehicle.maxCapacity}</td>
                    <td style={{ padding: '16px 20px', color: '#000000' }}>{vehicle.currentOdometer}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: statusStyle.bg,
                        borderRadius: '20px',
                        color: statusStyle.color,
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        <StatusIcon size={12} />
                        {vehicle.status}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#000000' }}>{vehicle.driver}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{
                          width: '36px',
                          height: '36px',
                          background: 'transparent',
                          border: '1px solid #8FABD4',
                          borderRadius: '10px',
                          color: '#4A70A9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#4A70A9';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#4A70A9';
                        }}
                        >
                          <FaEye size={16} />
                        </button>
                        <button style={{
                          width: '36px',
                          height: '36px',
                          background: 'transparent',
                          border: '1px solid #8FABD4',
                          borderRadius: '10px',
                          color: '#4A70A9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#4A70A9';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#4A70A9';
                        }}
                        >
                          <FaEdit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setShowDeleteModal(true);
                          }}
                          style={{
                            width: '36px',
                            height: '36px',
                            background: 'transparent',
                            border: '1px solid #dc3545',
                            borderRadius: '10px',
                            color: '#dc3545',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#dc3545';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = '#dc3545';
                          }}
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{
            padding: '20px',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#000000', opacity: 0.6 }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredVehicles.length)} of {filteredVehicles.length} vehicles
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid #8FABD4',
                  borderRadius: '10px',
                  color: currentPage === 1 ? '#8FABD4' : '#4A70A9',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaChevronLeft size={14} />
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: currentPage === i + 1 ? '#4A70A9' : 'transparent',
                    border: currentPage === i + 1 ? 'none' : '1px solid #8FABD4',
                    borderRadius: '10px',
                    color: currentPage === i + 1 ? 'white' : '#4A70A9',
                    cursor: 'pointer',
                    fontWeight: currentPage === i + 1 ? '600' : '400'
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid #8FABD4',
                  borderRadius: '10px',
                  color: currentPage === totalPages ? '#8FABD4' : '#4A70A9',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Next
                <FaChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div style={{
          marginTop: '30px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(74, 112, 169, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaTruck color="#4A70A9" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#4A70A9' }}>Vehicle Types</h3>
                <p style={{ fontSize: '13px', color: '#000000', opacity: 0.6 }}>Fleet composition</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#000000', opacity: 0.7 }}>Trucks</span>
              <span style={{ fontWeight: '600', color: '#4A70A9' }}>{stats.trucks}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#000000', opacity: 0.7 }}>Vans</span>
              <span style={{ fontWeight: '600', color: '#8FABD4' }}>{stats.vans}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#000000', opacity: 0.7 }}>Bikes</span>
              <span style={{ fontWeight: '600', color: '#4A70A9' }}>{stats.bikes}</span>
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(143, 171, 212, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaClipboardList color="#8FABD4" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#4A70A9' }}>Quick Actions</h3>
                <p style={{ fontSize: '13px', color: '#000000', opacity: 0.6 }}>Common tasks</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button style={{
                padding: '10px',
                background: 'transparent',
                border: '1px solid #8FABD4',
                borderRadius: '10px',
                color: '#4A70A9',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <FaWrench size={14} />
                Schedule Maintenance
              </button>
              <button style={{
                padding: '10px',
                background: 'transparent',
                border: '1px solid #8FABD4',
                borderRadius: '10px',
                color: '#4A70A9',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <FaGasPump size={14} />
                Log Fuel
              </button>
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(74, 112, 169, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaShieldAlt color="#4A70A9" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#4A70A9' }}>Compliance</h3>
                <p style={{ fontSize: '13px', color: '#000000', opacity: 0.6 }}>Vehicle status</p>
              </div>
            </div>
            <div style={{ color: '#28a745', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaToggleOn />
              All vehicles compliant
            </div>
          </div>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '32px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '30px',
              borderBottom: '1px solid #EFECE3',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#4A70A9',
                  marginBottom: '8px'
                }}>
                  New Vehicle Registration
                </h2>
                <p style={{ fontSize: '14px', color: '#000000', opacity: 0.6 }}>
                  Add a new vehicle to your fleet
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#EFECE3',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4A70A9',
                  fontSize: '18px'
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '30px' }}>
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4A70A9',
                  marginBottom: '8px'
                }}>
                  <FaIdCard style={{ marginRight: '8px' }} />
                  License Plate *
                </label>
                <input
                  type="text"
                  name="licensePlate"
                  value={newVehicle.licensePlate}
                  onChange={handleInputChange}
                  placeholder="e.g., TRK-2024-001"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: '#EFECE3',
                    border: '2px solid transparent',
                    borderRadius: '16px',
                    fontSize: '15px',
                    color: '#000000',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                  onBlur={(e) => e.target.style.borderColor = 'transparent'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4A70A9',
                    marginBottom: '8px'
                  }}>
                    Vehicle Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newVehicle.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Volvo FH16"
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '15px',
                      color: '#000000',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4A70A9',
                    marginBottom: '8px'
                  }}>
                    Model
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={newVehicle.model}
                    onChange={handleInputChange}
                    placeholder="e.g., FH16 750"
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '15px',
                      color: '#000000',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4A70A9',
                  marginBottom: '8px'
                }}>
                  <FaWeightHanging style={{ marginRight: '8px' }} />
                  Max Payload *
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    name="maxCapacity"
                    value={newVehicle.maxCapacity}
                    onChange={handleInputChange}
                    placeholder="Enter capacity"
                    style={{
                      flex: 2,
                      padding: '14px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '15px',
                      color: '#000000',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  />
                  <select
                    name="capacityUnit"
                    value={newVehicle.capacityUnit}
                    onChange={handleInputChange}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '15px',
                      color: '#4A70A9',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  >
                    <option value="kg">kg</option>
                    <option value="tons">tons</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4A70A9',
                    marginBottom: '8px'
                  }}>
                    <FaRoad style={{ marginRight: '8px' }} />
                    Initial Odometer *
                  </label>
                  <input
                    type="number"
                    name="odometer"
                    value={newVehicle.odometer}
                    onChange={handleInputChange}
                    placeholder="Enter mileage"
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '15px',
                      color: '#000000',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4A70A9',
                    marginBottom: '8px'
                  }}>
                    Vehicle Type *
                  </label>
                  <select
                    name="type"
                    value={newVehicle.type}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '15px',
                      color: '#4A70A9',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4A70A9',
                  marginBottom: '8px'
                }}>
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={newVehicle.notes}
                  onChange={handleInputChange}
                  placeholder="Any additional information about the vehicle..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: '#EFECE3',
                    border: '2px solid transparent',
                    borderRadius: '16px',
                    fontSize: '15px',
                    color: '#000000',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                  onBlur={(e) => e.target.style.borderColor = 'transparent'}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '30px',
              borderTop: '1px solid #EFECE3',
              display: 'flex',
              gap: '15px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '14px 30px',
                  background: 'transparent',
                  border: '2px solid #8FABD4',
                  borderRadius: '16px',
                  color: '#4A70A9',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#EFECE3';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVehicle}
                style={{
                  padding: '14px 40px',
                  background: 'linear-gradient(135deg, #4A70A9 0%, #8FABD4 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 15px rgba(74, 112, 169, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <FaSave />
                Save Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedVehicle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '32px',
            width: '90%',
            maxWidth: '450px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(220, 53, 69, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <FaTrash size={40} color="#dc3545" />
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#4A70A9',
              marginBottom: '10px'
            }}>
              Delete Vehicle?
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000000',
              opacity: 0.7,
              marginBottom: '30px'
            }}>
              Are you sure you want to delete {selectedVehicle.name} ({selectedVehicle.licensePlate})? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedVehicle(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'transparent',
                  border: '2px solid #8FABD4',
                  borderRadius: '16px',
                  color: '#4A70A9',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVehicle}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#dc3545',
                  border: 'none',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#c82333'}
                onMouseLeave={(e) => e.target.style.background = '#dc3545'}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}