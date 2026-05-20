import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./ManagerDashboard.css";

export default function ManagerDashboard() {
    const navigate = useNavigate();

    const [selectedView, setSelectedView] = useState("dashboard");
    const [dashboardView, setDashboardView] = useState("");

    const [teamMembers, setTeamMembers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [opsTickets, setOpsTickets] = useState([]);

    const [search, setSearch] = useState("");

    const [showTicketModal, setShowTicketModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedMember, setSelectedMember] = useState("");

    const [ticketForm, setTicketForm] = useState({
        title: "",
        description: "",
        priority: "MEDIUM",
        assigned_to: "",
        client_id: "",
    });

    const loggedUser = JSON.parse(localStorage.getItem("user"));

    const isOperationalManager =
        loggedUser?.team === "Operational Support";

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {

            const loggedUser = JSON.parse(localStorage.getItem("user"));

            const isOpsManager =
                loggedUser?.team === "Operational Support";

            const requests = [
                API.get("/manager/pending"),
                API.get("/manager/users"),
                API.get("/manager/clients"),
                API.get("/tickets/my-raised"),
            ];

            if (isOpsManager) {
                requests.push(API.get("/tickets/ops-team-tickets"));
            }

            const responses = await Promise.all(requests);

            const pendingRes = responses[0];
            const teamRes = responses[1];
            const clientsRes = responses[2];
            const ticketsRes = responses[3];

            setPendingUsers(pendingRes.data || []);
            setTeamMembers(teamRes.data || []);
            setClients(clientsRes.data || []);
            setTickets(ticketsRes.data || []);

            if (isOpsManager) {
                const opsRes = responses[4];
                setOpsTickets(opsRes.data || []);
            }

        } catch (err) {
            console.log(err);
        }
    };

    const approveUser = async (id) => {
        try {
            await API.put(`/manager/approve/${id}`);
            fetchData();
        } catch (err) {
            console.log(err);
            alert(err.response?.data?.detail || "Approval failed");
        }
    };

    const rejectUser = async (id) => {
        try {
            await API.put(`/manager/reject/${id}`);
            fetchData();
        } catch (err) {
            console.log(err);
            alert(err.response?.data?.detail || "Reject failed");
        }
    };

    const deleteUser = async (id) => {
        try {
            await API.delete(`/manager/users/${id}`);
            fetchData();
        } catch (err) {
            console.log(err);
            alert(err.response?.data?.detail || "Delete failed");
        }
    };


    const createTicket = async () => {
        try {

            const formData = new FormData();

            formData.append("title", ticketForm.title);
            formData.append("description", ticketForm.description);
            formData.append("priority", ticketForm.priority);
            formData.append("client_id", ticketForm.client_id);

            await API.post("/tickets/create", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            setTicketForm({
                title: "",
                description: "",
                priority: "MEDIUM",
                client_id: "",
            });

            setShowTicketModal(false);

            fetchData();

        } catch (err) {

            console.log(err);

            alert(
                err.response?.data?.detail ||
                "Ticket create failed"
            );
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const openAssignModal = (client) => {
        setSelectedClient(client);
        setSelectedMember(client.assigned_member_id || "");
        setShowAssignModal(true);
    };

    const assignClient = async () => {
        try {

            await API.put(
                `/manager/client/${selectedClient.id}/assign`,
                null,
                {
                    params: {
                        member_id: selectedMember
                    }
                }
            );

            alert("Client assigned successfully");

            setShowAssignModal(false);

            fetchData();

        } catch (err) {

            console.log(err);

            alert(
                err.response?.data?.detail ||
                "Assignment failed"
            );
        }
    };

    const downloadFile = async (ticketId) => {
        try {

            const response = await API.get(
                `/tickets/${ticketId}/download`,
                {
                    responseType: "blob"
                }
            );

            const url = window.URL.createObjectURL(
                new Blob([response.data])
            );

            const link = document.createElement("a");

            link.href = url;
            link.setAttribute("download", `ticket_${ticketId}.xlsx`);

            document.body.appendChild(link);

            link.click();

            link.remove();

        } catch (err) {

            console.log(err);

            alert("Download failed");
        }
    };
    return (
        <div className="manager-layout">

            {/* Sidebar */}
            <div className="manager-sidebar">
                <h2 className="manager-logo">Manager Panel</h2>

                <ul>
                    <li onClick={() => setSelectedView("dashboard")}>
                        Dashboard
                    </li>

                    <li onClick={() => setSelectedView("team")}>
                        Team Members
                    </li>

                    <li onClick={() => setSelectedView("pending")}>
                        Pending Users
                    </li>

                    <li onClick={() => setSelectedView("clients")}>
                        Clients
                    </li>

                    <li onClick={() => setSelectedView("tickets")}>
                        Tickets
                    </li>

                    <li onClick={() => navigate("/chat")}>
                        Chat
                    </li>

                    <button className="logout-btn" onClick={logout}>
                        Logout
                    </button>
                </ul>
            </div>

            {/* Content */}
            <div className="manager-content">

                <h1>Manager Dashboard</h1>

                {/* Dashboard */}
                {selectedView === "dashboard" && (
                    <>
                        <div className="manager-cards">

                            <div
                                className="manager-card clickable"
                                onClick={() => setDashboardView("team")}
                            >
                                <h3>Total Team Members</h3>
                                <p>{teamMembers.length}</p>
                            </div>

                            <div
                                className="manager-card clickable"
                                onClick={() => setDashboardView("pending")}
                            >
                                <h3>Pending Users</h3>
                                <p>{pendingUsers.length}</p>
                            </div>

                            <div
                                className="manager-card clickable"
                                onClick={() => setDashboardView("clients")}
                            >
                                <h3>Total Clients</h3>
                                <p>{clients.length}</p>
                            </div>

                            <div
                                className="manager-card clickable"
                                onClick={() => setDashboardView("tickets")}
                            >
                                <h3>Open Tickets</h3>

                                <p>
                                    {
                                        (isOperationalManager ? opsTickets : tickets)
                                            .filter((ticket) => ticket.status === "OPEN")
                                            .length
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="dashboard-table">

                            {/* Team Members */}
                            {dashboardView === "team" && (
                                <>
                                    <h2>Team Members</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {teamMembers.map((member) => (
                                                <tr key={member.id}>
                                                    <td>{member.id}</td>
                                                    <td>{member.name}</td>
                                                    <td>{member.email}</td>
                                                    <td>{member.status}</td>
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

                            {/* Clients */}
                            {dashboardView === "clients" && (
                                <>
                                    <h2>Clients</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Client Name</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clients.map((client) => (
                                                <tr key={client.id}>
                                                    <td>{client.id}</td>
                                                    <td>{client.name}</td>
                                                    <td>{client.is_active ? "Active" : "Inactive"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {/* Tickets */}
                            {/* Tickets */}
                            {dashboardView === "tickets" && (
                                <>
                                    <h2>Open Tickets</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Title</th>
                                                <th>Priority</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(isOperationalManager ? opsTickets : tickets)
                                                .filter((ticket) => ticket.status === "OPEN")
                                                .map((ticket) => (
                                                    <tr key={ticket.id}>
                                                        <td>{ticket.id}</td>
                                                        <td>{ticket.title}</td>
                                                        <td>{ticket.priority}</td>
                                                        <td>{ticket.status}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                        </div>
                    </>
                )}

                {/* Team Members */}
                {selectedView === "team" && (
                    <div className="table-box">

                        <div className="top-bar">
                            <input
                                type="text"
                                placeholder="Search Member"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {teamMembers
                                    .filter((u) =>
                                        u.name.toLowerCase().includes(search.toLowerCase())
                                    )
                                    .map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.id}</td>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.status}</td>

                                            <td>
                                                <button
                                                    className="reject-btn"
                                                    onClick={() => deleteUser(user.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>

                    </div>
                )}
                {/* Pending */}
                {selectedView === "pending" && (
                    <div className="table-box">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {pendingUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>

                                        <td>
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

                {/* Clients */}
                {selectedView === "clients" && (
                    <div className="table-box">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Client Name</th>
                                    <th>Status</th>
                                    <th>Assigned Team Member</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {clients.map((client) => {

                                    const assignedMember = teamMembers.find(
                                        (m) => m.id === client.assigned_member_id
                                    );

                                    // get logged manager
                                    const loggedUser = JSON.parse(localStorage.getItem("user"));

                                    // OPS manager check
                                    const isOpsManager =
                                        loggedUser?.team === "Operational Support" ||
                                        loggedUser?.team === "Operational Support";

                                    return (
                                        <tr key={client.id}>
                                            <td>{client.id}</td>
                                            <td>{client.name}</td>
                                            <td>
                                                {client.is_active ? "Active" : "Inactive"}
                                            </td>

                                            <td>
                                                {assignedMember
                                                    ? assignedMember.name
                                                    : "Not Assigned"}
                                            </td>

                                            <td>
                                                {isOpsManager ? (
                                                    <button
                                                        className="assign-btn"
                                                        onClick={() => {
                                                            setSelectedClient(client);
                                                            setShowAssignModal(true);
                                                        }}
                                                    >
                                                        {assignedMember
                                                            ? "Update Assign"
                                                            : "Assign"}
                                                    </button>
                                                ) : (
                                                    "No Access"
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {showAssignModal && (
                    <div className="modal-overlay">
                        <div className="modal-box">
                            <h2>Assign Team Member</h2>

                            <select
                                value={selectedMember}
                                onChange={(e) => setSelectedMember(e.target.value)}
                            >
                                <option value="">Select Team Member</option>

                                {teamMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>

                            <div className="modal-buttons">
                                <button
                                    onClick={async () => {
                                        try {
                                            await API.put(
                                                `/manager/client/${selectedClient.id}/assign`,
                                                null,
                                                {
                                                    params: {
                                                        member_id: selectedMember,
                                                    },
                                                }
                                            );

                                            setShowAssignModal(false);
                                            fetchData();
                                        } catch (err) {
                                            console.log(err);
                                            alert("Assignment failed");
                                        }
                                    }}
                                >
                                    Save
                                </button>

                                <button onClick={() => setShowAssignModal(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedView === "tickets" && (
                    <div className="table-box">

                        <div className="top-bar">

                            {!isOperationalManager && (
                                <button
                                    className="add-btn"
                                    onClick={() => setShowTicketModal(true)}
                                >
                                    + Create Ticket
                                </button>
                            )}

                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Assigned To</th>
                                    <th>Excel File</th>
                                </tr>
                            </thead>

                            <tbody>

                                {(isOperationalManager ? opsTickets : tickets).map((ticket) => (

                                    <tr key={ticket.id}>
                                        <td>{ticket.id}</td>
                                        <td>{ticket.title}</td>
                                        <td>{ticket.priority}</td>
                                        <td>{ticket.status}</td>
                                        <td>{ticket.assigned_to || "-"}</td>

                                        <td>
                                            {ticket.status === "RESOLVED" && ticket.excel_file ? (
                                                <button
                                                    className="approve-btn"
                                                    onClick={() => downloadFile(ticket.id)}
                                                >
                                                    Download
                                                </button>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                    </tr>

                                ))}

                            </tbody>
                        </table>

                    </div>
                )}
                {/* Ticket Modal */}
                {showTicketModal && !isOperationalManager && (
                    <div className="modal-overlay">
                        <div className="modal-box">

                            <h2>Create Ticket</h2>

                            <input
                                type="text"
                                placeholder="Title"
                                value={ticketForm.title}
                                onChange={(e) =>
                                    setTicketForm({
                                        ...ticketForm,
                                        title: e.target.value,
                                    })
                                }
                            />

                            <textarea
                                placeholder="Description"
                                value={ticketForm.description}
                                onChange={(e) =>
                                    setTicketForm({
                                        ...ticketForm,
                                        description: e.target.value,
                                    })
                                }
                            />

                            <select
                                value={ticketForm.priority}
                                onChange={(e) =>
                                    setTicketForm({
                                        ...ticketForm,
                                        priority: e.target.value,
                                    })
                                }
                            >
                                <option value="LOW">LOW</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="HIGH">HIGH</option>
                            </select>

                            <select
                                value={ticketForm.client_id}
                                onChange={(e) =>
                                    setTicketForm({
                                        ...ticketForm,
                                        client_id: e.target.value,
                                    })
                                }
                            >
                                <option value="">Select Client</option>

                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={ticketForm.assigned_to}
                                onChange={(e) =>
                                    setTicketForm({
                                        ...ticketForm,
                                        assigned_to: e.target.value,
                                    })
                                }
                            >
                                <option value="">Assign Team Member</option>

                                {teamMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>

                            <div className="modal-buttons">
                                <button onClick={createTicket}>
                                    Save
                                </button>

                                <button
                                    onClick={() => setShowTicketModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}