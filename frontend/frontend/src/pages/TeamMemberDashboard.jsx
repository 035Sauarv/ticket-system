import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./ManagerDashboard.css";

export default function TeamMemberDashboard() {

    const navigate = useNavigate();

    const [selectedView, setSelectedView] = useState("dashboard");
    const [dashboardView, setDashboardView] = useState("");

    const [dashboard, setDashboard] = useState({});
    const [clients, setClients] = useState([]);
    const [tickets, setTickets] = useState([]);

    const [showResolveModal, setShowResolveModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [excelFile, setExcelFile] = useState(null);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);

    const [ticketForm, setTicketForm] = useState({
        title: "",
        description: "",
        priority: "MEDIUM",
        client_id: ""
    });
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {

        try {

            const [dashboardRes, clientsRes, ticketsRes, membersRes] =
                await Promise.all([
                    API.get("/team-member/dashboard"),
                    API.get("/team-member/clients"),
                    API.get("/team-member/tickets"),
                    API.get("/team-member/members")

                ]);

            setDashboard(dashboardRes.data);
            setTeamMembers(membersRes.data);
            console.log("CLIENTS DATA", clientsRes.data);
            setClients(clientsRes.data);
            setTickets(ticketsRes.data);

        } catch (err) {
            console.log(err);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const resolveTicket = async () => {

        try {

            const formData = new FormData();

            formData.append("excel_file", excelFile);

            await API.put(
                `/tickets/${selectedTicket.id}/resolve`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            setShowResolveModal(false);

            fetchData();

        } catch (err) {

            console.log(err);

            alert("Resolve failed");
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

            setShowTicketModal(false);

            setTicketForm({
                title: "",
                description: "",
                priority: "MEDIUM",
                client_id: ""
            });

            fetchData();

        } catch (err) {

            console.log(err);

            alert(
                err.response?.data?.detail ||
                "Ticket create failed"
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

                <h2 className="manager-logo">
                    Team Member Panel
                </h2>

                <ul>

                    <li onClick={() => setSelectedView("dashboard")}>
                        Dashboard
                    </li>

                    <li onClick={() => setSelectedView("clients")}>
                        Clients
                    </li>

                    <li onClick={() => setSelectedView("tickets")}>
                        Tickets
                    </li>

                    <li onClick={() => setSelectedView("members")}>
                        Team Members
                    </li>
                    <li onClick={() => navigate("/chat")}>
                        Chat
                    </li>

                    <button
                        className="logout-btn"
                        onClick={logout}
                    >
                        Logout
                    </button>

                </ul>

            </div>

            {/* Content */}
            <div className="manager-content">


                {/* Dashboard */}
                {selectedView === "dashboard" && (
                    <>

                        <div className="manager-cards">

                            <div
                                className="manager-card clickable"
                                onClick={() => setDashboardView("clients")}
                            >
                                <h3>Total Clients</h3>
                                <p>{dashboard.clients}</p>
                            </div>

                            <div
                                className="manager-card clickable"
                                onClick={() => setDashboardView("tickets")}
                            >
                                <h3>Open Tickets</h3>
                                <p>{dashboard.open_tickets}</p>
                            </div>

                            <div
                                className="manager-card clickable"
                                onClick={() => setDashboardView("members")}
                            >
                                <h3>Team Members</h3>
                                <p>{dashboard.team_members}</p>
                            </div>

                        </div>

                        <div className="dashboard-table">

                            {dashboardView === "clients" && (
                                <>
                                    <h2>Clients</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {clients.map((client) => (
                                                <tr key={client.id}>
                                                    <td>{client.id}</td>
                                                    <td>{client.name}</td>
                                                    <td>
                                                        {client.is_active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {dashboardView === "tickets" && (
                                <>
                                    <h2>Assigned Tickets</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Title</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {tickets.map((ticket) => (
                                                <tr key={ticket.id}>
                                                    <td>{ticket.id}</td>
                                                    <td>{ticket.title}</td>
                                                    <td>{ticket.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {dashboardView === "members" && (
                                <>
                                    <h2>Team Members</h2>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Email</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {teamMembers.map((member) => (
                                                <tr key={member.id}>
                                                    <td>{member.id}</td>
                                                    <td>{member.name}</td>
                                                    <td>{member.email}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                        </div>

                    </>
                )}

                {/* Clients */}
                {selectedView === "clients" && (
                    <div className="table-box">

                        <table>

                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {clients.map((client) => (
                                    <tr key={client.id}>
                                        <td>{client.id}</td>
                                        <td>{client.name}</td>
                                        <td>
                                            {client.is_active
                                                ? "Active"
                                                : "Inactive"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>
                )}

                {/* Tickets */}
                {/* Tickets */}
                {selectedView === "tickets" && (
                    <div className="table-box">

                        <div className="top-bar">

                            {/* Create Ticket Button */}
                            {JSON.parse(localStorage.getItem("user"))?.team !== "Operational Support" && (
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
                                    <th>Client</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                    <th>Excel File</th>
                                </tr>
                            </thead>

                            <tbody>
                                {tickets.map((ticket) => (

                                    <tr key={ticket.id}>

                                        <td>{ticket.id}</td>
                                        <td>{ticket.title}</td>
                                        <td>{ticket.client_name}</td>
                                        <td>{ticket.priority}</td>
                                        <td>{ticket.status}</td>

                                        <td>

                                            {ticket.status === "OPEN" &&
                                                ticket.is_assigned && (

                                                    <button
                                                        className="approve-btn"
                                                        onClick={() => {
                                                            setSelectedTicket(ticket);
                                                            setShowResolveModal(true);
                                                        }}
                                                    >
                                                        Resolve
                                                    </button>

                                                )
                                            }

                                            {ticket.is_requester &&
                                                ticket.status === "RESOLVED" && (
                                                    <span>Resolved</span>
                                                )
                                            }

                                        </td>

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

                {selectedView === "members" && (
                    <div className="table-box">

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                </tr>
                            </thead>

                            <tbody>
                                {teamMembers.map((member) => (
                                    <tr key={member.id}>
                                        <td>{member.id}</td>
                                        <td>{member.name}</td>
                                        <td>{member.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                    </div>
                )}
                {/* Resolve Modal */}
                {showResolveModal && (

                    <div className="modal-overlay">

                        <div className="modal-box">

                            <h2>Resolve Ticket</h2>

                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) =>
                                    setExcelFile(e.target.files[0])
                                }
                            />

                            <div className="modal-buttons">

                                <button onClick={resolveTicket}>
                                    Upload
                                </button>

                                <button
                                    onClick={() =>
                                        setShowResolveModal(false)
                                    }
                                >
                                    Cancel
                                </button>

                            </div>

                        </div>

                    </div>

                )}
                {/* Create Ticket Modal */}
                {showTicketModal && (

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
                                        title: e.target.value
                                    })
                                }
                            />

                            <textarea
                                placeholder="Description"
                                value={ticketForm.description}
                                onChange={(e) =>
                                    setTicketForm({
                                        ...ticketForm,
                                        description: e.target.value
                                    })
                                }
                            />

                            <select
                                value={ticketForm.priority}
                                onChange={(e) =>
                                    setTicketForm({
                                        ...ticketForm,
                                        priority: e.target.value
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
                                        client_id: e.target.value
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