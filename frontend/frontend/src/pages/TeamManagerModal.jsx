import { useEffect, useState } from "react";
import API from "../api/axios";

export default function TeamManagerModal({
    open,
    onClose,
    selectedTeam,
    refreshData
}) {
    const [managers, setManagers] = useState([]);
    const [selectedManager, setSelectedManager] = useState("");

    useEffect(() => {
        if (open) {
            fetchManagers();
        }
    }, [open]);

    const fetchManagers = async () => {
        try {
            const res = await API.get("/admin/users");

            const managerUsers = res.data.filter(
                (u) => u.role === "MANAGER"
            );

            setManagers(managerUsers);
        } catch (err) {
            console.log(err);
        }
    };

    const assignManager = async () => {
        try {
            await API.put(
                `/admin/teams/${selectedTeam.id}/assign-manager?manager_id=${selectedManager}`
            );

            alert("Manager assigned successfully");

            refreshData();
            onClose();
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                "Manager assignment failed"
            );
        }
    };

    if (!open) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box">

                <h2>Assign Manager</h2>

                <p>
                    Team: <strong>{selectedTeam?.name}</strong>
                </p>

                <select
                    className="modal-select"
                    value={selectedManager}
                    onChange={(e) => setSelectedManager(e.target.value)}
                >
                    <option value="">Select Manager</option>

                    {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                            {manager.name} ({manager.email})
                        </option>
                    ))}
                </select>

                <div className="modal-buttons">
                    <button onClick={assignManager}>
                        Assign
                    </button>

                    <button onClick={onClose}>
                        Cancel
                    </button>
                </div>

            </div>
        </div>
    );
}