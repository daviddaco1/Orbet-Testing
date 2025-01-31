require('dotenv').config();
const bcrypt = require('bcrypt');

/**
 * Genera un hash seguro para la contraseña proporcionada.
 * @param {string} password - La contraseña en texto plano a hashear.
 * @returns {Promise<string>} - El hash de la contraseña.
 */
async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.error('Error al generar el hash:', error);
        throw new Error('Error al generar el hash de la contraseña');
    }
}

/**
 * Verifica si una contraseña coincide con un hash almacenado.
 * @param {string} password - La contraseña en texto plano a verificar.
 * @param {string} hashedPassword - El hash contra el que se verificará.
 * @returns {Promise<boolean>} - Verdadero si la contraseña coincide, falso en caso contrario.
 */
async function verifyPassword(password, hashedPassword) {
    try {
        const isValid = await bcrypt.compare(password, hashedPassword);
        return isValid;
    } catch (error) {
        console.error('Error al verificar la contraseña:', error);
        throw new Error('Error al verificar la contraseña');
    }
}

/**
 * Genera un hash sincrónico (útil para casos simples o pruebas).
 * @param {string} password - La contraseña en texto plano a hashear.
 * @returns {string} - El hash generado.
 */
function hashPasswordSync(password) {
    try {
        const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT_ROUNDS));
        const hashedPassword = bcrypt.hashSync(password, salt);
        return hashedPassword;
    } catch (error) {
        console.error('Error al generar el hash sincrónico:', error);
        throw new Error('Error al generar el hash de la contraseña');
    }
}

/**
 * Verifica una contraseña contra un hash de manera sincrónica.
 * @param {string} password - La contraseña en texto plano a verificar.
 * @param {string} hashedPassword - El hash contra el que se verificará.
 * @returns {boolean} - Verdadero si la contraseña coincide, falso en caso contrario.
 */
function verifyPasswordSync(password, hashedPassword) {
    try {
        return bcrypt.compareSync(password, hashedPassword);
    } catch (error) {
        console.error('Error al verificar la contraseña sincrónica:', error);
        throw new Error('Error al verificar la contraseña');
    }
}

module.exports = {
    hashPassword,
    verifyPassword,
    hashPasswordSync,
    verifyPasswordSync
};