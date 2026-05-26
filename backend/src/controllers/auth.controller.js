
import { AppDataSource } from "../config/configDb.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/handleJWT.js";

const trabajadoresTable = AppDataSource.getRepository("Trabajador");
const etiquetasTable = AppDataSource.getRepository("Etiqueta");

// Valores válidos para tipo_usuario
const TIPOS_USUARIO_VALIDOS = [
    "trabajador",
    "supervisor",
    "administrador"
];

export const register = async (req, res) => {

    try {

        // Verificar si el correo ya existe
        const mailExists = await trabajadoresTable.findOne({
            where: { correo: req.body.correo }
        });
        const rutExists = await trabajadoresTable.findOne({
            where: { rut: req.body.rut }
        });
        const etiquetaExists = await etiquetasTable.findOne({
            where: { id_etiqueta: req.body.id_etiqueta }
        });

        if (mailExists) {
            console.log("Ya existe un usuario registrado con este mail.");
            return res.status(500).json({
                status: "error",
                message: "Correo ya existente."
            });
        }

        if (rutExists) {
            console.log("Ya existe un usuario registrado con este rut.");
            return res.status(500).json({
                status: "error",
                message: "Rut ya existente."
            });
        }

        if (!etiquetaExists) {
            console.log("No existe una etiqueta con el id_etiqueta proporcionado.");
            return res.status(400).json({
                status: "error",
                message: "Etiqueta no existente."
            });
        }

        const {
            tipo_usuario,
            id_etiqueta,
            rut,
            nombres,
            apellidos,
            sexo,
            telefono,
            correo,
            direccion,
            fecha_nacimiento,
            fecha_ingreso,
            estado_laboral,
            experiencia_previa,
            password
        } = req.body;

        // Validar campos obligatorios
        if (
            !tipo_usuario ||
            !rut ||
            !nombres ||
            !apellidos ||
            !correo ||
            !password
        ) {
            return res.status(400).json({
                status: "error",
                message: "Faltan campos obligatorios."
            });
        }

        // Validar tipo_usuario
        if (!TIPOS_USUARIO_VALIDOS.includes(tipo_usuario)) {
            return res.status(400).json({
                status: "error",
                message: `tipo_usuario inválido. Valores permitidos: ${TIPOS_USUARIO_VALIDOS.join(", ")}`
            });
        }

        // Hash de contraseña
        const hashed_pass = await bcrypt.hash(password, 10);

        // Crear trabajador
        const trabajadorNuevo = trabajadoresTable.create({
            tipo_usuario,
            id_etiqueta: id_etiqueta ? parseInt(id_etiqueta) : null,
            rut,
            nombres,
            apellidos,
            sexo,
            telefono,
            correo,
            direccion,
            fecha_nacimiento,
            fecha_ingreso,
            estado_laboral,
            experiencia_previa,
            hashed_pass
        });

        // Guardar en BD
        const trabajadorGuardado = await trabajadoresTable.save(trabajadorNuevo);

        return res.status(201).json({
            status: "success",
            message: "Usuario registrado correctamente.",
            data: trabajadorGuardado
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};












export const login = async (req, res) => {

    try {
        const { correo, password } = req.body;
        
        // Validar campos
        if (!correo || !password) {
            return res.status(400).json({
                status: "error",
                message: "Correo y contraseña son obligatorios."
            });
        }

        // Buscar trabajador
        const trabajador = await trabajadoresTable.findOne({
            where: { correo }
        });

        // Validar existencia de trabajador
        if (!trabajador) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado."
            });
        }

        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(
            password,
            trabajador.hashed_pass
        );

        // Contraseña incorrecta
        if (!passwordMatch) {
            return res.status(401).json({
                status: "error",
                message: "Contraseña incorrecta."
            });
        }

        // Generar token
        const token = generateToken(trabajador);

        // Ocultar hash
        const { hashed_pass, ...trabajadorSinPassword } = trabajador;

        // Respuesta
        return res.status(200).json({
            status: "success",
            message: "Login exitoso.",
            token,
            data: trabajadorSinPassword
        });/*
*/
    } catch (error) {

        console.error(error);

        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};