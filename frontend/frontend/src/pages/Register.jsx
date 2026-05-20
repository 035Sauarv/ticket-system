import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./Login.css";

export default function Register() {

    const navigate = useNavigate();

    const [teams, setTeams] = useState([]);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role_id: "",
        team_id: ""
    });

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {

            // PUBLIC API
            const res = await API.get("/auth/teams");

            setTeams(res.data || []);

        } catch (err) {
            console.log(err);
        }
    };

    const register = async () => {

        try {

            const payload = {
                name: form.name,
                email: form.email,
                password: form.password,
                role_id: Number(form.role_id)
            };

            // ONLY TEAM MEMBER SENDS TEAM
            if (Number(form.role_id) === 3) {

                if (!form.team_id) {
                    alert("Please select team");
                    return;
                }

                payload.team_id = Number(form.team_id);
            }

            await API.post("/auth/register", payload);

            alert("Registration submitted successfully");

            navigate("/login");

        } catch (err) {

            console.log(err);

            alert(
                err.response?.data?.detail ||
                "Registration failed"
            );
        }
    };

    return (
        <div className="register-container">

            <div className="register-box">

                <h2>Register</h2>

                <input
                    type="text"
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            name: e.target.value
                        })
                    }
                />

                <input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            email: e.target.value
                        })
                    }
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            password: e.target.value
                        })
                    }
                />

                <select
                    value={form.role_id}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            role_id: e.target.value,
                            team_id: ""
                        })
                    }
                >
                    <option value="">Select Role</option>
                    <option value="2">Manager</option>
                    <option value="3">Team Member</option>
                </select>

                {Number(form.role_id) === 3 && (
                    <select
                        value={form.team_id}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                team_id: e.target.value
                            })
                        }
                    >
                        <option value="">Select Team</option>

                        {teams.map((team) => (
                            <option
                                key={team.id}
                                value={team.id}
                            >
                                {team.name}
                            </option>
                        ))}
                    </select>
                )}

                <button onClick={register}>
                    Register
                </button>

            </div>

        </div>
    );
}