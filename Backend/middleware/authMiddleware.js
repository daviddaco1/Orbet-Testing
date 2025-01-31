const jwt = require('jsonwebtoken');
const { verifyPassword } = require('../utils/bcryptUtils');
const mysql = require('mysql2/promise');
const chalk = require('chalk');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) // Asegúrate de convertir esto a número
};

const conexionOrbet = mysql.createPool(dbConfig);

// Middleware flexible: permite verificar JWT, API Token o ambos
exports.verifyAuth = (options = { useJWT: true, useApiKey: true, ReqRole: 'admin' }) => {
    return async (req, res, next) => {
        const { useJWT, useApiKey, ReqRole } = options;

        // Validar API Token si está habilitado
        if (useApiKey) {
            const originalPath = req.originalUrl; // La URL original
            const path = cleanPath(originalPath); // Limpia la URL de valores dinámicos
            const apiKey = req.headers['x-api-key'];
            // Omite la validación si la ruta es pública
            if (publicRoutes.includes(path)) {
                return next(); // Continúa al siguiente middleware o controlador
            }
            try {
                const { access, reason } = await CheckAPIKEY(apiKey, path);

                if (!access) {
                    const timestamp = chalk.blue(`[${new Date().toISOString()}]`);
                    const method = chalk.yellow(req.method);
                    const url = chalk.yellow(req.url);
                    const body = chalk.green(JSON.stringify(req.body));
                    const apiKey = req.headers['x-api-key'];

                    const apiKeyInfo = apiKey
                        ? chalk.gray(`Api-key provided`)
                        : chalk.red('No api-key provided');

                    console.log(`${timestamp} ${method} ${url} ${body} ${apiKeyInfo}`);
                    return res.status(403).json({ message: reason });
                }
            } catch (error) {
                console.error(`API Key validation for path failed ${path}:`, error);
                res.status(500).json({ message: 'Error interno del servidor' });
            }
        }

        // Validar JWT si está habilitado
        if (useJWT) {
            const token = req.headers['authorization'];
            if (!token) {
                return res.status(403).json({ message: 'No JWT provided' });
            }

            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to authenticate JWT', error: err.message });
                }
                if (decoded.role !== ReqRole) {
                    return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
                }

                // ✅ Solo si todo es correcto, continúa
                req.userId = decoded.userId;
                req.userRole = decoded.role;
                next();
            });

            return;
        }
    };
};

async function CheckAPIKEY(apiKey, path) {
    // Validar que se proporcione una API key
    if (!apiKey) {
        return { access: false, reason: 'API key is missing' };
    }

    try {
        // Consultar claves activas
        const results = await executeQueryFromPoolAsync(
            conexionOrbet,
            'SELECT * FROM api_keys WHERE is_active = TRUE',
            []
        );

        for (const record of results) {
            const match = await verifyPassword(apiKey, record.api_key);
            if (match) {
                // Verificar si la clave tiene permisos para el endpoint solicitado
                let allowedEndpoints;
                try {
                    allowedEndpoints = typeof record.allowed_endpoints === 'string'
                        ? JSON.parse(record.allowed_endpoints)
                        : record.allowed_endpoints;
                } catch {
                    return { access: false, reason: 'Invalid format in allowed_endpoints' };
                }
                if (allowedEndpoints.includes(path) || allowedEndpoints.includes('*') && record.Name == 'Master') {
                    // **Aquí ya se pasaron todas las verificaciones**
                    return { access: true, reason: 'Access granted' };
                } else {
                    console.log(chalk.red(path));
                    return { access: false, reason: 'API key does not have permission for this endpoint' };
                }
            }
        }

        // Si no se encontró coincidencia en las claves
        return { access: false, reason: 'API key is invalid or inactive' };
    } catch (error) {
        console.error('Error en la consulta o verificación:', error);
        return { access: false, reason: 'Internal server error while validating API key' };
    }
}

const publicRoutes = process.env.PUBLIC_ROUTES ? process.env.PUBLIC_ROUTES.split(',').map(route => route.trim()) : [];

const cleanPath = (originalUrl) => {
    // Lista de extensiones de archivos comunes (puedes agregar más según sea necesario)
    const fileExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];

    // Divide la URL por "/"
    const segments = originalUrl.split('/');

    // Reconstruye la ruta sin los segmentos que son archivos o vacíos
    const baseSegments = segments.filter(segment => {
        // Excluir segmentos vacíos
        if (segment === '') return false;

        // Excluir nombres de archivo con extensiones conocidas
        const extension = segment.split('.').pop().toLowerCase();
        if (fileExtensions.includes(extension)) return false;

        // Excluir números (IDs)
        return isNaN(segment);
    });

    return `/${baseSegments.join('/')}`;
};

async function executeQueryFromPoolAsync(pool, query, params) {
    let connection;
    try {
        // Obtener una conexión del pool
        connection = await pool.getConnection();

        // Ejecutar la consulta usando la conexión obtenida
        const [results] = await connection.execute(query, params);  // `execute` es adecuado para evitar inyecciones SQL
        return results;
    } catch (error) {
        console.error('Error en la consulta:', error);
        throw error;  // Lanzar el error para que el código que llama a esta función lo maneje
    } finally {
        // Liberar la conexión para que el pool pueda usarla nuevamente
        if (connection) {
            connection.release();  // Es importante liberar la conexión
        }
    }
}