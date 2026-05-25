import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (trabajador) => {
    const sign = jwt.sign(
        {
            id_trabajador: trabajador.id_trabajador,
            correo: trabajador.correo,
            tipo_usuario: trabajador.tipo_usuario // trabajador, supervisor, administrador
        },
        JWT_SECRET,
        {
            expiresIn: "8h"
        }
    );
    return sign;
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};