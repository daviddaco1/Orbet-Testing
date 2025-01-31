const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-cbc'; // Algoritmo de cifrado (debe ser fijo y compatible)
const SECRET_KEY = crypto
    .createHash('sha256') // Hash para obtener una clave de 32 bytes desde la clave en .env
    .update(String(process.env.ENCRYPTION_KEY))
    .digest(); // Clave de 32 bytes
const IV_LENGTH = 16; // Longitud del IV (en bytes)

// Función para cifrar datos
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH); // Generar un IV aleatorio
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv); // Crear el cifrador
    let encrypted = cipher.update(text, 'utf8'); // Cifrar el texto
    encrypted = Buffer.concat([encrypted, cipher.final()]); // Finalizar el cifrado
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`; // Retornar el IV y los datos cifrados
}

// Función para descifrar datos
function decrypt(text) {
    try {
        const [iv, encryptedData] = text.split(':'); // Separar el IV y los datos cifrados
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, Buffer.from(iv, 'hex')); // Crear el descifrador
        let decrypted = decipher.update(Buffer.from(encryptedData, 'hex')); // Descifrar
        decrypted = Buffer.concat([decrypted, decipher.final()]); // Finalizar el descifrado
        return decrypted.toString(); // Retornar el texto descifrado
    } catch (error) {
        console.error('Error al descifrar:', error.message);
        throw new Error('No se pudo descifrar el texto proporcionado');
    }
}

module.exports = { encrypt, decrypt };