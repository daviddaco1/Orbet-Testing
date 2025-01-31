const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();

const sumsubApiKey = process.env.SUMSUB_API_KEY;
const sumsubSecretKey = process.env.SUMSUB_SECRET_KEY;
const sumsubBaseUrl = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';

// Función para crear la firma requerida para las solicitudes
function createSignature(ts, method, _path, body = '') {
    const stringToSign = `${ts}${method}${_path}${body}`;
    return crypto.createHmac('sha256', sumsubSecretKey).update(stringToSign).digest('hex');
}

// Función para crear un applicant o recuperar el existente
async function createApplicant(externalUserId, userInfo) {
    const levelName = "id-and-liveness"; // Cambia esto según tu configuración en SumSub
    const _path = '/resources/applicants?levelName=' + levelName;

    const method = 'POST';
    const ts = Math.floor(Date.now() / 1000);

    const applicantData = {
        externalUserId: externalUserId,
        email: userInfo.email,
        phone: userInfo.phone,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        dob: userInfo.dob,
        country: userInfo.country,
        levelName: levelName, // Aquí especificamos el nivel
    };

    console.log("applicantData: ", applicantData);

    const signature = createSignature(ts, method, _path, JSON.stringify(applicantData));

    try {
        const response = await axios.post(`${sumsubBaseUrl}${_path}`, applicantData, {
            headers: {
                'X-App-Token': sumsubApiKey,
                'X-App-Access-Sig': signature,
                'X-App-Access-Ts': ts,
                'Content-Type': 'application/json',
            },
        });
        // Retornar el applicant creado
        return response.data;
    } catch (error) {
        const errorData = error.response?.data;

        // Manejar el caso de "applicant already exists"
        if (error.response?.status === 409 && errorData?.description?.includes("already exists")) {
            console.warn("Applicant already exists. Extracting existing ID...");

            // Extraer el ID del applicant existente desde el mensaje de error
            const existingApplicantId = errorData.description.match(/Applicant with external user id '.*?' already exists: ([a-zA-Z0-9]+)/)?.[1];

            if (existingApplicantId) {
                return { id: existingApplicantId, status: "existing" }; // Devolver el ID del applicant existente
            } else {
                throw new Error("Could not extract existing applicant ID from error message.");
            }
        }

        console.error('Error creating applicant:', errorData || error.message);
        throw error;
    }
}

//obtiene una imagen de un aplicante
async function GetDocumentFromApplicant(inspectionId, itemID, fileName) {
    const _path = `/resources/inspections/${inspectionId}/resources/${itemID}`;
    console.log("Fetching image from:", `${sumsubBaseUrl}${_path}`);

    const ts = Math.floor(Date.now() / 1000); // Timestamp en segundos
    const signature = createSignature(ts, "GET", _path, ""); // Firma generada para GET


    try {
        const response = await axios.get(`${sumsubBaseUrl}${_path}`, {
            headers: {
                'X-App-Token': sumsubApiKey,            // clave API
                'X-App-Access-Sig': signature,          // Firma generada
                'X-App-Access-Ts': ts,                  // Timestamp
            },
            responseType: 'arraybuffer', // Necesario para manejar la imagen como un buffer
        });

        console.log("Document image data obtained");

        // Crear el directorio si no existe
        const dirPath = path.join(__dirname, '../documents');
        await fs.mkdir(dirPath, { recursive: true }); // Crear directorio si no existe

        // Ruta completa donde se guardará la imagen
        const filePath = path.join(__dirname, '../documents', fileName);

        // Guardar la imagen en el sistema de archivos
        await fs.writeFile(filePath, response.data);
        console.log("File saved!");

        return { status: true, filePath: filePath };
    } catch (error) {
        console.error('Error getting document image:', error.response?.data || error.message);
        return { status: false, error: error.message };
    }
}

//obtiene los datos de inspeccion para poder acceder a las imagenes
async function GetApplicantData(applicantId) {
    const _path = `/resources/applicants/${applicantId}/one`;
    console.log("loading: " + `${sumsubBaseUrl}${_path}`);

    const method = 'GET';
    const ts = Math.floor(Date.now() / 1000); // Timestamp en segundos

    // Crear la firma de acceso
    const signature = createSignature(ts, method, _path, ''); // '' porque no hay body para solicitudes GET


    try {
        const response = await axios.get(`${sumsubBaseUrl}${_path}`, {
            headers: {
                'accept': 'application/json',
                'X-App-Token': sumsubApiKey,            // clave API
                'X-App-Access-Sig': signature,          // Firma generada
                'X-App-Access-Ts': ts,                  // Timestamp
                'Content-Type': 'application/json',     // Opcional para GET
            },
        });

        console.log("Applicant data getted");

        console.log(response.data);

        return response.data;
    } catch (error) {
        console.error('Error obtaining Applicant data:', error.response?.data || error.message);
        throw error;
    }
}

//Obtiene la info de los documentos
async function getDocumentsInfo_kyc(applicantId) {
    //resources/applicants/{applicantId}/metadata/resources
    const _path = `/resources/applicants/${applicantId}/metadata/resources`;

    console.log("loading: " + _path);
    const method = 'GET';
    const ts = Math.floor(Date.now() / 1000); // Timestamp en segundos

    // Crear la firma de acceso
    const signature = createSignature(ts, method, _path, ''); // '' porque no hay body para solicitudes GET

    try {
        const response = await axios.get(`${sumsubBaseUrl}${_path}`, {
            headers: {
                'accept': 'application/json',
                'X-App-Token': sumsubApiKey,            // clave API
                'X-App-Access-Sig': signature,          // Firma generada
                'X-App-Access-Ts': ts,                  // Timestamp
                'Content-Type': 'application/json',     // Opcional para GET
            },
        });

        console.log("Documents data obtained");

        return response.data;
    } catch (error) {
        console.error('Error generating access token:', error.response?.data || error.message);
        throw error;
    }
}

// Función para generar un enlace de verificación para el usuario
//le envio user USERID
async function getAccessTokenForApplicant(USERID) {
    const levelName = "id-and-liveness"; // Cambia esto según tu configuración en SumSub
    const _path = `/resources/accessTokens/sdk?levelName=` + levelName;

    console.log("loading: " + _path);

    const method = 'POST';
    const ts = Math.floor(Date.now() / 1000);

    const body = {
        ttlInSecs: 3600, // Tiempo de vida del token (1 hora en este caso)
        userId: USERID,
        levelName: levelName
    };

    const signature = createSignature(ts, method, _path, JSON.stringify(body));

    try {
        const response = await axios.post(`${sumsubBaseUrl}${_path}`, body, {
            headers: {
                'X-App-Token': sumsubApiKey,
                'X-App-Access-Sig': signature,
                'X-App-Access-Ts': ts,
                'Content-Type': 'application/json',
            },
        });

        console.log("token obtained!");

        return response.data;
    } catch (error) {
        console.error('Error generating access token:', error.response?.data || error.message);
        throw error;
    }
}

//se supone que me crea el enlace para poder hacer la verificacion
//le envio user USERID
async function generateUrlForApplicant(USERID) {
    const levelName = "id-and-liveness"; // Cambia esto según tu configuración en SumSub
    const _path = `/resources/sdkIntegrations/levels/${levelName}/websdkLink?externalUserId=${USERID}&ttlInSecs=3600`; //`/resources/sdkIntegrations/levels/${levelName}/websdkLink`;

    console.log(`loading:  ${sumsubBaseUrl}${_path}`);


    const method = 'POST';
    const ts = Math.floor(Date.now() / 1000);

    const body = {
        ttlInSecs: 3600, // Tiempo de vida del token (1 hora en este caso)
        externalUserId: USERID,
        levelName: levelName
    };

    const signature = createSignature(ts, method, _path, JSON.stringify(body));

    try {
        const response = await axios.post(`${sumsubBaseUrl}${_path}`, body, {
            headers: {
                'X-App-Token': sumsubApiKey,
                'X-App-Access-Sig': signature,
                'X-App-Access-Ts': ts,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error generating access token:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { createApplicant, getAccessTokenForApplicant, generateUrlForApplicant, getDocumentsInfo_kyc, GetDocumentFromApplicant, GetApplicantData };
