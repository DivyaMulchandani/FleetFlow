import { FaUsers } from "react-icons/fa";

export default function UsersPage() {
  return (
    <div style={{ maxWidth: "1200px", margin: "30px auto", padding: "0 30px" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid rgba(0,0,0,0.08)",
          padding: "30px",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#4A70A9",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FaUsers />
          Users Module
        </h2>
        <p style={{ marginTop: "10px", color: "#374151" }}>
          This route is now navigable. Add role and user administration here.
        </p>
      </div>
    </div>
  );
}
