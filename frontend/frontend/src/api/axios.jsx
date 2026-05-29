// src/api/axios.js — ONLY this, nothing else
import axios from "axios";

const API = axios.create({
    baseURL: "http://13.204.14.205:8000",
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;