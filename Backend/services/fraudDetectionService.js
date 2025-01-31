const mysql = require('mysql2/promise');
const dbConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) // Asegúrate de convertir esto a número
};

const conexionOrbet = mysql.createPool(dbConfig);
const RISK_TIME_WINDOW_MINUTES = 10;  // Ventana de tiempo para detección de múltiples registros
const MAX_REFERRALS_PER_WINDOW = 5;   // Límite de referidos permitidos en el tiempo definido

/**
 * Detecta posibles fraudes en registros de referidos.
 * @param {number} user_id - ID del usuario que refiere.
 * @param {string} ip_address - Dirección IP del referido.
 * @param {string} referral_code - Código de referido usado.
 * @returns {object} Resultado del análisis de fraude.
 */
async function detectReferralFraud(user_id, ip_address, referral_code) {
    try {
        // 1. Verificar auto-referidos
        const selfReferral = await executeQueryFromPoolAsync(conexionOrbet,`
            SELECT * FROM referrals 
            WHERE user_id = ? AND code = ?
        `, [user_id, referral_code]);

        if (selfReferral.length > 0) {
            return {
                flagged: true,
                risk_type: 'Self-referral detected',
                risk_level: 'high',
                details: 'User tried to refer themselves.'
            };
        }

        // 2. Verificar múltiples registros desde la misma IP
        const recentReferrals = await executeQueryFromPoolAsync(conexionOrbet,`
            SELECT COUNT(*) AS referral_count
            FROM referrals
            WHERE ip_address = ?
              AND created_at >= (NOW() - INTERVAL ? MINUTE)
        `, [ip_address, RISK_TIME_WINDOW_MINUTES]);

        if (recentReferrals[0].referral_count >= MAX_REFERRALS_PER_WINDOW) {
            return {
                flagged: true,
                risk_type: 'Multiple referrals from same IP',
                risk_level: 'medium',
                details: `More than ${MAX_REFERRALS_PER_WINDOW} referrals from the same IP in ${RISK_TIME_WINDOW_MINUTES} minutes.`
            };
        }

        // 3. Validar patrones de referidos sospechosos
        const [suspiciousPatterns] = await executeQueryFromPoolAsync(conexionOrbet,`
            SELECT COUNT(*) AS total_referrals
            FROM referrals
            WHERE user_id = ?
              AND created_at >= (NOW() - INTERVAL 1 DAY)
        `, [user_id]);

        if (suspiciousPatterns[0].total_referrals > 20) {
            return {
                flagged: true,
                risk_type: 'Unusual referral activity',
                risk_level: 'medium',
                details: 'High volume of referrals in a short period.'
            };
        }

        // ✅ Sin actividad sospechosa
        return { flagged: false };

    } catch (error) {
        console.error('Error in fraud detection:', error);
        return { flagged: false, error: 'Error during fraud detection' };
    }
}

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

module.exports = { detectReferralFraud };