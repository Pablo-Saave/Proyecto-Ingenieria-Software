const API_URL = "http://localhost:3000/api/auth";

export const loginRequest = async (correo, password) => {

    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            correo,
            password
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message);
    }

    return data;
};