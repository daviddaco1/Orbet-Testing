const { encrypt, decrypt } = require('../utils/encryption');

// Middleware para cifrar datos en el request
function encryptMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        const newBody = {};
        for (const key in req.body) {
            if (key.startsWith('__no_encrypt_')) {
                // Quitar el prefijo y mantener el valor sin cifrar
                newBody[key.replace('__no_encrypt_', '')] = req.body[key];
            } else if (req.body[key]) {
                // Cifrar el valor
                newBody[key] = encrypt(req.body[key].toString());
            } else {
                // Mantener los valores originales para otros tipos de datos
                newBody[key] = req.body[key];
            }
        }

        req.body = newBody; // Reemplazar el body original con el modificado
    }
    next();
}

// Middleware para descifrar datos en el response

// Validar si una string es un formato ISO de fecha
function isIsoDateFormat(text) {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    return isoDateRegex.test(text);
}

// Validar si el texto tiene el formato `iv:ciphertext`
function isEncryptedFormat(text) {
    if (typeof text === 'string') {
        const parts = text.split(':');
        const isValid =
            parts.length === 2 &&
            /^[a-f0-9]+$/i.test(parts[0]) && // El IV debe ser hexadecimal
            /^[a-f0-9]+$/i.test(parts[1]);   // Los datos cifrados deben ser hexadecimales
        //console.log(`[isEncryptedFormat] Texto: "${text}" -> Es válido: ${isValid}`);
        return isValid && !isIsoDateFormat(text); // Asegurarse de que no sea una fecha ISO
    }
    return false;
}

// Función para determinar si una cadena es una fecha válida en formato ISO
function isISODateString(value) {
    return typeof value === 'string' && !isNaN(Date.parse(value));
}

function decryptRecursively(data) {
    //console.log(`[decryptRecursively] Procesando:`, data);

    if (Array.isArray(data)) {
        //console.log(`[decryptRecursively] Es un array con ${data.length} elementos.`);
        return data.map(decryptRecursively);
    } else if (data && typeof data === 'object' && data !== null) {
        //console.log(`[decryptRecursively] Es un objeto con claves:`, Object.keys(data));
        const decryptedObject = {};
        for (const key in data) {
            //console.log(`[decryptRecursively] Procesando clave: "${key}", valor: "${data[key]}"`);
            if (data[key] && typeof data[key] === 'string' && isEncryptedFormat(data[key])) {
                try {
                    //console.log(`[decryptRecursively] Intentando descifrar clave: "${key}"`);
                    decryptedObject[key] = decrypt(data[key]);
                    //console.log(`[decryptRecursively] Descifrado exitoso. Clave: "${key}", Valor descifrado: "${decryptedObject[key]}"`);
                } catch (err) {
                    //console.warn(`[decryptRecursively] No se pudo descifrar el campo "${key}": ${err.message}`);
                    decryptedObject[key] = data[key];
                }
            } else {
                //console.log(`[decryptRecursively] No se necesita descifrar la clave: "${key}"`);
                decryptedObject[key] = decryptRecursively(data[key]);
            }
        }
        // if decryptedObject is null, return data
        if (Object.keys(decryptedObject).length === 0) {
            //console.log(`[decryptRecursively] Objeto vacío, retornando valor original:`, data);
            return data;
        }
        return decryptedObject;
    } else if (typeof data === 'string' || typeof data === 'number' || data instanceof Date) {
        // Retornar directamente strings, números y objetos `Date`
        //console.log(`[decryptRecursively] Valor primitivo o fecha:`, data);
        return data;
    }

    //console.log(`[decryptRecursively] Valor nulo o desconocido:`, data);
    return data; // Devolver valores primitivos o nulos tal cual
}

function decryptMiddleware(req, res, next) {
    const originalJson = res.json;

    res.json = function (data) {
        //console.log('Datos antes del descifrado:', JSON.stringify(data, null, 2));
        if (data && typeof data === 'object') {
            data = decryptRecursively(data); // Procesar recursivamente
        }
        //console.log('Datos después del descifrado:', JSON.stringify(data, null, 2));
        originalJson.call(this, data); // Enviar datos modificados
    };

    next();
}

module.exports = { encryptMiddleware, decryptMiddleware, decryptRecursively };