// services/riskEngineService.js

const RISK_DISTANCE_THRESHOLD_KM = 5000;  // Distancia límite entre inicios de sesión

module.exports.analyzeSession = async (user_id, currentSession) => {
    try {
        // 1. Obtener las últimas sesiones activas del usuario
        const [sessions] = await conexionOrbet.query(`
            SELECT session_id, ip, coordinates, event_date
            FROM user_sessions
            WHERE user_id = ? AND status = 'active' AND session_id != ?
            ORDER BY event_date DESC LIMIT 5
        `, [user_id, currentSession.session_id]);

        for (let session of sessions) {
            const distance = calculateDistance(
                currentSession.coordinates, 
                session.coordinates
            );

            if (distance > RISK_DISTANCE_THRESHOLD_KM) {
                return {
                    flagged: true,
                    risk_type: 'Concurrent logins from distant locations',
                    risk_level: 'high',
                    details: `Distance of ${distance} km detected between sessions.`
                };
            }
        }

        return { flagged: false };

    } catch (error) {
        console.error('Error in risk analysis:', error);
        return { flagged: false };
    }
};

// Calcula la distancia entre dos coordenadas geográficas
function calculateDistance(coord1, coord2) {
    const [lat1, lon1] = coord1.split(',').map(Number);
    const [lat2, lon2] = coord2.split(',').map(Number);

    const R = 6371; // Radio de la Tierra en km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}