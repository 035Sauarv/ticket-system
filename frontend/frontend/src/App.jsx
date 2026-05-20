import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Register from "./pages/Register";
import ManagerDashboard from "./pages/ManagerDashboard";
import TeamMemberDashboard from "./pages/TeamMemberDashboard";
import Chat from "./pages/Chat";
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/manager" element={<ManagerDashboard />} />
                <Route
                    path="/team-member-dashboard"
                    element={<TeamMemberDashboard />}
                />
                <Route path="/chat" element={<Chat />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;