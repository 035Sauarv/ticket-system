import { useEffect, useState } from "react";
import API from "../api/axios";
import "./AdminDashboard.css";
import TeamManagerModal from "../pages/TeamManagerModal";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
    const navigate = useNavigate();

    const logout = async () => {

        try {
            await API.post("/auth/logout");
        } catch (err) {
            console.log(err);
        }

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
    };
    const [teams, setTeams] = useState([]);
    const [clients, setClients] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);

    const [selectedView, setSelectedView] = useState("dashboard");
    const [dashboardView, setDashboardView] = useState("");

    const [searchTerm, setSearchTerm] = useState("");

    const [teamName, setTeamName] = useState("");
    const [clientName, setClientName] = useState("");

    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const [showManagerModal, setShowManagerModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);

    const [loginLogs, setLoginLogs] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const teamRes = await API.get("/admin/teams");
            const clientRes = await API.get("/clients");
            const pendingRes = await API.get("/auth/pending");
            const userRes = await API.get("/admin/users");
            const logsRes = await API.get("/admin/login-logs");

            setLoginLogs(logsRes.data || []);
            setTeams(teamRes.data || []);
            setClients(clientRes.data || []);
            setPendingUsers(pendingRes.data || []);
            setAllUsers(userRes.data || []);
        } catch (error) {
            console.log(error);
        }
    };

    const addTeam = async () => {
        try {
            await API.post(`/admin/teams?name=${teamName}`);
            setTeamName("");
            setShowTeamModal(false);
            fetchData();
        } catch {
            alert("Team create failed");
        }
    };

    const updateTeam = async () => {
        try {
            await API.put(`/admin/teams/${selectedId}?name=${teamName}`);

            setTeamName("");
            setShowTeamModal(false);
            setEditMode(false);
            fetchData();
        } catch {
            alert("Update failed");
        }
    };

    

    const openEditTeam = (team) => {
        setEditMode(true);
        setSelectedId(team.id);
        setTeamName(team.name);
        setShowTeamModal(true);
    };

    const addClient = async () => {
        try {
            await API.post("/clients/", {
                name: clientName,
            });

            setClientName("");
            setShowClientModal(false);
            fetchData();
        } catch {
            alert("Client create failed");
        }
    };

    const updateClient = async () => {
        try {
            await API.put(`/clients/${selectedId}`, {
                name: clientName,
            });

            setClientName("");
            setShowClientModal(false);
            setEditMode(false);
            fetchData();
        } catch {
            alert("Update failed");
        }
    };

    const deleteClient = async (id) => {
        try {
            await API.delete(`/clients/${id}`);
            fetchData();
        } catch {
            alert("Delete failed");
        }
    };

    const openEditClient = (client) => {
        setEditMode(true);
        setSelectedId(client.id);
        setClientName(client.name);
        setShowClientModal(true);
    };

    const approveUser = async (id) => {
        try {
            await API.put(`/auth/approve/${id}`);
            fetchData();
        } catch {
            alert("Approval failed");
        }
    };

    const rejectUser = async (id) => {
        try {
            await API.put(`/auth/reject/${id}`);
            fetchData();
        } catch {
            alert("Reject failed");
        }
    };

    const openManagerAssign = (team) => {
        setSelectedTeam(team);
        setShowManagerModal(true);
    };

    const deleteUser = async (id) => {
        try {
            await API.delete(`/admin/users/${id}`);
            fetchData();
        } catch (err) {
            alert(
                err.response?.data?.detail || "Delete failed"
            );
        }
    };
    const downloadLogs = async () => {

        if (!startDate || !endDate) {
            alert("Select date range");
            return;
        }

        try {

            const response = await API.get(
                `/admin/login-logs/export?start_date=${startDate}&end_date=${endDate}`,
                {
                    responseType: "blob"
                }
            );

            const url = window.URL.createObjectURL(
                new Blob([response.data])
            );

            const link = document.createElement("a");

            link.href = url;

            link.setAttribute(
                "download",
                `login_logs_${startDate}_to_${endDate}.xlsx`
            );

            document.body.appendChild(link);

            link.click();

        } catch (err) {

            alert(
                err.response?.data?.detail ||
                "Download failed"
            );
        }
    };
    return (
        <div className="admin-layout">
            <div className="sidebar">
                <h2 className="logo">Admin Panel</h2>

                <ul>
                    <li onClick={() => setSelectedView("dashboard")}>Dashboard</li>
                    <li onClick={() => setSelectedView("teams")}>Teams</li>
                    <li onClick={() => setSelectedView("clients")}>Clients</li>
                    <li onClick={() => setSelectedView("allUsers")}>All Users</li>
                    <li onClick={() => setSelectedView("pendingUsers")}>Pending Users</li>
                    <li onClick={() => setSelectedView("loginLogs")}>
                        Login Logs
                    </li>
                    <button className="logout-btn" onClick={logout}>
                        Logout
                    </button>
                </ul>
            </div>

            <div className="content">
                <h1>Admin Dashboard</h1>

                {selectedView === "dashboard" && (
                    <>
                        <div className="cards">

                            <div
                                className="card clickable"
                                onClick={() => setDashboardView("teams")}
                            >
                                <h3>Total Teams</h3>
                                <p>{teams.length}</p>
                            </div>

                            <div
                                className="card clickable"
                                onClick={() => setDashboardView("clients")}
                            >
                                <h3>Total Clients</h3>
                                <p>{clients.length}</p>
                            </div>

                            <div
                                className="card clickable"
                                onClick={() => setDashboardView("users")}
                            >
                                <h3>Total Users</h3>
                                <p>{allUsers.length}</p>
                            </div>

                            <div
                                className="card clickable"
                                onClick={() => setDashboardView("pending")}
                            >
                                <h3>Pending Users</h3>
                                <p>{pendingUsers.length}</p>
                            </div>

                        </div>

                        <div className="dashboard-table">

                            {/* Teams */}
                            {dashboardView === "teams" && (
                                <>
                                    <h2>Teams List</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Team Name</th>
                                                <th>Manager</th>
                                                <th>Total Members</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {teams.map((team) => (
                                                <tr key={team.id}>
                                                    <td>{team.id}</td>
                                                    <td>{team.name}</td>
                                                    <td>{team.manager_name}</td>
                                                    <td>{team.member_count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {/* Clients */}
                            {dashboardView === "clients" && (
                                <>
                                    <h2>Clients List</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Client Name</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {clients.map((client) => (
                                                <tr key={client.id}>
                                                    <td>{client.id}</td>
                                                    <td>{client.name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {/* Users */}
                            {dashboardView === "users" && (
                                <>
                                    <h2>Users List</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Team</th>
                                                <th>Manager</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {allUsers.map((user) => (
                                                <tr key={user.id}>
                                                    <td>{user.id}</td>
                                                    <td>{user.name}</td>
                                                    <td>{user.email}</td>
                                                    <td>{user.role}</td>
                                                    <td>{user.team_name}</td>
                                                    <td>{user.manager_name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {/* Pending Users */}
                            {dashboardView === "pending" && (
                                <>
                                    <h2>Pending Users</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {pendingUsers.map((user) => (
                                                <tr key={user.id}>
                                                    <td>{user.name}</td>
                                                    <td>{user.email}</td>
                                                    <td>{user.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                        </div>
                    </>
                )}

                {selectedView === "teams" && (
                    <div className="crud-section">
                        <div className="top-bar">
                            <input
                                type="text"
                                placeholder="Search Team"
                                className="search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />

                            <button
                                className="add-btn"
                                onClick={() => {
                                    setEditMode(false);
                                    setTeamName("");
                                    setShowTeamModal(true);
                                }}
                            >
                                + Add Team
                            </button>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Manager</th>
                                    <th>Members</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {teams
                                    .filter((team) =>
                                        team.name.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((team) => (
                                        <tr key={team.id}>
                                            <td>{team.id}</td>
                                            <td>{team.name}</td>
                                            <td>{team.manager_name}</td>
                                            <td>{team.member_count}</td>

                                            <td className="action-cell">

                                                <button
                                                    className="edit-btn"
                                                    onClick={() => openEditTeam(team)}
                                                >
                                                    ✏️
                                                </button>

                                                {team.manager_name === "Not Assigned" && (
                                                    <button
                                                        className="assign-btn"
                                                        onClick={() => openManagerAssign(team)}
                                                    >
                                                        Assign
                                                    </button>
                                                )}

                                                {team.manager_name !== "Not Assigned" && (
                                                    <button
                                                        className="assign-btn"
                                                        onClick={() => openManagerAssign(team)}
                                                    >
                                                        Update Manager
                                                    </button>
                                                )}

                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedView === "clients" && (
                    <div className="crud-section">
                        <div className="top-bar">
                            <input
                                type="text"
                                placeholder="Search Client"
                                className="search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />

                            <button
                                className="add-btn"
                                onClick={() => {
                                    setEditMode(false);
                                    setClientName("");
                                    setShowClientModal(true);
                                }}
                            >
                                + Add Client
                            </button>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {clients
                                    .filter((client) =>
                                        client.name.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((client) => (
                                        <tr key={client.id}>
                                            <td>{client.id}</td>
                                            <td>{client.name}</td>

                                            <td className="action-cell">
                                                <button
                                                    className="edit-btn"
                                                    onClick={() => openEditClient(client)}
                                                >
                                                    ✏️
                                                </button>

                                                <button
                                                    className="delete-btn"
                                                    onClick={() => deleteClient(client.id)}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedView === "allUsers" && (
                    <div className="crud-section">
                        <div className="top-bar">
                            <input
                                type="text"
                                placeholder="Search User"
                                className="search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Team</th>
                                    <th>Manager</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {allUsers
                                    .filter((user) =>
                                        user.name.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.id}</td>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.role}</td>
                                            <td>{user.team_name}</td>
                                            <td>{user.manager_name}</td>

                                            <td className="action-cell">
                                                <button className="edit-btn">✏️</button>
                                                {user.role !== "ADMIN" && (
                                                    <button
                                                        className="delete-btn"
                                                        onClick={() => deleteUser(user.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedView === "pendingUsers" && (
                    <div className="crud-section">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {pendingUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{user.status}</td>

                                        <td className="action-cell">
                                            <button
                                                className="approve-btn"
                                                onClick={() => approveUser(user.id)}
                                            >
                                                Approve
                                            </button>

                                            <button
                                                className="reject-btn"
                                                onClick={() => rejectUser(user.id)}
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showTeamModal && (
                    <div className="modal-overlay">
                        <div className="modal-box">
                            <h2>{editMode ? "Update Team" : "Add Team"}</h2>

                            <input
                                type="text"
                                placeholder="Team Name"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                            />

                            <div className="modal-buttons">
                                <button onClick={editMode ? updateTeam : addTeam}>
                                    {editMode ? "Update" : "Save"}
                                </button>

                                <button onClick={() => setShowTeamModal(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showClientModal && (
                    <div className="modal-overlay">
                        <div className="modal-box">
                            <h2>{editMode ? "Update Client" : "Add Client"}</h2>

                            <input
                                type="text"
                                placeholder="Client Name"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                            />

                            <div className="modal-buttons">
                                <button onClick={editMode ? updateClient : addClient}>
                                    {editMode ? "Update" : "Save"}
                                </button>

                                <button onClick={() => setShowClientModal(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Team Manager Modal */}
                <TeamManagerModal
                    open={showManagerModal}
                    onClose={() => setShowManagerModal(false)}
                    selectedTeam={selectedTeam}
                    refreshData={fetchData}
                />

                {selectedView === "loginLogs" && (
                    <div className="crud-section">

                        <h2>User Login Logs</h2>

                        <div className="top-bar">

                            <div style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center"
                            }}>

                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />

                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />

                                <button
                                    className="add-btn"
                                    onClick={downloadLogs}
                                >
                                    Download Excel
                                </button>

                            </div>

                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>IP Address</th>
                                    <th>Login</th>
                                    <th>Logout</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loginLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td>{log.user_name}</td>
                                        <td>{log.email}</td>
                                        <td>{log.role}</td>
                                        <td>{log.ip_address}</td>
                                        <td>
                                            {new Date(log.login_time).toLocaleString()}
                                        </td>

                                        <td>
                                            {log.logout_time
                                                ? new Date(log.logout_time).toLocaleString()
                                                : "Still Active"}
                                        </td>

                                        <td>{log.duration || "-"}</td>

                                        <td>{log.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
        
    );
}

