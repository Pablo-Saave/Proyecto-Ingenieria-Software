import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/configDb.js';
import { enviarOTP } from '../services/emailService.js';

const otpStore = {};

export async function solicitarReset(req, res) {
  try {
    const { correo } = req.body;
    const repo = AppDataSource.getRepository('Trabajador');
    const trabajador = await repo.findOne({ where: { correo } });

    // Siempre responde igual aunque no exista el correo
    if (!trabajador) {
      return res.json({ message: 'Si el correo existe, recibirás un código.' });
    }

    const codigo = crypto.randomInt(100000, 999999).toString();
    otpStore[correo] = { codigo, expiry: Date.now() + 10 * 60 * 1000 };

    await enviarOTP(correo, codigo);
    res.json({ message: 'Código enviado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al enviar el código.' });
  }
}

export async function verificarReset(req, res) {
  try {
    const { correo, codigo, nueva_password } = req.body;
    const registro = otpStore[correo];

    if (!registro || registro.codigo !== codigo) {
      return res.status(400).json({ message: 'Código incorrecto.' });
    }

    if (Date.now() > registro.expiry) {
      return res.status(400).json({ message: 'El código expiró.' });
    }

    const repo = AppDataSource.getRepository('Trabajador');
    const trabajador = await repo.findOne({ where: { correo } });
    trabajador.hashed_pass = await bcrypt.hash(nueva_password, 10);
    await repo.save(trabajador);

    delete otpStore[correo];
    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar la contraseña.' });
  }
}