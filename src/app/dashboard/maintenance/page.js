"use client";

import { useMemo, useState } from "react";
import {
  FaWrench,
  FaPlus,
  FaSearch,
  FaFilter,
  FaDownload,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaDatabase,
  FaTruck,
} from "react-icons/fa";

const initialLogs = [
  {
    id: "321",
    vehicle: "TATA LPT 1613",
    issue: "Engine Issue",
    date: "2024-02-20",
    cost: "Rs. 10,000",
    status: "new",
  },
  {
    id: "322",
    vehicle: "Volvo FH16",
    issue: "Oil Change",
    date: "2024-02-18",
    cost: "Rs. 5,000",
    status: "in-progress",
  },
  {
    id: "323",
    vehicle: "Ashok Leyland 1612",
    issue: "Tire Replacement",
    date: "2024-02-15",
    cost: "Rs. 15,000",
    status: "completed",
  },
];

export default function MaintenancePage() {
  const [maintenanceLogs, setMaintenanceLogs] = useState(initialLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    vehicle: "",
    issue: "",
    date: "",
  });

  const inShopCount = useMemo(
    () =>
      maintenanceLogs.filter(
        (log) => log.status === "new" || log.status === "in-progress"
      ).length,
    [maintenanceLogs]
  );

  const filteredLogs = useMemo(
    () =>
      maintenanceLogs.filter(
        (log) =>
          log.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.id.includes(searchTerm)
      ),
    [maintenanceLogs, searchTerm]
  );

  const getStatusStyle = (status) => {
    if (status === "in-progress") {
      return { bg: "rgba(255, 193, 7, 0.15)", color: "#b8860b" };
    }
    if (status === "completed") {
      return { bg: "rgba(40, 167, 69, 0.15)", color: "#1f7a3d" };
    }
    return { bg: "rgba(74, 112, 169, 0.15)", color: "#4A70A9" };
  };

  const handleAddLog = () => {
    if (!formData.vehicle || !formData.issue || !formData.date) return;

    const newLog = {
      id: Date.now().toString(),
      vehicle: formData.vehicle,
      issue: formData.issue,
      date: formData.date,
      cost: "Rs. 0",
      status: "new",
    };

    setMaintenanceLogs((prev) => [newLog, ...prev]);
    setFormData({ vehicle: "", issue: "", date: "" });
  };

  return (
    <div
      style={{
        maxWidth: "1400px",
        margin: "30px auto",
        padding: "0 30px 30px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#4A70A9",
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FaWrench />
            Maintenance & Service Logs
          </h2>
          <p style={{ color: "#000000", opacity: 0.65 }}>
            Manage vehicle maintenance and service records
          </p>
        </div>
        <div
          style={{
            background: "#8FABD4",
            color: "#132238",
            padding: "10px 14px",
            borderRadius: "12px",
            fontWeight: "600",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaDatabase />
          {maintenanceLogs.length} logs • {inShopCount} in shop
        </div>
      </div>

      <div
        style={{
          background: "#fff3cd",
          border: "1px solid #f0d68a",
          borderRadius: "14px",
          padding: "18px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FaExclamationTriangle color="#a16c00" />
          <span style={{ color: "#5d4500", fontWeight: "600" }}>
            Auto-hide rule: Vehicles &quot;In Shop&quot; are hidden from dispatch.
          </span>
        </div>
        <span
          style={{
            background: "#f9e29d",
            color: "#6b5208",
            borderRadius: "999px",
            padding: "5px 12px",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          {inShopCount} in shop now
        </span>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <h3
          style={{
            fontSize: "17px",
            color: "#4A70A9",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaPlus />
          New Service Entry
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 1.5fr auto",
            gap: "10px",
          }}
        >
          <input
            type="text"
            placeholder="Vehicle"
            value={formData.vehicle}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, vehicle: e.target.value }))
            }
            style={fieldStyle}
          />
          <input
            type="text"
            placeholder="Issue/Service"
            value={formData.issue}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, issue: e.target.value }))
            }
            style={fieldStyle}
          />
          <input
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, date: e.target.value }))
            }
            style={fieldStyle}
          />
          <button onClick={handleAddLog} style={primaryButtonStyle}>
            <FaPlus />
            Add Log
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "20px",
          border: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
          <FaSearch
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#8FABD4",
            }}
          />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...fieldStyle, paddingLeft: "36px" }}
          />
        </div>
        <button style={secondaryButtonStyle}>
          <FaFilter />
          Filter
        </button>
        <button style={secondaryButtonStyle}>
          <FaDownload />
          Export
        </button>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#EFECE3" }}>
                {["Log ID", "Vehicle", "Issue/Service", "Date", "Cost", "Status", "Actions"].map(
                  (head) => (
                    <th
                      key={head}
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        fontSize: "13px",
                        color: "#4A70A9",
                        borderBottom: "1px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      {head}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "44px 20px",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    <FaDatabase
                      style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.4 }}
                    />
                    <div>No logs yet</div>
                  </td>
                </tr>
              )}
              {filteredLogs.map((log) => {
                const status = getStatusStyle(log.status);
                return (
                  <tr key={log.id}>
                    <td style={cellStyle}>{log.id}</td>
                    <td style={cellStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <FaTruck color="#8FABD4" />
                        {log.vehicle}
                      </span>
                    </td>
                    <td style={cellStyle}>{log.issue}</td>
                    <td style={cellStyle}>{log.date}</td>
                    <td style={cellStyle}>{log.cost}</td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          background: status.bg,
                          color: status.color,
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button style={iconButtonStyle}>
                          <FaEdit />
                        </button>
                        <button style={iconButtonStyle}>
                          <FaTrash />
                        </button>
                        <button style={iconButtonStyle}>
                          <FaCheckCircle />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d4d4d4",
  borderRadius: "10px",
  fontSize: "14px",
  background: "#fff",
};

const primaryButtonStyle = {
  background: "#4A70A9",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "600",
};

const secondaryButtonStyle = {
  background: "#fff",
  color: "#1f2937",
  border: "1px solid #d4d4d4",
  borderRadius: "10px",
  padding: "10px 12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "500",
};

const cellStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  fontSize: "14px",
  color: "#111827",
};

const iconButtonStyle = {
  background: "transparent",
  border: "1px solid #d4d4d4",
  borderRadius: "8px",
  padding: "6px",
  cursor: "pointer",
  color: "#6b7280",
};
