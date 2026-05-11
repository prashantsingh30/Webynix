import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BASEURL || (import.meta.env.PROD ? 'https://webynix-server.onrender.com' : 'http://localhost:3000'),
    withCredentials: true
})

export default api