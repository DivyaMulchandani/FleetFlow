// src/app/dashboard/trips/page.js
"use client";

import { useState } from "react";
import { 
  FaTruck, 
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaMapMarkerAlt,
  FaRoute,
  FaWeightHanging,
  FaUser,
  FaGasPump,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaTruckLoading,
  FaFlagCheckered,
  FaBan,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaFilter,
  FaInfoCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaClipboardList
} from "react-icons/fa";

export default function TripDispatcher() {
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [validationError, setValidationError] = useState("");
  const [tripForm, setTripForm] = useState({
    vehicleId: "",
    driverId: "",
    cargoWeight: "",
    origin: "",
    destination: "",
    estimatedFuel: "",
    notes: ""
  });

  // Mock data for vehicles
  const [vehicles] = useState([
    { id: 1, name: "Volvo FH16", type: "Trailer Truck", plate: "TRK-2024-001", capacity: 25000, status: "Available", driver: null },
    { id: 2, name: "Mercedes Sprinter", type: "Van", plate: "VAN-2024-002", capacity: 3500, status: "Available", driver: null },
    { id: 3, name: "Scania R500", type: "Trailer Truck", plate: "TRK-2024-004", capacity: 28000, status: "Available", driver: null },
    { id: 4, name: "Ford Transit", type: "Van", plate: "VAN-2024-005", capacity: 4200, status: "On Trip", driver: "Emily Brown" },
    { id: 5, name: "Harley-Davidson", type: "Bike", plate: "BIKE-2024-003", capacity: 500, status: "In Shop", driver: null },
  ]);

  // Mock data for drivers
  const [drivers] = useState([
    { id: 1, name: "John Smith", license: "DL-2024-001", type: "Truck", status: "Available", experience: "8 years" },
    { id: 2, name: "Sarah Johnson", license: "DL-2024-002", type: "Van", status: "On Trip", experience: "5 years" },
    { id: 3, name: "Mike Wilson", license: "DL-2024-003", type: "Truck", status: "Available", experience: "12 years" },
    { id: 4, name: "Emily Brown", license: "DL-2024-004", type: "Van", status: "On Trip", experience: "3 years" },
    { id: 5, name: "David Lee", license: "DL-2024-005", type: "Bike", status: "Available", experience: "2 years" },
  ]);

  // Mock trips data
  const [trips, setTrips] = useState([
    {
      id: 1,
      tripId: "TRIP-2026-001",
      vehicle: "Volvo FH16",
      vehicleType: "Trailer Truck",
      vehiclePlate: "TRK-2024-001",
      driver: "John Smith",
      origin: "Mumbai",
      destination: "Pune",
      cargoWeight: "18,500 kg",
      capacity: "25,000 kg",
      status: "On Way",
      statusStage: "dispatched",
      eta: "2 hours",
      distance: "150 km",
      fuelEstimate: "45 L",
      startTime: "2026-02-21 08:30",
      estimatedArrival: "2026-02-21 14:30",
      completionRate: 65
    },
    {
      id: 2,
      tripId: "TRIP-2026-002",
      vehicle: "Mercedes Sprinter",
      vehicleType: "Van",
      vehiclePlate: "VAN-2024-002",
      driver: "Sarah Johnson",
      origin: "Delhi",
      destination: "Agra",
      cargoWeight: "2,800 kg",
      capacity: "3,500 kg",
      status: "Draft",
      statusStage: "draft",
      eta: "Not started",
      distance: "230 km",
      fuelEstimate: "28 L",
      startTime: "Not started",
      estimatedArrival: "Not scheduled",
      completionRate: 0
    },
    {
      id: 3,
      tripId: "TRIP-2026-003",
      vehicle: "Scania R500",
      vehicleType: "Trailer Truck",
      vehiclePlate: "TRK-2024-004",
      driver: "Mike Wilson",
      origin: "Chennai",
      destination: "Bangalore",
      cargoWeight: "22,000 kg",
      capacity: "28,000 kg",
      status: "Dispatched",
      statusStage: "dispatched",
      eta: "4 hours",
      distance: "350 km",
      fuelEstimate: "85 L",
      startTime: "2026-02-21 06:15",
      estimatedArrival: "2026-02-21 15:30",
      completionRate: 30
    },
    {
      id: 4,
      tripId: "TRIP-2026-004",
      vehicle: "Ford Transit",
      vehicleType: "Van",
      vehiclePlate: "VAN-2024-005",
      driver: "Emily Brown",
      origin: "Hyderabad",
      destination: "Vijayawada",
      cargoWeight: "3,800 kg",
      capacity: "4,200 kg",
      status: "Completed",
      statusStage: "completed",
      eta: "Completed",
      distance: "280 km",
      fuelEstimate: "32 L",
      startTime: "2026-02-20 09:00",
      estimatedArrival: "2026-02-20 16:30",
      completionRate: 100
    },
    {
      id: 5,
      tripId: "TRIP-2026-005",
      vehicle: "Harley-Davidson",
      vehicleType: "Bike",
      vehiclePlate: "BIKE-2024-003",
      driver: "David Lee",
      origin: "Jaipur",
      destination: "Udaipur",
      cargoWeight: "350 kg",
      capacity: "500 kg",
      status: "Cancelled",
      statusStage: "cancelled",
      eta: "Cancelled",
      distance: "420 km",
      fuelEstimate: "18 L",
      startTime: "2026-02-19 11:00",
      estimatedArrival: "Cancelled",
      completionRate: 0
    }
  ]);

  const getStatusBadge = (status) => {
    const statusStyles = {
      "Draft": { bg: "rgba(108, 117, 125, 0.1)", color: "#6c757d", icon: FaClock },
      "Dispatched": { bg: "rgba(0, 123, 255, 0.1)", color: "#007bff", icon: FaTruckLoading },
      "On Way": { bg: "rgba(255, 193, 7, 0.1)", color: "#ffc107", icon: FaRoute },
      "Completed": { bg: "rgba(40, 167, 69, 0.1)", color: "#28a745", icon: FaFlagCheckered },
      "Cancelled": { bg: "rgba(220, 53, 69, 0.1)", color: "#dc3545", icon: FaBan }
    };
    return statusStyles[status] || statusStyles["Draft"];
  };

  const getVehicleIcon = (type) => {
    const icons = {
      "Trailer Truck": FaTruck,
      "Van": FaTruck,
      "Bike": FaTruck
    };
    return icons[type] || FaTruck;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTripForm(prev => ({
      ...prev,
      [name]: value
    }));
    setValidationError("");
  };

  const validateTrip = () => {
    const selectedVehicle = vehicles.find(v => v.id === parseInt(tripForm.vehicleId));
    const cargoWeight = parseFloat(tripForm.cargoWeight);
    
    if (!selectedVehicle) {
      setValidationError("Please select a vehicle");
      return false;
    }
    
    if (cargoWeight > selectedVehicle.capacity) {
      setValidationError(`Cargo weight exceeds vehicle capacity! Max: ${selectedVehicle.capacity.toLocaleString()} kg`);
      return false;
    }
    
    return true;
  };

  const handleCreateTrip = () => {
    if (!validateTrip()) return;
    
    const selectedVehicle = vehicles.find(v => v.id === parseInt(tripForm.vehicleId));
    const selectedDriver = drivers.find(d => d.id === parseInt(tripForm.driverId));
    
    const newTrip = {
      id: trips.length + 1,
      tripId: `TRIP-2026-${String(trips.length + 1).padStart(3, '0')}`,
      vehicle: selectedVehicle.name,
      vehicleType: selectedVehicle.type,
      vehiclePlate: selectedVehicle.plate,
      driver: selectedDriver.name,
      origin: tripForm.origin,
      destination: tripForm.destination,
      cargoWeight: `${parseFloat(tripForm.cargoWeight).toLocaleString()} kg`,
      capacity: `${selectedVehicle.capacity.toLocaleString()} kg`,
      status: "Draft",
      statusStage: "draft",
      eta: "Not started",
      distance: "Calculating...",
      fuelEstimate: `${tripForm.estimatedFuel || 0} L`,
      startTime: "Not started",
      estimatedArrival: "Not scheduled",
      completionRate: 0
    };
    
    setTrips([newTrip, ...trips]);
    setShowNewTripModal(false);
    setTripForm({
      vehicleId: "",
      driverId: "",
      cargoWeight: "",
      origin: "",
      destination: "",
      estimatedFuel: "",
      notes: ""
    });
  };

  const updateTripStatus = (tripId, newStatus) => {
    setTrips(trips.map(trip => {
      if (trip.id === tripId) {
        const statusMap = {
          "Draft": { status: "Draft", stage: "draft" },
          "Dispatched": { status: "Dispatched", stage: "dispatched" },
          "On Way": { status: "On Way", stage: "dispatched" },
          "Completed": { status: "Completed", stage: "completed" },
          "Cancelled": { status: "Cancelled", stage: "cancelled" }
        };
        return { ...trip, ...statusMap[newStatus] };
      }
      return trip;
    }));
  };

  // Filter trips
  const filteredTrips = trips.filter(trip => {
    const matchesSearch = 
      trip.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || trip.status === filterStatus;
    const matchesType = filterType === "all" || trip.vehicleType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: trips.length,
    draft: trips.filter(t => t.status === "Draft").length,
    active: trips.filter(t => t.status === "On Way" || t.status === "Dispatched").length,
    completed: trips.filter(t => t.status === "Completed").length,
    cancelled: trips.filter(t => t.status === "Cancelled").length
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
                <FaRoute size={24} color="white" />
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#4A70A9',
                  marginBottom: '4px'
                }}>
                  Trip Dispatcher
                </h1>
                <p style={{ fontSize: '14px', color: '#000000', opacity: 0.6 }}>
                  Manage and track all deliveries • {stats.active} active trips
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
                  background: '#6c757d'
                }} />
                <span style={{ fontSize: '14px', color: '#000000', opacity: 0.7 }}>
                  Draft: {stats.draft}
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
                  Active: {stats.active}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#28a745'
                }} />
                <span style={{ fontSize: '14px', color: '#000000', opacity: 0.7 }}>
                  Completed: {stats.completed}
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
              Export Trips
            </button>
            <button
              onClick={() => setShowNewTripModal(true)}
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
              New Trip
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
                placeholder="Search by Trip ID, Vehicle, Driver, Location..."
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
                <option value="Draft">Draft</option>
                <option value="Dispatched">Dispatched</option>
                <option value="On Way">On Way</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
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
                  minWidth: '140px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
              >
                <option value="all">All Types</option>
                <option value="Trailer Truck">Trailer Truck</option>
                <option value="Van">Van</option>
                <option value="Bike">Bike</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trips Table */}
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
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Trip ID</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Vehicle</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Origin → Destination</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Driver</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Cargo</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>ETA</th>
                <th style={{ padding: '18px 20px', textAlign: 'left', color: '#4A70A9', fontSize: '14px', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrips.map((trip, index) => {
                const statusStyle = getStatusBadge(trip.status);
                const StatusIcon = statusStyle.icon;
                const VehicleIcon = getVehicleIcon(trip.vehicleType);
                
                return (
                  <tr key={trip.id} style={{
                    borderBottom: index < paginatedTrips.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'background 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#EFECE3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => {
                    setSelectedTrip(trip);
                    setShowTripDetails(true);
                  }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '600', color: '#4A70A9' }}>{trip.tripId}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <VehicleIcon size={16} color="#4A70A9" />
                        <div>
                          <div style={{ fontWeight: '500' }}>{trip.vehicle}</div>
                          <div style={{ fontSize: '12px', color: '#000000', opacity: 0.5 }}>{trip.vehiclePlate}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaMapMarkerAlt size={14} color="#4A70A9" />
                        <span>{trip.origin}</span>
                        <FaArrowRight size={12} color="#8FABD4" />
                        <FaMapMarkerAlt size={14} color="#8FABD4" />
                        <span>{trip.destination}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaUser size={14} color="#4A70A9" />
                        <span>{trip.driver}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaWeightHanging size={14} color="#4A70A9" />
                        <span>{trip.cargoWeight}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#000000', opacity: 0.5 }}>
                        Capacity: {trip.capacity}
                      </div>
                    </td>
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
                        {trip.status}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaClock size={14} color="#8FABD4" />
                        <span>{trip.eta}</span>
                      </div>
                    </td>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrip(trip);
                          setShowTripDetails(true);
                        }}
                        >
                          <FaEye size={16} />
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTrips.length)} of {filteredTrips.length} trips
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

        {/* Trip Lifecycle Info */}
        <div style={{
          marginTop: '30px',
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(74, 112, 169, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaInfoCircle color="#4A70A9" size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#4A70A9' }}>
              Trip Lifecycle
            </h3>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            {[
              { stage: "Draft", icon: FaClock, color: "#6c757d", desc: "Trip created, not yet scheduled" },
              { stage: "Dispatched", icon: FaTruckLoading, color: "#007bff", desc: "Vehicle assigned, ready to depart" },
              { stage: "On Way", icon: FaRoute, color: "#ffc107", desc: "En route to destination" },
              { stage: "Completed", icon: FaFlagCheckered, color: "#28a745", desc: "Successfully delivered" },
              { stage: "Cancelled", icon: FaBan, color: "#dc3545", desc: "Trip terminated" }
            ].map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.stage} style={{
                  flex: 1,
                  minWidth: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '15px',
                  background: '#EFECE3',
                  borderRadius: '12px',
                  position: 'relative'
                }}>
                  {index < 4 && (
                    <div style={{
                      position: 'absolute',
                      right: '-20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#8FABD4',
                      fontSize: '20px',
                      zIndex: 1
                    }}>
                      →
                    </div>
                  )}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: `${stage.color}20`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px'
                  }}>
                    <Icon color={stage.color} size={24} />
                  </div>
                  <h4 style={{ fontWeight: '600', color: stage.color, marginBottom: '5px' }}>{stage.stage}</h4>
                  <p style={{ fontSize: '12px', color: '#000000', opacity: 0.6 }}>{stage.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Trip Modal */}
      {showNewTripModal && (
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
            maxWidth: '700px',
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
                  New Trip
                </h2>
                <p style={{ fontSize: '14px', color: '#000000', opacity: 0.6 }}>
                  Create a new delivery trip
                </p>
              </div>
              <button
                onClick={() => {
                  setShowNewTripModal(false);
                  setValidationError("");
                }}
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
              {validationError && (
                <div style={{
                  background: 'rgba(220, 53, 69, 0.1)',
                  border: '1px solid #dc3545',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#dc3545'
                }}>
                  <FaExclamationTriangle />
                  <span style={{ fontWeight: '500' }}>{validationError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4A70A9',
                    marginBottom: '8px'
                  }}>
                    <FaTruck style={{ marginRight: '8px' }} />
                    Select Vehicle *
                  </label>
                  <select
                    name="vehicleId"
                    value={tripForm.vehicleId}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: '#EFECE3',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      fontSize: '15px',
                      color: '#000000',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                    onBlur={(e) => e.target.style.borderColor = 'transparent'}
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.filter(v => v.status === "Available").map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} - {vehicle.plate} ({vehicle.type}, {vehicle.capacity.toLocaleString()} kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4A70A9',
                    marginBottom: '8px'
                  }}>
                    <FaWeightHanging style={{ marginRight: '8px' }} />
                    Cargo Weight (kg) *
                  </label>
                  <input
                    type="number"
                    name="cargoWeight"
                    value={tripForm.cargoWeight}
                    onChange={handleInputChange}
                    placeholder="Enter weight in kg"
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4A70A9',
                  marginBottom: '8px'
                }}>
                  <FaUser style={{ marginRight: '8px' }} />
                  Select Driver *
                </label>
                <select
                  name="driverId"
                  value={tripForm.driverId}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: '#EFECE3',
                    border: '2px solid transparent',
                    borderRadius: '16px',
                    fontSize: '15px',
                    color: '#000000',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4A70A9'}
                  onBlur={(e) => e.target.style.borderColor = 'transparent'}
                >
                  <option value="">Select a driver</option>
                  {drivers.filter(d => d.status === "Available").map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.type} ({driver.experience})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4A70A9',
                    marginBottom: '8px'
                  }}>
                    <FaMapMarkerAlt style={{ marginRight: '8px' }} />
                    Origin Address *
                  </label>
                  <input
                    type="text"
                    name="origin"
                    value={tripForm.origin}
                    onChange={handleInputChange}
                    placeholder="Enter origin"
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
                    <FaMapMarkerAlt style={{ marginRight: '8px' }} />
                    Destination *
                  </label>
                  <input
                    type="text"
                    name="destination"
                    value={tripForm.destination}
                    onChange={handleInputChange}
                    placeholder="Enter destination"
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4A70A9',
                  marginBottom: '8px'
                }}>
                  <FaGasPump style={{ marginRight: '8px' }} />
                  Estimated Fuel Cost (L)
                </label>
                <input
                  type="number"
                  name="estimatedFuel"
                  value={tripForm.estimatedFuel}
                  onChange={handleInputChange}
                  placeholder="Enter estimated fuel in liters"
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

              <div style={{ marginBottom: '20px' }}>
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
                  value={tripForm.notes}
                  onChange={handleInputChange}
                  placeholder="Any special instructions or notes..."
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
                onClick={() => {
                  setShowNewTripModal(false);
                  setValidationError("");
                }}
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
                onClick={handleCreateTrip}
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
                <FaRoute />
                Confirm & Dispatch Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Details Modal */}
      {showTripDetails && selectedTrip && (
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
                  Trip Details
                </h2>
                <p style={{ fontSize: '14px', color: '#000000', opacity: 0.6 }}>
                  {selectedTrip.tripId}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTripDetails(false);
                  setSelectedTrip(null);
                }}
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

            <div style={{ padding: '30px' }}>
              {/* Status Progress */}
              <div style={{
                background: '#EFECE3',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '25px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <span style={{ fontSize: '14px', color: '#000000', opacity: 0.6 }}>Trip Progress</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#4A70A9' }}>
                    {selectedTrip.completionRate}% Complete
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(143, 171, 212, 0.3)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${selectedTrip.completionRate}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #4A70A9, #8FABD4)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Trip Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '25px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Vehicle</div>
                  <div style={{ fontWeight: '600', color: '#4A70A9' }}>{selectedTrip.vehicle}</div>
                  <div style={{ fontSize: '12px', color: '#000000', opacity: 0.5 }}>{selectedTrip.vehicleType} • {selectedTrip.vehiclePlate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Driver</div>
                  <div style={{ fontWeight: '600', color: '#4A70A9' }}>{selectedTrip.driver}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Origin</div>
                  <div style={{ fontWeight: '600' }}>{selectedTrip.origin}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Destination</div>
                  <div style={{ fontWeight: '600' }}>{selectedTrip.destination}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Cargo Weight</div>
                  <div style={{ fontWeight: '600' }}>{selectedTrip.cargoWeight}</div>
                  <div style={{ fontSize: '12px', color: '#000000', opacity: 0.5 }}>Max: {selectedTrip.capacity}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Distance</div>
                  <div style={{ fontWeight: '600' }}>{selectedTrip.distance}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Start Time</div>
                  <div style={{ fontWeight: '600' }}>{selectedTrip.startTime}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>ETA</div>
                  <div style={{ fontWeight: '600' }}>{selectedTrip.estimatedArrival}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Fuel Estimate</div>
                  <div style={{ fontWeight: '600' }}>{selectedTrip.fuelEstimate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#000000', opacity: 0.5, marginBottom: '5px' }}>Status</div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    background: getStatusBadge(selectedTrip.status).bg,
                    borderRadius: '20px',
                    color: getStatusBadge(selectedTrip.status).color,
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {/* FIXED: Evaluated the icon component correctly inside JSX */}
                    {(() => {
                      const Icon = getStatusBadge(selectedTrip.status).icon;
                      return Icon && <Icon size={12} />;
                    })()}
                    {selectedTrip.status}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedTrip.status !== "Completed" && selectedTrip.status !== "Cancelled" && (
                <div style={{
                  borderTop: '1px solid #EFECE3',
                  paddingTop: '25px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#4A70A9',
                    marginBottom: '15px'
                  }}>
                    Update Trip Status
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {selectedTrip.status === "Draft" && (
                      <button
                        onClick={() => {
                          updateTripStatus(selectedTrip.id, "Dispatched");
                          setShowTripDetails(false);
                        }}
                        style={{
                          padding: '10px 20px',
                          background: '#007bff',
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FaTruckLoading />
                        Dispatch Trip
                      </button>
                    )}
                    {selectedTrip.status === "Dispatched" && (
                      <button
                        onClick={() => {
                          updateTripStatus(selectedTrip.id, "On Way");
                          setShowTripDetails(false);
                        }}
                        style={{
                          padding: '10px 20px',
                          background: '#ffc107',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#000',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FaRoute />
                        Start Trip
                      </button>
                    )}
                    {selectedTrip.status === "On Way" && (
                      <button
                        onClick={() => {
                          updateTripStatus(selectedTrip.id, "Completed");
                          setShowTripDetails(false);
                        }}
                        style={{
                          padding: '10px 20px',
                          background: '#28a745',
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FaFlagCheckered />
                        Complete Trip
                      </button>
                    )}
                    {selectedTrip.status !== "Cancelled" && (
                      <button
                        onClick={() => {
                          updateTripStatus(selectedTrip.id, "Cancelled");
                          setShowTripDetails(false);
                        }}
                        style={{
                          padding: '10px 20px',
                          background: '#dc3545',
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FaBan />
                        Cancel Trip
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for arrow icon
function FaArrowRight(props) {
  return (
    <svg 
      stroke="currentColor" 
      fill="currentColor" 
      strokeWidth="0" 
      viewBox="0 0 448 512" 
      height={props.size || "1em"} 
      width={props.size || "1em"} 
      style={props.style}
    >
      <path d="M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L441 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z"></path>
    </svg>
  );
}