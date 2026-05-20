import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./Chat.css";

export default function Chat() {

    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user"));

    const [users, setUsers] = useState([]);

    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserData, setSelectedUserData] = useState(null);

    const [messages, setMessages] = useState([]);

    const [message, setMessage] = useState("");

    const socketRef = useRef(null);


    // =========================
    // SOCKET
    // =========================
    useEffect(() => {

        fetchUsers();

        connectSocket();

        return () => {

            if (socketRef.current) {

                socketRef.current.close();
            }
        };

    }, []);


    // =========================
    // CONNECT SOCKET
    // =========================
    const connectSocket = () => {

        socketRef.current = new WebSocket(
            `ws://localhost:8000/chat/ws/${user.id}`
        );

        socketRef.current.onmessage = (event) => {

            const data = JSON.parse(event.data);

            console.log(data);

            if (
                data.type === "new_message"
                || data.type === "message_sent"
            ) {

                setMessages((prev) => [
                    ...prev,
                    data
                ]);
            }
        };
    };


    // =========================
    // FETCH USERS
    // =========================
    const fetchUsers = async () => {

        try {

            const res = await API.get(
                `/chat/users/${user.id}`
            );

            setUsers(res.data);

        } catch (err) {

            console.log(err);
        }
    };


    // =========================
    // LOAD MESSAGES
    // =========================
    const loadMessages = async (receiverId) => {

        try {

            const res = await API.get(
                `/chat/messages/${user.id}/${receiverId}`
            );

            setMessages(res.data);

            setSelectedUser(receiverId);

            const userData = users.find(
                (u) => u.id === receiverId
            );

            setSelectedUserData(userData);

            await API.put(
                `/chat/seen/${receiverId}/${user.id}`
            );

        } catch (err) {

            console.log(err);
        }
    };


    // =========================
    // SEND MESSAGE
    // =========================
    const sendMessage = () => {

        if (!message.trim()) return;

        socketRef.current.send(JSON.stringify({

            receiver_id: selectedUser,

            message: message

        }));

        setMessage("");
    };


    return (

        <div className="chat-page">

            {/* SIDEBAR */}

            <div className="chat-left">

                <div className="chat-top">

                    <h2>Chats</h2>

                    <button
                        className="back-btn"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </button>

                </div>

                {

                    users.map((u) => (

                        <div
                            key={u.id}
                            className="chat-user"
                            onClick={() => loadMessages(u.id)}
                        >

                            <h4>{u.name}</h4>

                            <p>
                                {u.role}
                            </p>

                        </div>

                    ))

                }

            </div>


            {/* RIGHT CHAT */}

            <div className="chat-right">

                {

                    selectedUser ? (

                        <>

                            {/* MESSAGES */}

                            <div className="messages-container">

                                {

                                    messages.map((msg) => (

                                        <div
                                            key={msg.id}
                                            className={
                                                msg.sender_id === user.id
                                                    ? "my-message"
                                                    : "other-message"
                                            }
                                        >

                                            <div className="message-box">

                                                <p>{msg.message}</p>

                                                <small>

                                                    {
                                                        msg.seen
                                                            ? "✔✔ Blue"
                                                            : msg.delivered
                                                                ? "✔✔"
                                                                : "✔"
                                                    }

                                                </small>

                                            </div>

                                        </div>

                                    ))

                                }

                            </div>


                            {/* INPUT */}

                            <div className="chat-input-section">

                                <input
                                    type="text"
                                    placeholder="Type message..."
                                    value={message}
                                    onChange={(e) =>
                                        setMessage(e.target.value)
                                    }
                                />

                                <button onClick={sendMessage}>
                                    Send
                                </button>

                            </div>

                        </>

                    ) : (

                        <div className="empty-chat">

                            Select a user to start chat

                        </div>

                    )

                }

            </div>

        </div>
    );
}