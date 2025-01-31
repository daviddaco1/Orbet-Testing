require('dotenv').config();
const mysql = require('mysql2/promise');
const express = require('express');
const passport = require("passport");
const OAuth2Strategy = require('passport-oauth2').OAuth2Strategy;
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const twitchStrategy = require("passport-twitch-new").Strategy;
const multer = require('multer');
const PDFDocument = require('pdfkit-table');
const path = require('path');
const fs = require('fs');
const { hashPassword, verifyPassword } = require('./utils/bcryptUtils');
const { encryptMiddleware, decryptMiddleware, decryptRecursively } = require('./middleware/encryptionMiddleware');
const { encryptMessage, decryptMessage } = require('./utils/messageEncryption');
const { verifyAuth } = require('./middleware/authMiddleware');
const riskEngineService = require('./services/riskEngineService'); // Servicio de análisis de riesgo
const { detectReferralFraud } = require('./services/fraudDetectionService');
const { sha512, sha384, sha512_256, sha512_224 } = require('js-sha512');
const { encrypt, decrypt } = require('./utils/encryption');
const http = require('http');
const chalk = require('chalk');
const socketIo = require('socket.io');
const ExcelJS = require('exceljs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { nanoid, customAlphabet } = require('nanoid');
const useragent = require('user-agent');
const axios = require('axios');
const { createApplicant, getAccessTokenForApplicant, generateUrlForApplicant, getDocumentsInfo_kyc, GetDocumentFromApplicant, GetApplicantData } = require('./models/sumsub');

const cron = require('node-cron');

const geoip = require('geoip-lite');

const getCoordinates = (ip) => {
    const geo = geoip.lookup(ip);
    if (geo) {
        console.log(`Latitude: ${geo.latitude}, Longitude: ${geo.longitude}`);
        return geo;
    } else {
        console.error('Error fetching coordinates: IP address not found');
    }
};

// Configuración inicial
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 52305;
const io = socketIo(PORT, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
let adminsHash = [];

const SECRET_KEY = process.env.JWT_SECRET;
const baseUrlWeb = process.env.WEB_BASE_URL || 'http://localhost:3004';

app.use(session({
    secret: "test",
    resave: false,
    saveUninitialized: true
}));

//para los logueos
app.use(passport.initialize());
app.use(passport.session());


//strategys of login
passport.use(new GoogleStrategy(
    {
        passReqToCallback: true,
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: baseUrlWeb + "/auth/google/callback", //<- esto se debe cambiar en produccion!
    }, async (req, accessToken, refreshToken, profile, done) => {

        console.log("user loggued by google! yeih! ");
        console.log("req:");
        const userToken = req.session.userToken; // Recupera el token de la sesión

        //link account
        if (userToken) {
            //si estamos aqui es que estamos linkeando una cuenta

            //obtenemos los datos del token
            const tokenData = decodedJwt(userToken, process.env.JWT_SECRET);
            if (!tokenData) {
                return done("User invalid", false);
            }

            console.log(tokenData);

            profile.user_ID = tokenData.id;
            profile.tokenSession = userToken;

            try {
                console.log("Google authentication initiated.");

                const responseData = await LinkAccountGoogle(profile, accessToken);
                if (responseData.status) {
                    return done(null, profile);  // Autenticación exitosa
                } else {
                    return done(null, false, { message: responseData.msg });  // Fallo en la autenticación
                }
            } catch (error) {
                console.error("Error in Google authentication:", error);
                return done(error, false);
            }

        }

        //login
        try {
            console.log("Google authentication initiated.");

            const responseData = await loginOrRegisterByGoogle(profile, accessToken, req);
            if (responseData.status) {
                return done(null, profile);  // Autenticación exitosa
            } else {
                return done(null, false, { message: responseData.msg });  // Fallo en la autenticación
            }
        } catch (error) {
            console.error("Error in Google authentication:", error);
            return done(error, false);
        }
    }
)
);

passport.use(new FacebookStrategy(
    {
        passReqToCallback: true,
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        profileFields: ['id', 'emails', 'name', 'displayName'], // Especifica los campos a recuperar
        scope: ['email'], // Solicita acceso al correo electrónico
        callbackURL: baseUrlWeb + "/auth/facebook/callback", //<- esto se debe cambiar en produccion!
        state: true,
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {

        console.log("user loggued by fb! yeih! ");
        console.log(profile);
        console.log(req.session);
        const userToken = req.session.userToken; // Recupera el token de la sesión

        if (userToken) {
            //si estamos aqui es que estamos linkeando una cuenta

            console.log("si llego el token!");

            //obtenemos los datos del token
            const tokenData = decodedJwt(userToken, process.env.JWT_SECRET);
            if (!tokenData) {
                return done("User invalid", false);
            }

            console.log("Datos del token decodificado:", tokenData);

            profile.user_ID = tokenData.id;
            profile.tokenSession = req.userToken;

            try {
                console.log("Facebook link started");

                const responseData = await LinkAccountFacebook(profile, accessToken);
                if (responseData.status) {
                    return done(null, profile);  // Autenticación exitosa
                } else {
                    return done(null, false, { message: responseData.msg });  // Fallo en la autenticación
                }
            } catch (error) {
                console.error("Error in Facebook Link:", error);
                return done(error, false);
            }

        } else {
            console.log("no hay un token aqui!!");
        }

        try {
            console.log("facebook authentication initiated.");

            if (profile != null) {
                const responseData = await loginOrRegisterByFB(profile, accessToken, req);
                if (responseData.status) {
                    return done(null, profile);  // Autenticación exitosa
                } else {
                    return done(null, false, { message: responseData.msg });  // Fallo en la autenticación
                }
            } else {
                console.log("facebook no send any data...");
                return done(null, false);
            }


        } catch (error) {
            console.error("Error in facebook authentication:", error);
            return done(error, false);
        }
    }
)
);

passport.use(new twitchStrategy(
    {
        passReqToCallback: true,
        authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
        tokenURL: 'https://id.twitch.tv/oauth2/token',
        clientID: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_CLIENT_SECRET,
        scope: ['user_read'], // Solicita acceso al correo electrónico
        callbackURL: baseUrlWeb + "/auth/twitch/callback", //<- esto se debe cambiar en produccion!
        state: true,
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {

        console.log("trying access to twitch");

        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;

        console.log("user loggued by twitch! yeih! ");
        console.log(profile);

        const userToken = req.session.userToken; // Recupera el token de la sesión


        if (userToken) {
            //si estamos aqui es que estamos linkeando una cuenta

            //obtenemos los datos del token
            const tokenData = decodedJwt(userToken, process.env.JWT_SECRET);
            if (!tokenData) {
                return done("User invalid", false);
            }

            console.log(tokenData);

            profile.user_ID = tokenData.id;
            profile.tokenSession = userToken;

            try {
                console.log("Twitch link started");

                const responseData = await LinkAccountTwitch(profile, accessToken);
                if (responseData.status) {
                    return done(null, profile);  // Autenticación exitosa
                } else {
                    return done(null, false, { message: responseData.msg });  // Fallo en la autenticación
                }
            } catch (error) {
                console.error("Error in Twitch Link:", error);
                return done(error, false);
            }

        }

        try {
            console.log("twitch authentication initiated.");

            if (profile != null) {
                const responseData = await loginOrRegisterBytwitch(profile, accessToken, req);
                if (responseData.status) {
                    return done(null, profile);  // Autenticación exitosa
                } else {
                    return done(null, false, { message: responseData.msg });  // Fallo en la autenticación
                }
            } else {
                console.log("facebook no send any data...");
                return done(null, false);
            }


        } catch (error) {
            console.error("Error in facebook authentication:", error);
            return done(error, false);
        }
    }
)
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(express.static(path.join(__dirname, "public")));

//#region AppExpress
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(decryptMiddleware);

// Middleware para registrar solicitudes
app.use((req, res, next) => {
    const timestamp = chalk.blue(`[${new Date().toISOString()}]`);
    const method = chalk.yellow(req.method);
    const url = chalk.yellow(req.url);
    const body = chalk.green(JSON.stringify(req.body));
    const apiKey = req.headers['x-api-key'];

    const apiKeyInfo = apiKey
        ? chalk.gray(`Api-key provided`)
        : chalk.red('No api-key provided');

    res.setHeader('Content-Type', 'application/json');

    console.log(`${timestamp} ${method} ${url} ${body} ${apiKeyInfo}`);
    next(); // Pasar al siguiente middleware
});

app.use((err, req, res, next) => {
    console.error('Error detectado:', err.stack);
    res.status(500).send('Internal server error');
});

// Configuración del puerto
const LISTENPORT = process.env.LISTENPORT || 3004;
server.listen(LISTENPORT, () => {
    console.log(`Servidor corriendo en el puerto ${LISTENPORT}`);
});
//#endregion

// MySQL connection configuration (Configuracion de la conexion a MySQL)
const dbConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) // Asegúrate de convertir esto a número
};

// Crear un pool de conexiones MySQL
const conexionOrbet = mysql.createPool(dbConfig);

module.exports = {
    conexionOrbet,  // Exportar como objeto
};

async function handleDisconnect() {
    try {
        const connection = await conexionOrbet.getConnection(); // Obtener una conexión
        console.log('Successfully connected to MySQL OrbetDB');
        connection.release(); // Liberar la conexión al pool
    } catch (error) {
        console.error('Error connecting to MySQL:', error);
        setTimeout(handleDisconnect, 2000); // Reintentar la conexión después de 2 segundos
    }
}

// Manejar errores en el pool de conexiones
conexionOrbet.on('error', error => {
    console.error('MySQL connection error:', error);
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Lost connection to MySQL(Orbet). Attempting to reconnect...');
        handleDisconnect(); // Intentar reconectar
    } else {
        throw error; // Lanza otros errores no relacionados con pérdida de conexión
    }
});

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

// Middleware para registrar eventos
io.use((socket, next) => {
    console.log('Middleware de Socket:', socket.id);
    // Continuar con la conexión del socket
    next();
});

//setting for emails
// Email connection (Conexion a Correo)
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Almacén temporal de usuarios conectados
const connectedClients = new Map();

const userMessageLimits = new Map();

// Manejo de conexiones socket.io
io.on('connection', async (socket) => {
    console.log(`Nuevo usuario conectado: ID=${socket.id}, IP=${socket.handshake.address}`);
    let params = socket.handshake.query;
    let token = params.token;
    let user = null;
    // Middleware para cada evento recibido (antes de procesar los eventos)
    socket.use((packet, next) => {
        console.log(`Evento recibido: ${packet[0]}, Datos:`, (packet[1] || []));
        next(); // Pasa al siguiente manejador
    });

    socket.on('disconnect', function () {
        console.log(`Usuario desconectado: ID=${socket.id}, IP=${socket.handshake.address}`);
        if (token) {
            try {
                if (user.id) {
                    connectedClients.delete(user.id);
                    io.emit('userStatusUpdate', { userId: user.id, status: 'offline' });
                    updateUserStatus(user.id, 'offline', {
                        ip: socket.handshake.address,
                        coordinates: getCoordinates('190.242.38.178'),
                        eventType: 'User sign out', token
                    });
                }
            }
            catch (error) {
                console.error('Error processing token:', error);
            }
        }
    });

    socket.on('getUsers', async () => {
        try {
            // Llamada a la función que obtiene los usuarios con sus balances
            const users = await getUsersWithBalances();

            console.log('Users:', users);

            // Emitimos los resultados de vuelta al cliente
            socket.emit("onGetUserList", {
                users: users || null,
                status: true
            });
        } catch (err) {
            console.error('Error fetching users:', err);

            // Emitimos un mensaje de error si algo falla
            socket.emit("onGetUserList", {
                users: null,
                status: false
            });
        }
    });

    socket.on('getUser', async (data) => {
        if (!data.id) {
            console.error('ID de usuario no proporcionado');
            return socket.emit("onGetUserData", { user: null, status: false });
        }

        try {
            const user = await getUserDataById(data.id);
            socket.emit("onGetUserData", {
                user: user,
                status: true
            });
        } catch (err) {
            console.error('Error al obtener el usuario:', err);
            socket.emit("onGetUserData", {
                user: null,
                status: false
            });
        }
    });

    socket.on('getTagsNGroups', async function () {
        try {
            // Llamar a la función que obtiene tags y grupos
            const tagsNgroups = await getAllTagsAndGroups();

            // Emitir los resultados al cliente
            socket.emit("onGetTagsNGroups", {
                status: true,
                tags: tagsNgroups.tags,
                groups: tagsNgroups.groups
            });
        } catch (err) {
            // Manejar error si algo salió mal
            console.error('Error fetching tags and groups:', err);
            socket.emit("onGetTagsNGroups", {
                status: false,
                tags: null,
                groups: null
            });
        }
    });

    socket.on('setTags', async function (data) {
        if (data.id && Array.isArray(data.tags)) {
            const userId = data.id;

            try {
                // Elimina todos los tags del usuario
                await executeQueryFromPoolAsync(conexionOrbet, `DELETE FROM user_tags WHERE user_id = ?`, [userId]);

                // Si no hay tags, solo emitimos que se eliminaron correctamente
                if (data.tags.length === 0) {
                    console.log(`Se eliminaron todos los tags para el usuario ${userId}`);
                    return socket.emit("onGetResultSaveUser", { status: true });
                }

                // Si hay tags, construimos la consulta para insertar nuevos tags
                const insertQuery = `
                    INSERT INTO user_tags (user_id, tag_id)
                    VALUES ${data.tags.map(() => '(?, ?)').join(', ')}
                `;
                const queryParams = data.tags.flatMap(tag => [userId, tag.tag_id]);

                await executeQueryFromPoolAsync(conexionOrbet, insertQuery, queryParams);

                console.log(`Tags actualizados para el usuario ${userId}:`, data.tags);
                socket.emit("onGetResultSaveUser", { status: true });

            } catch (error) {
                console.error('Error al procesar los tags para el usuario:', error);
                socket.emit("onGetResultSaveUser", { status: false });
            }
        } else {
            console.error('Datos inválidos para setTags:', data);
            socket.emit("onGetResultSaveUser", { status: false });
        }
    });

    socket.on('setGroups', async function (data) {
        if (data.id && Array.isArray(data.groups)) {
            const userId = data.id;

            try {
                // Elimina todos los grupos existentes para el usuario
                await executeQueryFromPoolAsync(conexionOrbet, `DELETE FROM user_groups WHERE user_id = ?`, [userId]);

                // Si no hay grupos, simplemente emitimos que se eliminaron correctamente
                if (data.groups.length === 0) {
                    console.log(`Se eliminaron todos los grupos para el usuario ${userId}`);
                    return socket.emit("onGetResultSaveUser", { status: true });
                }

                // Construye dinámicamente la consulta para insertar nuevos grupos
                const insertQuery = `
                    INSERT INTO user_groups (user_id, group_id)
                    VALUES ${data.groups.map(() => '(?, ?)').join(', ')}
                `;
                const queryParams = data.groups.flatMap(group => [userId, group.group_id]);

                await executeQueryFromPoolAsync(conexionOrbet, insertQuery, queryParams);

                console.log(`Grupos actualizados para el usuario ${userId}:`, data.groups);
                socket.emit("onGetResultSaveUser", { status: true });

            } catch (error) {
                console.error('Error al actualizar los grupos:', error);
                socket.emit("onGetResultSaveUser", { status: false });
            }
        } else {
            console.error('Datos inválidos para setGroups:', data);
            socket.emit("onGetResultSaveUser", { status: false });
        }
    });

    socket.on('setComments', async function (data) {
        const { user_id, userId_admin, comment_text } = data;
        const created_at = new Date();

        try {
            // Obtener el correo del administrador usando su ID
            const adminEmailQuery = `SELECT email FROM admins WHERE admin_id = ?`;
            const results = await executeQueryFromPoolAsync(conexionOrbet, adminEmailQuery, [userId_admin]);

            if (results.length === 0) {
                socket.emit('commentSaved', { status: false, message: 'Admin not found' });
                return;
            }

            const admin_email = results[0].email;

            // Insertar el comentario en la base de datos
            const insertCommentQuery = `
                INSERT INTO user_comments (user_id, admin_email, comment_text, created_at) 
                VALUES (?, ?, ?, ?)
            `;
            await executeQueryFromPoolAsync(conexionOrbet, insertCommentQuery, [user_id, admin_email, comment_text, created_at]);

            console.log('Comment saved successfully');
            socket.emit('commentSaved', {
                status: true,
                message: 'Comment saved successfully',
                user_id,
                admin_email,
                comment_text,
                created_at
            });
        } catch (err) {
            console.error('Error saving comment:', err);
            socket.emit('commentSaved', { status: false, message: 'Error saving comment' });
        }
    });

    socket.on('changeUserStatus', async function (data) {
        const { id, status } = data;
        console.log(`Solicitud para cambiar el estado del usuario recibida. ID: ${id}, Estado: ${status}`);

        try {
            const query = `UPDATE users SET status = ? WHERE user_id = ?`;
            await executeQueryFromPoolAsync(conexionOrbet, query, [status, id]);

            console.log(`Estado del usuario actualizado correctamente.`);
            socket.emit('onChangeUserStatusResult', { status: true, userStatus: status });
        } catch (error) {
            console.error('Error al actualizar el estado del usuario:', error);
            socket.emit('onChangeUserStatusResult', { status: false, userStatus: null });
        }
    });

    socket.on('Setsuspicious', async function (data) {
        const query = `
            INSERT INTO user_suspicions (user_id, created_at, updated_at, failed_check_comment)
            VALUES (?, NOW(), NOW(), ?);
        `;

        try {
            // Usamos la función executeQueryFromPoolAsync para ejecutar la consulta
            await executeQueryFromPoolAsync(conexionOrbet, query, [data.id, data.failed_check_comment]);

            console.log('Sospecha registrada con éxito');
            socket.emit('Setsuspicious', { status: true, message: 'Suspicion correctly registered.' });
        } catch (error) {
            console.error('Error al insertar en la tabla user_suspicions:', error);
            socket.emit('Setsuspicious', { status: false, message: 'Error in registering the suspicion.' });
        }
    });

    // Evento para manejar el cambio de balance
    socket.on('balanceChangeBalance', async function (data) {
        console.log(JSON.stringify(data));

        try {
            // Llamada a la función que maneja el cambio de balance
            const result = await handleBalanceChangeBalance(data);
            socket.emit("changeBalanceResponse", result);
        } catch (error) {
            // Manejo de errores
            socket.emit("changeBalanceResponse", { status: error.success, message: error.message });
        }
    });

    socket.on('transactionChangeBalance', async (data) => {
        try {
            const result = await handleTransactionChangeBalance(data);
            socket.emit('changeBalanceResponse', result);
        } catch (error) {
            socket.emit('changeBalanceResponse', { success: false, message: error.message });
        }
    });

    socket.on('giftChangeBalance', async (data) => {
        try {
            const result = await handleGiftChangeBalance(data);
            socket.emit('changeBalanceResponse', result);
        } catch (error) {
            socket.emit('changeBalanceResponse', { success: false, message: error.message });
        }
    });

    socket.on('loginUser', async function (data) {
        const { email, pass } = data;

        console.log("Un usuario está intentando iniciar sesión");

        try {
            // Consulta la base de datos
            const results = await executeQueryFromPoolAsync(conexionOrbet, 'SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
            if (results.length === 0) {
                console.error("Usuario no encontrado");
                socket.emit("loginError", { message: "User not found" });
                return;
            }

            if (results[0].byProvider >= 1) {
                if (results[0].password_hash == 'PROVIDER_BY_THIRDPARTY') {
                    console.error("el usuario usa un proveedor");
                    socket.emit("loginError", { message: "Account is by third party provider" });
                    return;
                }
            }

            const user = results[0];
            console.log("Usuario encontrado");

            // Verificar la contraseña
            const isValid = await verifyPassword(pass, _user.password_hash);

            if (isValid) {
                // Generar un token JWT con la información del usuario
                const _token = jwt.sign(
                    { id: _user.user_id, email: _user.email },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' } // El token expira en 1 hora
                );
                token = _token;
                user = { id: _user.user_id, email: _user.email };
                if (connectedClients.has(_user.user_id)) {
                    connectedClients.get(_user.user_id).close(4000, 'User already connected');
                }
                connectedClients.set(_user.user_id, socket); // Guardar la conexión en el almacén

                // Reactivar si el usuario está inactivo
                if (_user.status === 'inactive') {
                    await reactivateUser(_user.user_id, 'login');
                }

                // 2. Actualizar el estado del usuario en la base de datos
                updateUserStatus(_user.user_id, 'online', {
                    ip: socket.handshake.address,
                    coordinates: getCoordinates('190.242.38.178'),
                    eventType: 'User signed in', token
                });

                if (_user.user_id) {
                    socket.join(`user_${_user.user_id}`);
                    console.log(`User ${_user.user_id} joined their notification room.`);
                }

                io.emit('userStatusUpdate', { userId: _user.user_id, status: 'online' });

                const [sessions] = await conexionOrbet.query(`
                    SELECT ip, coordinates FROM user_sessions
                    WHERE user_id = ? AND status = 'active'
                `, [_user.user_id]);

                for (const session of sessions) {
                    const distance = calculateDistance(socket.handshake.address, session.coordinates);
                    if (distance > geoDistanceThreshold) {
                        // Registrar en tabla `chat_risk_events`
                        await logRiskEvent(
                            _user.user_id,
                            'suspicious_login',
                            `Concurrent logins detected from different locations. Distance: ${distance.toFixed(2)} km`
                        );

                        socket.emit('warning', { message: 'Suspicious activity detected in your account' });
                        break;
                    }
                }

                socket.emit("loginSuccess", { message: "Inicio de sesión exitoso", token: _token });
                console.log("Usuario autenticado");
            } else {
                socket.emit("loginError", { message: "Contraseña incorrecta" });
                console.log("Contraseña incorrecta");
            }
        } catch (err) {
            console.error("Error en la consulta de login:", err);
            socket.emit("loginError", { message: "Error en el servidor" });
        }
    });

    socket.on("registerUser", async (data) => {
        const { email, username, inputName, pass } = data;

        console.log("Intentando registrar un nuevo usuario");

        try {
            // Verificar si el email o nombre de usuario ya existen
            const [existingUsers] = await executeQueryFromPoolAsync(conexionOrbet, 'SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);

            if (existingUsers.length > 0) {
                socket.emit("registerError", { message: "Email or username is already in use" });
                return;
            }

            // Hashear la contraseña con bcrypt
            const hashedPassword = sha512(pass);

            // Insertar el nuevo usuario en la base de datos
            const [result] = await executeQueryFromPoolAsync(conexionOrbet,
                'INSERT INTO users (email, name, username, 	password_hash) VALUES (?, ?, ?, ?)',
                [email, inputName, username, hashedPassword]
            );

            // Generar un token JWT para iniciar sesión automáticamente
            const token = jwt.sign(
                { id: result.insertId, email: email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' } // El token expira en 1 hora
            );

            socket.emit("registerSuccess", { message: "Registro exitoso", token });
            console.log("Usuario registrado y autenticado");

        } catch (err) {
            console.error("Error en el registro:", err);
            socket.emit("registerError", { message: "Error en el servidor" });
        }
    });

    socket.on('setDuplications', async (data) => {
        const { userId, otherUserId, reasonUuid } = data; // Recibe el ID del usuario actual, el otro usuario y la razón de la duplicación

        // Verifica que al menos uno de los campos (reasonUuid o otherUserId) esté presente
        if (!reasonUuid && !otherUserId) {
            socket.emit('setDuplicationsResponse', { success: false, message: 'Faltan datos necesarios (reasonUuid o otherUserId)' });
            return;
        }

        // Verifica si el reasonUuid es válido (si se pasa uno)
        if (reasonUuid) {
            const reasonCheckQuery = `
                SELECT COUNT(*) AS count FROM duplicity_reasons WHERE reason_uuid = ?;
            `;
            const reasonCount = await executeQueryFromPoolAsync(conexionOrbet, reasonCheckQuery, [reasonUuid]);

            if (reasonCount[0].count === 0) {
                socket.emit('setDuplicationsResponse', { success: false, message: 'El reasonUuid no existe en duplicity_reasons' });
                return;
            }
        }

        // Verificar si ya existe un registro con la misma combinación de user_id, reason_uuid o duplicated_user_id
        let checkExistenceQuery = `
            SELECT * FROM user_duplications 
            WHERE user_id = ? 
            AND (reason_uuid = ? OR duplicated_user_id = ?)
        `;
        let checkParams = [userId, (reasonUuid || null), (otherUserId || null)];
        const existingRecord = await executeQueryFromPoolAsync(conexionOrbet, checkExistenceQuery, checkParams);

        if (existingRecord.length > 0) {
            // Si el registro ya existe, solo actualizamos el updated_at
            const updateQuery = `
                UPDATE user_duplications
                SET updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND (reason_uuid = ? OR duplicated_user_id = ?)
            `;
            await executeQueryFromPoolAsync(conexionOrbet, updateQuery, checkParams);
            socket.emit('setDuplicationsResponse', { success: true, message: 'Duplicación actualizada correctamente' });
        } else {
            // Si el registro no existe, insertamos un nuevo registro
            let insertQuery = '';
            let queryParams = [];

            if (reasonUuid && !otherUserId) {
                insertQuery = `
                    INSERT INTO user_duplications (user_id, reason_uuid, created_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                `;
                queryParams = [userId, reasonUuid];
            } else if (otherUserId && !reasonUuid) {
                insertQuery = `
                    INSERT INTO user_duplications (user_id, duplicated_user_id, created_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                `;
                queryParams = [userId, otherUserId];
            } else if (reasonUuid && otherUserId) {
                insertQuery = `
                    INSERT INTO user_duplications (user_id, reason_uuid, duplicated_user_id, created_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                `;
                queryParams = [userId, reasonUuid, otherUserId];
            }

            await executeQueryFromPoolAsync(conexionOrbet, insertQuery, queryParams);
            socket.emit('setDuplicationsResponse', { success: true, message: 'Duplicación registrada correctamente' });
        }
    });

    socket.on('assignAffiliate', async (data) => {
        const { userId, affiliateUrl } = data;

        // Validación de datos
        if (!userId || !affiliateUrl) {
            socket.emit('assignAffiliateResponse', {
                success: false,
                message: 'Missing required data (userId or affiliateUrl)',
            });
            return;
        }

        try {
            // Consulta para verificar si ya existe el registro
            const checkQuery = `
                SELECT assignment_id FROM user_stag_assignment
                WHERE user_id = ? AND affiliate_url = ?
            `;
            const existingRecord = await executeQueryFromPoolAsync(conexionOrbet, checkQuery, [userId, affiliateUrl]);

            if (existingRecord.length > 0) {
                // Si ya existe, enviar respuesta indicando que ya está asignado
                socket.emit('assignAffiliateResponse', {
                    success: false,
                    message: 'The user is already assigned this affiliate URL',
                });
            } else {
                // Si no existe, insertar el nuevo registro
                const insertQuery = `
                    INSERT INTO user_stag_assignment (user_id, affiliate_url, assigned_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                `;
                await executeQueryFromPoolAsync(conexionOrbet, insertQuery, [userId, affiliateUrl]);

                // Emitir respuesta exitosa
                socket.emit('assignAffiliateResponse', {
                    success: true,
                    message: 'Affiliate URL correctly assigned to the user',
                });
            }
        } catch (error) {
            console.error('Error al asignar Affiliate URL:', error);

            // Emitir mensaje de error
            socket.emit('assignAffiliateResponse', {
                success: false,
                message: 'There was a problem assigning the affiliate URL',
            });
        }
    });

    //#region Chat system

    socket.on('sendMessage', async (message) => {
        try {
            const now = Date.now();

            if (!userMessageLimits.has(user.id)) {
                userMessageLimits.set(user.id, []);
            }

            const timestamps = userMessageLimits.get(user.id);
            timestamps.push(now);

            // Filtrar mensajes más antiguos que un minuto
            const recentTimestamps = timestamps.filter(ts => now - ts < 60000);

            if (recentTimestamps.length > 10) { // Más de 10 mensajes en un minuto
                await logRiskEvent(user.id, 'rate_limit', 'User is sending many messages in a short time');
                return socket.emit('rateLimitMessage', { message: 'You are sending messages too quickly' });
            }

            userMessageLimits.set(user.id, recentTimestamps);

            const parsedMessage = JSON.parse(message);
            await handleMessage(socket, parsedMessage, user);
        } catch (error) {
            console.error('Error processing message:', error);
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
        }
    });

    //#endregion

    if (token) {
        try {
            user = decodedJwt(token, process.env.JWT_SECRET);
            if (user) {
                return;
            }
            if (!user.id) {
                socket.close(4001, 'Authentication token invalid');
                return;
            }

            if (connectedClients.has(user.id)) {
                connectedClients.get(user.id).close(4000, 'User already connected');
            }
            connectedClients.set(user.id, socket); // Guardar la conexión en el almacén

            // 2. Actualizar el estado del usuario en la base de datos
            updateUserStatus(user.id, 'online', {
                ip: socket.handshake.address,
                coordinates: getCoordinates('190.242.38.178'),
                eventType: 'User signed in', token
            });

            if (user.id) {
                socket.join(`user_${user.id}`);
                console.log(`User ${user.id} joined their notification room.`);
            }

            io.emit('userStatusUpdate', { userId: user.id, status: 'online' });

            const [sessions] = await conexionOrbet.query(`
                SELECT ip, coordinates FROM user_sessions
                WHERE user_id = ? AND status = 'active'
            `, [user.id]);

            for (const session of sessions) {
                const distance = calculateDistance(socket.handshake.address, session.coordinates);
                if (distance > geoDistanceThreshold) {
                    // Registrar en tabla `chat_risk_events`
                    await logRiskEvent(
                        user.id,
                        'suspicious_login',
                        `Concurrent logins detected from different locations. Distance: ${distance.toFixed(2)} km`
                    );

                    socket.emit('warning', { message: 'Suspicious activity detected in your account' });
                    break;
                }
            }
        }
        catch (error) {
            console.error('Error processing token:', error);
        }
    }
});

handleDisconnect();
//----------------------------------------

// Example
// --> ip http://34.30.25.172:3004/testSocket
// --> wss https://orbet-api.gambleverse.store/testSocket

//#region Chat System

async function handleMessage(ws, message, user) {
    const { type, data } = message;

    switch (type) {
        case 'chatMessage':
            await sendChatMessage(user.id, data);
            break;

        case 'supportRequest':
            await notifySupport(user.id, data);
            break;

        default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type.' }));
            break;
    }
}

async function sendChatMessage(userId, { recipientId, content }) {
    if (!recipientId || !content) {
        return connectedClients.get(userId)?.send(
            JSON.stringify({ type: 'error', message: 'Recipient and content are required.' })
        );
    }

    // return message to sender with status by socket emit
    const senderSocket = connectedClients.get(userId);

    const foundWords = prohibitedWords.filter(word => content.toLowerCase().includes(word));

    if (foundWords.length > 0) {
        // Registrar en tabla `chat_risk_events`
        await logRiskEvent(
            userId,
            'prohibited_content',
            `Message contains prohibited words: ${foundWords.join(', ')}`
        );

        return senderSocket.emit('messageStatus', { message: 'Your message contains prohibited content' });
    }

    const lastMessage = userLastMessage.get(userId);

    if (lastMessage === content) {
        // Registrar en tabla `chat_risk_events`
        await logRiskEvent(userId, 'repeated_message', 'User sent repeated messages');

        return senderSocket.emit('messageStatus', { message: 'Do not send repeated messages' });
    }

    userLastMessage.set(userId, content);

    content = encryptMessage(content);
    // Guardar el mensaje en la base de datos
    await conexionOrbet.query(
        `INSERT INTO chat_messages (sender_id, recipient_id, content, sent_at) VALUES (?, ?, ?, NOW())`,
        [userId, recipientId, content]
    );

    // Enviar el mensaje al destinatario si está conectado
    const recipientSocket = connectedClients.get(recipientId);

    if (recipientSocket) {
        // verificar si el usuario tiene en la lista de ignorados al usuario que envia.
        const [results] = await conexionOrbet.query(
            `SELECT * FROM user_ignores WHERE user_id = ? AND ignored_user_id = ?`,
            [recipientId, userId]
        );

        if (results.length > 0) {
            console.log(`User ${recipientId} has ignored messages from User ${userId}.`);
            senderSocket.emit('messageStatus', {
                status: `User ${recipientId} has ignored your messages.`
            });
            return;
        }
        recipientSocket.emit("recieveMessage", JSON.stringify({ type: 'chatMessage', senderId: userId, content }));
    }
    else {
        console.log(`User ${recipientId} is not connected to the chat.`);
    }

    senderSocket.emit('messageStatus', {
        status: "message " + (recipientSocket ? 'sent' : 'not sent') + " to " + recipientId
    });
}

async function notifySupport(userId, { subject, message }) {
    if (!subject || !message) {
        return connectedClients.get(userId)?.send(
            JSON.stringify({ type: 'error', message: 'Subject and message are required.' })
        );
    }

    // Lógica para notificar al soporte
    console.log(`Support request from User ${userId}:`, { subject, message });
    // Aquí podrías agregar lógica para enviar una notificación al equipo de soporte
}

const geoDistanceThreshold = 500;

// Función para calcular distancia geográfica entre dos coordenadas
function calculateDistance(coord1, coord2) {
    const [lat1, lon1] = coord1.split(',').map(Number);
    const [lat2, lon2] = coord2.split(',').map(Number);

    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const prohibitedWords = ['badword1', 'badword2', 'spamword'];

const userLastMessage = new Map();

async function logRiskEvent(userId, eventType, description) {
    try {
        await conexionOrbet.query(`
            INSERT INTO chat_risk_events (user_id, event_type, description, detected_at)
            VALUES (?, ?, ?, NOW())
        `, [userId, eventType, description]);
        console.log(`Risk event logged: ${eventType} - ${description}`);
    } catch (error) {
        console.error('Error logging risk event:', error);
    }
}

//#endregion

//#region notifications service

const notificationsService = {
    async notify(sender_id, userId, type, message, data) {
        try {
            // Insert the notification into the database
            const [result] = await conexionOrbet.query(`
                INSERT INTO notifications (user_id, type, message)
                VALUES (?, ?, ?)
            `, [userId, type, message]);

            const ignoredUsers = await executeQueryFromPoolAsync(conexionOrbet, `
                SELECT ignored_user_id 
                FROM user_ignores 
                WHERE user_id = ?
            `, [userId]);

            // Desencriptar la lista de usuarios ignorados
            const decryptedIgnoredUsers = ignoredUsers.map(user => ({
                ignored_user_id: decrypt(user.ignored_user_id),
            }));

            // Verificar si el usuario ya está en la lista de ignorados
            const alreadyIgnored = decryptedIgnoredUsers.some(
                user => user.ignored_user_id.toString() === sender_id.toString()
            );

            if (alreadyIgnored) {
                return console.log(`User ${userId} has ignored notifications from User ${sender_id}.`);
            }

            const recipientSocket = connectedClients.get(userId);
            // Emit the notification via WebSocket to the connected user
            if (recipientSocket) {
                console.log(`User ${userId} is connected to the chat.`);
                recipientSocket.emit('notification', {
                    notification_id: result.insertId,
                    type,
                    message,
                    status: 'unread',
                    created_at: new Date(),
                    info: data || {}
                });
            }
            else {
                console.log(`User ${userId} is not connected to the chat.`);
            }
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    },

    async markAsRead(notificationId) {
        try {
            await conexionOrbet.query(`
                UPDATE notifications 
                SET status = 'read' 
                WHERE notification_id = ?
            `, [notificationId]);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
};

//#endregion

//#region status user online/offline

// Actualizar el estado de usuario en la base de datos y en user_sessions
async function updateUserStatus(userId, status, sessionData = {}) {
    let { ip, coordinates, eventType = 'status_update', token } = sessionData;
    token = encrypt(token);
    ip = encrypt(ip);
    try {
        // Actualizar el estado en la tabla user_presence
        await conexionOrbet.query(
            `INSERT INTO user_presence (user_id, status, last_active)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE status = ?, last_active = NOW()`,
            [userId, status, status]
        );

        // Verificar si el usuario ya tiene una sesión activa
        const [existingSessions] = await conexionOrbet.query(
            `SELECT * FROM user_sessions 
             WHERE user_id = ? AND status = 'active' LIMIT 1`,
            [userId]
        );

        if (existingSessions.length > 0) {
            // Si ya existe una sesión activa, actualizarla
            await conexionOrbet.query(
                `UPDATE user_sessions
                 SET status = ?, updated_at = NOW(), ip = ?, coordinates = ?, event_type = ?
                 WHERE user_id = ? AND status = 'active'`,
                [status, ip, coordinates.ll, eventType, userId]
            );
        } else {
            // Si no existe, crear una nueva sesión
            await conexionOrbet.query(
                `INSERT INTO user_sessions (
                     user_id, status, ip, coordinates, country, address, event_type, created_at, updated_at, token
                 ) VALUES (?, ?,?, POINT(?, ?), ?, ?, ?, NOW(), NOW(), ?);`,
                [userId, status, ip, coordinates.ll[0], coordinates.ll[1], coordinates.country, coordinates.city, eventType, token]
            );
        }

        console.log(`Updated user ${userId} status to ${status} in both tables`);
    } catch (error) {
        console.error('Error updating user status:', error);
    }
}

//#endregion

//#region APIS

app.get("/Users", ReturnUserList);
app.get("/Users/:id*", ReturnUserData);
app.post("/login", LoginAdmin);
app.post("/Logout", LogoutAdmin);
app.post("/Games", GetGamesList);
app.get("/testSocket", function (req, res) {
    return res.status(200).send('El socket api esta ok');
});

app.get("/logs/admin/:id*", getAdminLogs);
app.get("/logs/user/:id*", getUserLogs);
app.get("/reports/user/:format/:id", exportReportUser);
app.get("/summaryReport/:day/:format/", exportDailyReport);
app.get("/summaryMonthlyReport/:year/:month/:format/", exportMonthlyReport);

//obtiene las transacciones ya sea por id, por usuario o general.
app.get("/transaction/:id*", getTransaction);
app.get("/Alltransactions*", getAllTransaction);
app.get("/transactionsUser/:userid*", getTransactionUser);
app.post("/testSecurity/", TestJwtIntegration);

app.get("/testConsent/:userid", testConsent);
app.get("/checkConsent/:userid", checkConsent);

app.post("/api/2fa/validate-2fa", validate2fa);
app.post("/api/2fa/request2fa", request2fa);
app.post("/api/2fa/isenable2fa", IsEnable2FA);

//manejo de inicio de sesion con google!
app.get("/auth/google", function (req, res, next) {
    //req.session.IP = req.network.ip; // almacena temporalmente la ip del usuario
    passport.authenticate(
        "google", { scope: ["profile", "email"] }
    )(req, res, next);
});

app.get('/link/google/:userToken/', function (req, res, next) {
    req.session.userToken = req.params.userToken; // Almacena temporalmente el token en la sesión
    passport.authenticate(
        "google", { scope: ["profile", "email"] }
    )(req, res, next);
});

app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/webapp/login.html", failureFlash: true }),
    async (req, res) => {
        const user_email = req.user.emails[0].value;

        if (typeof user_email === 'undefined' || user_email == null) {
            return res.status(503).send(`access forbbiden`);
        }

        const user_ID = await getUserIdByProvider(2, req.user.id);

        let token2 = "fail_token";

        if (user_ID < 1) {
            console.log("fallo al obtener el usuario!");
            return res.status(503).send(`access forbbiden`);
        } else {
            token2 = jwt.sign(
                { id: user_ID, email: user_email },
                SECRET_KEY,
                { expiresIn: '1h' } // El token expira en 1 hora
            );
        }



        console.log("token 2b: " + token2);

        res.redirect(`/storeToken.html?token=${token2}&&provider=google`); // Redirige a una ruta para almacenar el token
    });

app.get("/webapp/dashboard2", (req, res) => {
    res.send(`Welcome ${req.user.displayName} \r\n `);
});
//------------------------------------------
//manejo de inicio de sesion con Facebook
app.get("/auth/facebook",
    passport.authenticate("facebook")
);

//link facebook account
app.get('/link/facebook/:userToken/', function (req, res, next) {
    req.session.userToken = req.params.userToken; // Almacena temporalmente el token en la sesión

    console.log("request token: ", req.userToken);

    passport.authenticate(
        "facebook"
    )(req, res, next);
});

app.get("/auth/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/webapp/login.html", failureFlash: true }), async (req, res) => {
    const user_email = req.user.emails[0].value;

    if (typeof user_email === 'undefined' || user_email == null) {
        return res.status(503).send(`access forbbiden`);
    }

    const user_ID = await getUserIdByProvider(3, req.user.id);

    let token2 = "fail_token";

    if (user_ID < 1) {
        console.log("fallo al obtener el usuario!");
        return res.status(503).send(`access forbbiden`);
    } else {
        token2 = jwt.sign(
            { id: user_ID, email: user_email },
            SECRET_KEY,
            { expiresIn: '1h' } // El token expira en 1 hora
        );
    }



    console.log("token 2b: " + token2);


    res.redirect(`/storeToken.html?token=${token2}&&provider=facebook`); // Redirige a una ruta para almacenar el token
});

//------------------------------------------
//manejo de inicio de sesion con twitch
app.get("/auth/twitch/callback", passport.authenticate("twitch", { failureRedirect: "/" }), async function (req, res) {
    const user_email = req.user.emails[0].value;

    if (typeof user_email === 'undefined' || user_email == null) {
        return res.status(503).send(`access forbbiden`);
    }

    const user_ID = await getUserIdByProvider(4, req.user.id);

    let token2 = "fail_token";

    if (user_ID < 1) {
        console.log("fallo al obtener el usuario!");
        return res.status(503).send(`access forbbiden`);
    } else {
        token2 = jwt.sign(
            { id: user_ID, email: user_email },
            SECRET_KEY,
            { expiresIn: '1h' } // El token expira en 1 hora
        );
    }



    console.log("token 2b: " + token2);


    res.redirect(`/storeToken.html?token=${token2}&&provider=twitch`); // Redirige a una ruta para almacenar el token
});

app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));

app.get('/link/twitch/:userToken/', function (req, res, next) {
    req.session.userToken = req.params.userToken; // Almacena temporalmente el token en la sesión
    passport.authenticate(
        "twitch", { scope: 'user_read' }
    )(req, res, next);
});

app.get('/settings/getlinkeds/:token/', GetLinkedAccounts);

//------------------------------------------------------------------------------------
app.get("/logout", (req, res) => {
    try {
        req.logout(() => {
            res.setHeader('Content-Type', 'text/html'); // Especifica que el contenido es HTML
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Logout</title>
                </head>
                <body>
                    <h2>Redirecting to login</h2>
                    <script>
                        // Limpiar el localStorage
                        localStorage.removeItem("authToken");
                        localStorage.clear();  // Limpia todo el almacenamiento local
                        // Redirigir al inicio de sesión
                        window.location.href = "/webapp/login.html";
                    </script>
                </body>
                </html>
            `);
        });
    } catch (e) {
        console.error("Algo falló al cerrar sesión:", e);
        res.redirect("/webapp/login.html");
    }
});
//------------------------------------------

app.get("/logs", getSystemLogs);

//The 404 Route (ALWAYS Keep this as the last route)
/*
app.get('*', function (req, res) {
    //si no consigue nada entonces enviar a la pagina 404.html
    res.sendFile("/public/404.html");
});
*/

// #endregion

// #region Funciones

//Crear log en el server
async function SaveServerLog(msg, tittle) {
    try {
        const currentDate = new Date().toISOString().slice(0, 19).replace("T", " "); // Get current date in YYYY-MM-DD HH:mm:ss format
        const query = "INSERT INTO systemlogs(tittle,msg,dateEvent) VALUES(?,?,?)";
        await executeQueryFromPoolAsync(conexionOrbet, query, [tittle, msg, currentDate]);
        console.log("msg guardado con exito en la bd!");
    } catch (error) {
        console.err("error", error);
    }
}

//obtiene el system logs
async function getSystemLogs(req, res) {
    try {
        const results = await executeQueryFromPoolAsync(conexionOrbet, "SELECT * FROM systemlogs", []);
        console.log("msg obtenido de la BD");
        res.status(200).json(results);
    } catch (error) {
        SaveServerLog("fail on get system logs", `${error}`);
        console.err("fail on get a log, its weird!, ", error);
    }
}

//obtiene la lista de usuarios y la retorna
async function ReturnUserList(req, res) {
    const query = 'SELECT user_id, name, email, created_at, status, role, country, currency, language FROM users';
    executeQueryFromPool(conexionOrbet, query, [], (error, results) => {
        if (error) {
            console.error('Error en ReturnUserList:', error);
            res.status(500).json({ message: 'Server internal error, try again' });
        } else {
            results.map((playerUser) => {
                const userData = { ...playerUser }; // Copiar los datos del usuario
                const query2 = 'SELECT currency, balance, last_updated FROM user_balances WHERE user_id = ?';
                executeQueryFromPool(conexionOrbet, query2, [userData.user_id], (error, results2) => {
                    if (error) {
                        console.err("error", error);
                        res.status(500).json({ message: 'Server internal error, try again' });
                    } else {
                        const query3 = 'SELECT personal_id_number as phone, first_name, last_name, nickname, date_of_birth, gender, city, address, postal_code, mobile_phone FROM user_details WHERE user_id = ?';
                        executeQueryFromPool(conexionOrbet, query3, [userData.user_id], (error, results3) => {
                            if (error) {
                                console.err("error", error);
                                res.status(500).json({ message: 'Server internal error, try again' });
                            } else {
                                userData.balances = results2;
                                userData.details = results3;
                                res.status(200).json(userData);
                            }
                        });
                    }
                });
            });
        }
    });
}

//Obtiene la data de un usuario segun su ID
async function ReturnUserData(req, res, next) {
    try {

        const userId = req.params.id;
        if (userId == null || userId === 'undefined') {
            res.status(500).json({ message: 'User ID not provided' });
        }

        const query = 'SELECT user_id, name, email, created_at, status, role, country, currency, language FROM users WHERE user_id = ?';
        const [results1] = await executeQueryFromPoolAsync(conexionOrbet, query, [userId]);

        const UserList = [];

        // Usar Promise.all para esperar todas las consultas de balances
        const userPromises = results1.map(async (playerUser) => {
            const userData = { ...playerUser }; // Copiar los datos del usuario

            const query2 = 'SELECT currency, balance, last_updated FROM user_balances WHERE user_id = ?';
            const [results2] = await executeQueryFromPoolAsync(conexionOrbet, query2, [userData.user_id]);

            const query3 = 'SELECT personal_id_number as phone, first_name, last_name, nickname, date_of_birth, gender, city, address, postal_code, mobile_phone FROM user_details WHERE user_id = ?';
            const [results3] = await executeQueryFromPoolAsync(conexionOrbet, query3, [userData.user_id]);



            userData.balances = results2;
            userData.details = results3;
            return userData;
        });

        const usersWithBalances = await Promise.all(userPromises);
        res.status(200).json(usersWithBalances);
    } catch (error) {
        console.error('Error en ReturnUserList:', error);
        res.status(500).json({ message: 'Server internal error, try again' });
    }
}

// Función para obtener usuarios y sus balances llamando al stored procedure getUserListNBalance
async function getUsersWithBalances() {
    try {
        const query = `CALL getUserListNBalance()`;  // Llamar al procedimiento almacenado

        // Ejecutar la consulta y obtener las filas de la base de datos
        const rows = await executeQueryFromPoolAsync(conexionOrbet, query, []);
        const resultRows = rows[0]; // Asumimos que los resultados están en la primera fila

        // Reducir los resultados para agrupar por usuario
        const usersWithBalances = resultRows.reduce((acc, row) => {
            const { user_id, currency, balance, ...userData } = row;

            // Buscar si el usuario ya está en el acumulador
            const user = acc.find(user => user.user_id === user_id);

            if (user) {
                // Si ya está, agregar el balance al usuario
                user.balances.push({ currency, balance });
            } else {
                // Si no está, agregar un nuevo usuario con su balance
                acc.push({
                    ...userData,
                    user_id,
                    balances: [{ currency, balance }]
                });
            }

            return acc;
        }, []);

        console.log(usersWithBalances); // Opcional: para depuración
        return usersWithBalances; // Retorna los usuarios con sus balances
    } catch (error) {
        console.error('Error al obtener usuarios y balances:', error); // Manejo de errores
        throw error; // Lanza el error para que el que llame a esta función lo maneje
    }
}

// Función para obtener datos de usuario llamando al stored procedure getUserDataJSON
async function getUserDataById(userId) {
    try {
        const query = `CALL getUserDataJSON(?)`;

        // Ejecutamos la consulta utilizando executeQueryFromPoolAsync
        const results = await executeQueryFromPoolAsync(conexionOrbet, query, [userId]);

        // Comprobamos si los resultados están vacíos
        if (results.length === 0 || !results[0] || !results[0][0]) return null;

        // Accedemos a la propiedad 'jsonResult' de la primera fila de resultados
        const userData = results[0][0].jsonResult;

        // Verificamos si 'jsonResult' tiene datos válidos
        if (!userData) {
            console.error('Datos no encontrados para el usuario:', userId);
            return null;
        }

        // Retornamos los datos del usuario
        return userData;
    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        throw error; // Lanza el error para ser manejado por el bloque catch donde se llame esta función
    }
}

// Función para obtener tags y grupos llamando al query correspondiente
async function getAllTagsAndGroups() {
    try {
        const query = `
        SELECT 
            'group' AS type, 
            group_id AS id, 
            group_name AS name 
        FROM user_groups_list
        UNION ALL
        SELECT 
            'tag' AS type, 
            tag_id AS id, 
            tag_name AS name 
        FROM user_tags_list`;

        // Ejecutamos la consulta con la interfaz de promesas
        const [rows] = await executeQueryFromPoolAsync(conexionOrbet, query);

        // Filtrar y mapear los resultados en tags y grupos
        const tags = rows
            .filter(row => row.type === 'tag')
            .map(row => ({
                tag_id: row.id,
                tag_name: row.name
            }));

        const groups = rows
            .filter(row => row.type === 'group')
            .map(row => ({
                group_id: row.id,
                group_name: row.name
            }));

        // Retorna los resultados de los tags y grupos
        return { tags, groups };
    } catch (error) {
        console.error('Error al obtener los tags y grupos:', error);
        throw error; // Lanza el error para ser manejado en la función que llama a esta
    }
}

async function exportReportUser(req, res) {
    const userId = req.params.id;
    const format = req.params.format;

    try {
        if (format == "PDF") {
            //exportamos la data del usuario en pdf
            let userData = {};
            try {
                // Obtener la información del usuario desde la base de datos
                const query = 'SELECT * FROM users WHERE user_id = ?';
                const [userResults] = await executeQueryFromPoolAsync(conexionOrbet, query, [userId]);

                if (userResults.length === 0) {
                    SaveServerLog(error, 'User not found when try export report');
                    return res.status(404).send('User not found');
                }

                const userData = userResults[0];

                // Crear un nuevo documento PDF
                const doc = new PDFDocument({ margin: 30, layout: 'landscape', size: 'A4' });

                // Ruta para guardar temporalmente el PDF
                const pdfPath = path.join(__dirname, `user_${userData.user_id}.pdf`);
                const writeStream = fs.createWriteStream(pdfPath);

                // Pipe the document to a file
                doc.pipe(res);

                // Añadir título
                doc
                    .fontSize(20)
                    .text('User Information', { align: 'center' })
                    .moveDown(1.5);

                const created_at = `${userData.created_at}`;
                const createdTime = created_at.split("GMT")[0];
                // Definir la estructura de la tabla
                const tableData = {
                    headers: [
                        { label: "Name", width: 80, align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Email", width: 150, align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Created At", width: 160, align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "status", width: 60, align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Role", property: 'name', width: 80, align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Country", property: 'name', width: 80, align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Currency", property: 'name', width: 80, align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Language", property: 'name', width: 80, align: 'center', headerColor: "#58b5e1", valign: "center" }
                    ],
                    rows: [
                        [userData.name, userData.email, createdTime, userData.status, userData.role, userData.country, userData.currency, userData.language],
                    ]
                };

                // Usar pdfkit-table para generar la tabla
                await doc.table(tableData, {
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                    prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                });

                //get balances
                const balancesQuery = 'SELECT * FROM user_balances WHERE user_id = ?'
                const [balancesUser] = await executeQueryFromPoolAsync(conexionOrbet, balancesQuery, [userId]);

                if (balancesUser.length > 0) {
                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Balances', { align: 'center' })
                        .moveDown(1.5);

                    let balances = [];
                    balancesUser.forEach(balance => {
                        balances.push([
                            balance.currency, balance.balance, balance.last_updated.toISOString()
                        ]);
                        console.log([
                            balance.currency, balance.balance, balance.last_updated.toISOString()
                        ]);
                    });

                    const tableData2 = {
                        headers: [
                            { label: "Currency", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Balance", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Last updated", align: 'center', headerColor: "#58b5e1", valign: "center" }
                        ],
                        rows: balances
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                //get documents
                const documentUser = 'SELECT * FROM user_documents WHERE user_id = ? AND type = ?'
                const [documentsUser] = await executeQueryFromPoolAsync(conexionOrbet, documentUser, [userId, 'image']);
                const pageWidth = doc.page.width; // Obtener el ancho de la página

                if (documentsUser.length > 0) {
                    doc.lineWidth(2);

                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    const pageWidth = doc.page.width;
                    doc
                        .moveTo(50, doc.y) // Posición inicial (50 px desde el borde izquierdo, en la posición vertical actual)
                        .lineTo(pageWidth - 50, doc.y) // Posición final (50 px desde el borde derecho)
                        .stroke(); // Dibujar la línea

                    // Añadir espacio después de la línea
                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Documents', { align: 'center' })
                        .moveDown(1.5);



                    documentsUser.forEach(document => {
                        doc
                            .fontSize(14)
                            .text(document.description, { align: 'center' })
                            .moveDown(0.5);

                        const imagePath = document.file_path.includes("http") ? document.file_path : "/app/static/cdn_storage/Documents/" + document.file_path;
                        doc.image(imagePath, (pageWidth - 300) / 2, doc.y, { align: 'center', valign: 'center', width: 300 });

                        doc
                            .fillColor('black')
                            .moveDown(169);
                    });


                }

                //Activiy logs
                const queryActivity = 'SELECT * FROM users_activity_logs WHERE user_id = ?';
                const [activityUser] = await executeQueryFromPoolAsync(conexionOrbet, queryActivity, [userId]);

                if (activityUser.length > 0) {
                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Activity', { align: 'center' })
                        .moveDown(1.5);

                    let acivities = [];
                    activityUser.forEach(activity => {
                        acivities.push([
                            activity.action, activity.dateEvent
                        ]);
                    });

                    const tableData2 = {
                        headers: [
                            { label: "Action", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Date", align: 'center', headerColor: "#58b5e1", valign: "center" }
                        ],
                        rows: acivities
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                //ip logs
                const queryIps = 'SELECT * FROM user_ips WHERE user_id = ?';
                const [userIps] = await executeQueryFromPoolAsync(conexionOrbet, queryIps, [userId]);

                if (userIps.length > 0) {
                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Sessions Ip', { align: 'center' })
                        .moveDown(1.5);

                    let ip_list = [];
                    userIps.forEach(ip_data => {
                        ip_list.push([
                            ip_data.ip_address, ip_data.used_at.toISOString()
                        ]);
                    });

                    const tableData2 = {
                        headers: [
                            { label: "Ip Address", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Date", align: 'center', headerColor: "#58b5e1", valign: "center" }
                        ],
                        rows: ip_list
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                //latest payments
                const paymentQuery = 'SELECT * FROM user_latest_payments WHERE user_id = ?';
                const [paymentList] = await executeQueryFromPoolAsync(conexionOrbet, paymentQuery, [userId]);

                if (paymentList.length > 0) {
                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Latest payments', { align: 'center' })
                        .moveDown(1.5);

                    let payList = [];
                    paymentList.forEach(payItem => {
                        payList.push([
                            payItem.action, payItem.source, payItem.source_of_approval, payItem.amount, payItem.currency, payItem.finished_at.toISOString()
                        ]);
                    });

                    const tableData2 = {
                        headers: [
                            { label: "Action", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Source", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Aproval Admin", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Amount", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Currency", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Date", align: 'center', headerColor: "#58b5e1", valign: "center" }
                        ],
                        rows: payList
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                //latest payments
                const locksQuery = 'SELECT * FROM user_locks WHERE user_id = ?';
                const [locksHistory] = await executeQueryFromPoolAsync(conexionOrbet, locksQuery, [userId]);

                if (locksHistory.length > 0) {
                    // Añadir título
                    doc.addPage();

                    doc
                        .fontSize(20)
                        .text('Locks', { align: 'center' })
                        .moveDown(1.5);

                    let lockList = [];
                    locksHistory.forEach(LockItem => {
                        lockList.push([
                            LockItem.type, LockItem.comment
                        ]);
                        console.log([
                            LockItem.type, LockItem.comment
                        ]);
                    });

                    const tableData2 = {
                        headers: [
                            { label: "Type", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Reason", align: 'center', headerColor: "#58b5e1", valign: "center" }
                        ],
                        rows: lockList
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                // Finaliza el documento
                doc.end();

                // Esperar a que se complete la escritura del PDF y enviarlo como respuesta
                writeStream.on('finish', () => {
                    res.download(pdfPath, `user_${userData.user_id}.pdf`, (err) => {
                        if (err) {
                            console.error('Error sending the PDF:', err);
                            res.status(500).send('Error generating PDF');
                        }

                        console.log("report generated!");
                        // Eliminar el archivo temporal después de enviarlo
                        fs.unlinkSync(pdfPath);
                    });
                });

            } catch (error) {
                console.error('Error exporting user data to PDF:', error);
                res.status(500).send('Server error');
            }
        } else if (format == 'Excel') {
            // Crear un nuevo libro de trabajo
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('User information', { properties: { tabColor: { argb: '8888ff' } } });
            worksheet.mergeCells('A1:R1');
            worksheet.getCell('A1').value = 'User Information';

            // Aplicar estilo: centrar texto y ponerlo en negrita
            worksheet.getCell('A1').font = { bold: true, size: 14 }; // Tamaño y negrita
            worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }; // Centrar horizontal y verticalmente

            worksheet.addRow([]);

            // Definir la estructura de la tabla
            const tableHeaders = [
                "", "", "", "", "", "",
                "Name",
                "Email",
                "Created At",
                "Status",
                "Role",
                "Country",
                "Currency",
                "Language"
            ];

            const headerRowF = worksheet.addRow(tableHeaders);
            headerRowF.font = { bold: true };

            const columnWidths = [5, 5, 5, 5, 5, 20, 25, 30, 20, 20, 20, 20, 20, 20]; // Anchos de columna en números
            columnWidths.forEach((width, index) => {
                worksheet.getColumn(index + 1).width = width; // Ajustar el ancho de cada columna
            });

            const query = "SELECT * FROM users where user_id = ?";

            const [results] = await executeQueryFromPoolAsync(conexionOrbet, query, [userId]);
            if (results.length == 0) {
                SaveServerLog(error, 'User not found when try export report');
                res.status(500).json({ message: 'Server internal error, try again' });
            }

            const userData = results[0];

            // Añadir la información del usuario
            const created_at = `${userData.created_at}`;
            const createdTime = created_at.split("GMT")[0];
            const userRow = worksheet.addRow([
                "", "", "", "", "", "",
                userData.name,
                userData.email,
                createdTime,
                userData.status,
                userData.role,
                userData.country,
                userData.currency,
                userData.language
            ]);

            // Añadir un separador
            worksheet.addRow([]);
            worksheet.mergeCells('A6:R6');
            worksheet.getCell('A6').value = 'Balances';
            worksheet.getCell('A6').font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getCell('A6').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0070C0' }, // Color de fondo para el encabezado
            };

            worksheet.addRow([]);

            // Obtener los balances del usuario
            const balancesQuery = 'SELECT * FROM user_balances WHERE user_id = ?';
            const [balancesUser] = await executeQueryFromPoolAsync(conexionOrbet, balancesQuery, [userId]);

            // Añadir encabezados de balances
            const balanceHeaders = [
                "", "", "", "", "", "", "", "",
                "Currency",
                "Balance",
                "Last Updated"
            ];
            worksheet.addRow(balanceHeaders).font = { bold: true };
            worksheet.mergeCells('K8:L8');
            let IndexBalance = 9;

            // Añadir los balances
            if (balancesUser.length > 0) {
                balancesUser.forEach(balance => {
                    worksheet.addRow([
                        "", "", "", "", "", "", "", "",
                        balance.currency,
                        balance.balance,
                        balance.last_updated.toISOString()
                    ]);

                    worksheet.mergeCells(`K${IndexBalance}:L${IndexBalance}`);
                    IndexBalance++;
                });
            }

            // Activity logs
            const queryActivity = 'SELECT * FROM users_activity_logs WHERE user_id = ?';
            const [activityUser] = await executeQueryFromPoolAsync(conexionOrbet, queryActivity, [userId]);
            worksheet.addRow([]);

            let StartLogs = IndexBalance + 2;

            worksheet.mergeCells(`A${StartLogs}:R${StartLogs}`);
            worksheet.getCell(`A${StartLogs}`).value = 'Activity Logs';
            worksheet.getCell(`A${StartLogs}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getCell(`A${StartLogs}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0070C0' }, // Color de fondo para el encabezado
            };



            worksheet.addRow([]);
            const activityHeaders = [
                "", "", "", "", "", "", "", "",
                "Action", "",
                "Date"
            ];

            worksheet.addRow(activityHeaders).font = { bold: true };
            StartLogs += 2;
            worksheet.mergeCells(`I${StartLogs}:J${StartLogs}`);
            StartLogs += 1;
            if (activityUser.length > 0) {
                activityUser.forEach(activity => {
                    worksheet.addRow([
                        "", "", "", "", "", "", "", "",
                        activity.action, "",
                        activity.dateEvent
                    ]);
                    worksheet.mergeCells(`I${StartLogs}:J${StartLogs}`);
                    StartLogs++;
                });
            }

            // IP logs
            const queryIps = 'SELECT * FROM user_ips WHERE user_id = ?';
            const [userIps] = await executeQueryFromPoolAsync(conexionOrbet, queryIps, [userId]);

            let StartIp = StartLogs + 2;

            worksheet.addRow([]);
            worksheet.mergeCells(`A${StartIp}:R${StartIp}`);
            worksheet.getCell(`A${StartIp}`).value = 'Sessions IP';
            worksheet.getCell(`A${StartIp}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getCell(`A${StartIp}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0070C0' }, // Color de fondo para el encabezado
            };
            worksheet.addRow([]);

            // Añadir encabezados de IP logs
            const ipHeaders = [
                "", "", "", "", "", "", "", "",
                "IP Address",
                "Date"
            ];
            worksheet.addRow(ipHeaders).font = { bold: true };
            StartIp += 2;
            worksheet.mergeCells(`J${StartIp}:K${StartIp}`);
            StartIp += 1;

            if (userIps.length > 0) {
                userIps.forEach(ip_data => {
                    worksheet.addRow([
                        "", "", "", "", "", "", "", "",
                        ip_data.ip_address,
                        ip_data.used_at.toISOString()
                    ]);
                    worksheet.mergeCells(`J${StartIp}:K${StartIp}`);
                    StartIp++;
                });
            }

            // Latest payments
            let StartPayments = StartIp + 2;
            const paymentQuery = 'SELECT * FROM user_latest_payments WHERE user_id = ?';
            const [paymentList] = await executeQueryFromPoolAsync(conexionOrbet, paymentQuery, [userId]);
            worksheet.addRow([]);

            worksheet.mergeCells(`A${StartPayments}:R${StartPayments}`);
            worksheet.getCell(`A${StartPayments}`).value = 'Latest Payments';
            worksheet.getCell(`A${StartPayments}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getCell(`A${StartPayments}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0070C0' }, // Color de fondo para el encabezado
            };

            worksheet.addRow([]);
            StartPayments += 2;

            // Añadir encabezados de latest payments
            const paymentHeaders = [
                "", "", "", "", "",
                "Action", "",
                "Source", "",
                "Approval Admin", "",
                "Amount",
                "Currency",
                "Date"
            ];
            worksheet.addRow(paymentHeaders).font = { bold: true };
            worksheet.mergeCells(`F${StartPayments}:G${StartPayments}`);
            worksheet.mergeCells(`H${StartPayments}:I${StartPayments}`);
            worksheet.mergeCells(`J${StartPayments}:K${StartPayments}`);
            worksheet.mergeCells(`N${StartPayments}:O${StartPayments}`);

            StartPayments += 1;

            if (paymentList.length > 0) {
                paymentList.forEach(payItem => {
                    worksheet.addRow([
                        "", "", "", "", "",
                        payItem.action, "",
                        payItem.source, "",
                        payItem.source_of_approval, "",
                        payItem.amount,
                        payItem.currency,
                        payItem.finished_at.toISOString()
                    ]);
                    worksheet.mergeCells(`F${StartPayments}:G${StartPayments}`);
                    worksheet.mergeCells(`H${StartPayments}:I${StartPayments}`);
                    worksheet.mergeCells(`J${StartPayments}:K${StartPayments}`);
                    worksheet.mergeCells(`N${StartPayments}:O${StartPayments}`);
                    StartPayments += 1;
                });
            }

            // Locks
            let StartLock = StartPayments + 2;
            const locksQuery = 'SELECT * FROM user_locks WHERE user_id = ?';
            const [locksHistory] = await executeQueryFromPoolAsync(conexionOrbet, locksQuery, [userId]);
            //worksheet.addRow([]);

            worksheet.mergeCells(`A${StartLock}:R${StartLock}`);
            worksheet.getCell(`A${StartLock}`).value = 'Locks';
            worksheet.getCell(`A${StartLock}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getCell(`A${StartLock}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0070C0' }, // Color de fondo para el encabezado
            };

            worksheet.addRow([]);


            // Añadir encabezados de locks
            const lockHeaders = [
                "", "", "", "", "", "", "", "",
                "Type",
                "Reason"
            ];
            worksheet.addRow(lockHeaders).font = { bold: true };
            console.log("first item of lock is in : " + StartLock);

            StartLock += 2;
            worksheet.mergeCells(`J${StartLock}:K${StartLock}`);
            StartLock += 1;

            if (locksHistory.length > 0) {
                locksHistory.forEach(LockItem => {
                    worksheet.addRow([
                        "", "", "", "", "", "", "", "",
                        LockItem.type,
                        LockItem.comment
                    ]);
                    worksheet.mergeCells(`J${StartLock}:K${StartLock}`);
                    StartLock += 1;
                });
            }

            //get documents
            const documentUser = 'SELECT * FROM user_documents WHERE user_id = ? AND type = ?'
            const [documentsUser] = await executeQueryFromPoolAsync(conexionOrbet, documentUser, [userId, 'image']);

            let DocIndex = 0;

            if (documentsUser.length > 0) {
                const worksheetDocuments = workbook.addWorksheet('Documents', { properties: { tabColor: { argb: '99FF99' } } });

                documentsUser.forEach(document => {
                    const imagePath = document.file_path.includes("http") ? document.file_path : "/app/static/cdn_storage/Documents/" + document.file_path;

                    const imageId1 = workbook.addImage({
                        filename: imagePath,
                        extension: 'jpeg',
                    });

                    const InfoDoc = `H${6 + (10 * DocIndex)}`;

                    worksheetDocuments.getCell(InfoDoc).value = document.description; // Escribir en G2

                    const rangeImg = `B${(2 + (10 * DocIndex))}:F${(10 + (10 * DocIndex))}`;
                    worksheetDocuments.addImage(imageId1, rangeImg);
                    DocIndex++;
                });


            }

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0070C0' }, // Color de fondo para el encabezado
            };

            // Aplicar bordes a todas las celdas
            worksheet.eachRow((row, rowNumber) => {
                row.eachCell(function (cell, colNumber) {
                    cell.alignment = { horizontal: 'center' }; // Centrar texto
                    //console.log('Cell ' + colNumber + ' = ' + cell.value);
                });
            });

            workbook.xlsx.writeFile(`/app/static/cdn_storage/reports/user_${userData.user_id}.xlsx`)
                .then(() => {
                    res.download(`/app/static/cdn_storage/reports/user_${userData.user_id}.xlsx`, (err) => {
                        if (err) {
                            console.error('Error sending the excel:', err);
                            res.status(500).send('Error generating excel');
                        }

                        console.log("report generated in format excel!");
                    });
                    console.log('Archivo XLSX creado exitosamente');
                });

        } else {
            res.status(500).json({ message: 'Document format not allowed' });
        }
    } catch (error) {

        //hay que empezar a guardar los logs en la BD asi -- >
        SaveServerLog(`Error: ${error}`, "Error exporting data");


        console.error('Error exporting data:', error);
        res.status(500).json({ message: 'Server internal error, try again' });
    }
}

async function exportDailyReport(req, res) {
    const format = req.params.format;
    const day = req.params.day;
    try {
        if (format == "PDF") {
            //exportamos la data del usuario en pdf
            let userData = {};
            try {
                // Obtener la fecha de hoy en formato MM-DD-YYYY
                var today = new Date();
                var dd = String(today.getDate()).padStart(2, '0');
                var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                var yyyy = today.getFullYear();
                const todayFormatted = `${yyyy}-${mm}-${dd}`;

                // Obtener la información del usuario desde la base de datos
                const dayToSearch = (day == 'today') ? todayFormatted : day;
                const query = `
                SELECT 
                    tx.amount, 
                    tx.type, 
                    tx.currency, 
                    tx.transaction_date, 
                    us.name 
                FROM 
                    transaction_history AS tx 
                JOIN 
                    users AS us 
                ON 
                    us.user_id = tx.user_id 
                WHERE 
                    DATE(tx.transaction_date) = DATE(?);
                `;
                const [transactions] = await executeQueryFromPoolAsync(conexionOrbet, query, [dayToSearch]);




                // Crear un nuevo documento PDF
                const doc = new PDFDocument({ margin: 30, layout: 'landscape', size: 'A4' });

                // Ruta para guardar temporalmente el PDF
                const pdfPath = path.join(__dirname, `daily_report_${todayFormatted}.pdf`);
                const writeStream = fs.createWriteStream(pdfPath);

                // Pipe the document to a file
                doc.pipe(res);

                // Añadir título
                doc
                    .fontSize(20)
                    .text('Daily Report of orbet', { align: 'center' })
                    .moveDown(1.5);

                doc.lineWidth(2);

                doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                const pageWidth = doc.page.width;
                doc
                    .moveTo(50, doc.y) // Posición inicial (50 px desde el borde izquierdo, en la posición vertical actual)
                    .lineTo(pageWidth - 50, doc.y) // Posición final (50 px desde el borde derecho)
                    .stroke(); // Dibujar la línea

                // Añadir espacio después de la línea
                doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                // Añadir título
                doc
                    .fontSize(20)
                    .text('Transactions', { align: 'center' })
                    .moveDown(1.5);

                // Formatear los datos para la tabla
                const tableRows = transactions.map(tx => [
                    tx.type,
                    tx.name,                         // Columna 1: Transation type
                    `$${tx.amount}`,      // Columna 2: Amount
                    tx.currency.toUpperCase(),       // Columna 3: Currency
                    tx.transaction_date.toISOString().split('T')[0] // Columna 4: Fecha (YYYY-MM-DD)
                ]);

                // Definir la estructura de la tabla
                const tableData = {
                    headers: [
                        { label: "Transation type", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "User", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Amount", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Currency", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Date", align: 'center', headerColor: "#58b5e1", valign: "center" },
                    ],
                    rows: tableRows
                };

                // Usar pdfkit-table para generar la tabla
                await doc.table(tableData, {
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                    prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                });

                /*-----------------------------------------------------------------------*/
                //get account createds
                const accountsCreated = 'SELECT name,email,country FROM users WHERE DATE(created_at) = DATE(?) AND role = "user" ';
                const [accounts] = await executeQueryFromPoolAsync(conexionOrbet, accountsCreated, [dayToSearch]);

                if (accounts.length > 0) {
                    // Añadir espacio después de la tabla de transacciones
                    doc.moveDown(2);

                    // Verificar espacio disponible antes de agregar nueva tabla
                    if (doc.y > doc.page.height - 100) {  // Ajusta el valor según los márgenes
                        doc.addPage();
                    }

                    doc.lineWidth(2);

                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    const pageWidth = doc.page.width;
                    doc
                        .moveTo(50, doc.y) // Posición inicial (50 px desde el borde izquierdo, en la posición vertical actual)
                        .lineTo(pageWidth - 50, doc.y) // Posición final (50 px desde el borde derecho)
                        .stroke(); // Dibujar la línea

                    // Añadir espacio después de la línea
                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Accounts New', { align: 'center' })
                        .moveDown(1.5);

                    // Formatear los datos para la tabla
                    const userRows = accounts.map(account => [
                        account.email,                         // Columna 1: Transation type
                        account.name,      // Columna 2: Amount
                        account.country,       // Columna 3: Currency
                    ]);

                    // Definir la estructura de la tabla
                    const tableData2 = {
                        headers: [
                            { label: "Email", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Name", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Country", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        ],
                        rows: userRows
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                /*-----------------------------------------------------------------------*/
                //get comments
                const commentsQuery = `
                SELECT 
                    com.comment_text as comentary, 
                    u.name, 
                    u.email 
                FROM 
                    user_comments AS com 
                JOIN 
                    users AS u 
                ON 
                    u.user_id = com.user_id 
                WHERE 
                    DATE(com.created_at) = DATE(?)
                `;
                const [comments] = await executeQueryFromPoolAsync(conexionOrbet, commentsQuery, [dayToSearch]);

                if (comments.length > 0) {
                    // Añadir espacio después de la tabla de transacciones
                    doc.moveDown(2);

                    // Verificar espacio disponible antes de agregar nueva tabla
                    if (doc.y > doc.page.height - 100) {  // Ajusta el valor según los márgenes
                        doc.addPage();
                    }

                    doc.lineWidth(2);

                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    const pageWidth = doc.page.width;
                    doc
                        .moveTo(50, doc.y) // Posición inicial (50 px desde el borde izquierdo, en la posición vertical actual)
                        .lineTo(pageWidth - 50, doc.y) // Posición final (50 px desde el borde derecho)
                        .stroke(); // Dibujar la línea

                    // Añadir espacio después de la línea
                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Comments by users', { align: 'center' })
                        .moveDown(1.5);

                    // Formatear los datos para la tabla
                    const commentsRows = comments.map(comment => [
                        comment.comentary,                         // Columna 1: Transation type
                        comment.name,      // Columna 2: Amount
                        comment.email,       // Columna 3: Currency
                    ]);

                    console.log(accounts);
                    console.log(commentsRows);

                    // Definir la estructura de la tabla
                    const tableData2 = {
                        headers: [
                            { label: "Comment", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Name", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Email", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        ],
                        rows: commentsRows
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                doc.end();

                // Esperar a que se complete la escritura del PDF y enviarlo como respuesta
                writeStream.on('finish', () => {
                    res.download(pdfPath, `daily_report_${todayFormatted}.pdf`, (err) => {
                        if (err) {
                            console.error('Error sending the PDF:', err);
                            res.status(500).send('Error generating PDF');
                        }

                        console.log("report generated!");
                        // Eliminar el archivo temporal después de enviarlo
                        fs.unlinkSync(pdfPath);
                    });
                });

            } catch (error) {
                console.error('Error exporting user data to PDF:', error);
                res.status(500).send('Server error');
            }
        } else if (format === 'Excel') {
            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            const todayFormatted = `${yyyy}-${mm}-${dd}`;

            const dayToSearch = day === 'today' ? todayFormatted : day;

            const query = `
                SELECT 
                    tx.amount, 
                    tx.type, 
                    tx.currency, 
                    tx.transaction_date, 
                    us.name 
                FROM 
                    transaction_history AS tx 
                JOIN 
                    users AS us 
                ON 
                    us.user_id = tx.user_id 
                WHERE 
                    DATE(tx.transaction_date) = DATE(?);
            `;
            const [transactions] = await executeQueryFromPoolAsync(conexionOrbet, query, [dayToSearch]);

            if (!transactions.length) {
                return res.status(404).json({ message: 'No transactions found for the selected date.' });
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Transactions of ' + todayFormatted);

            worksheet.mergeCells('A1:R1');
            worksheet.getCell('A1').value = 'Transactions';

            // Aplicar estilo: centrar texto y ponerlo en negrita
            worksheet.getCell('A1').font = { bold: true, size: 14 }; // Tamaño y negrita
            worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }; // Centrar horizontal y verticalmente

            worksheet.addRow([]);

            // Agregar encabezado
            worksheet.columns = [
                { header: 'Transaction Type', key: 'type', width: 20 },
                { header: 'User', key: 'name', width: 25 },
                { header: 'Amount', key: 'amount', width: 15 },
                { header: 'Currency', key: 'currency', width: 15 },
                { header: 'Transaction Date', key: 'transaction_date', width: 25 },
            ];

            // Agregar filas con datos
            transactions.forEach((tx) => {
                worksheet.addRow({
                    type: tx.type,
                    name: tx.name,
                    amount: `$${tx.amount}`,
                    currency: tx.currency.toUpperCase(),
                    transaction_date: tx.transaction_date.toISOString().split('T')[0],
                });
            });

            // Estilizar encabezados
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).alignment = { horizontal: 'center' };

            // Guardar y enviar el archivo
            const excelPath = path.join(__dirname, `daily_report_${todayFormatted}.xlsx`);
            await workbook.xlsx.writeFile(excelPath);

            res.download(excelPath, `daily_report_${todayFormatted}.xlsx`, (err) => {
                if (err) {
                    console.error('Error sending the Excel:', err);
                    res.status(500).send('Error generating Excel');
                }

                // Eliminar el archivo temporal después de enviarlo
                fs.unlinkSync(excelPath);
            });
        } else {
            res.status(400).json({ message: 'Invalid format specified' });
        }
    } catch (error) {

        //hay que empezar a guardar los logs en la BD asi -- >
        SaveServerLog(`Error: ${error}`, "Error exporting data");


        console.error('Error exporting data:', error);
        res.status(500).json({ message: 'Server internal error, try again' });
    }
}

async function exportMonthlyReport(req, res) {
    const format = req.params.format;
    const month = req.params.month;
    const year = req.params.year;

    try {
        if (format == "PDF") {
            //exportamos la data del usuario en pdf
            let userData = {};
            try {
                // Obtener la fecha de hoy en formato MM-DD-YYYY
                const rangeFormat = `${year}-${month}`;

                // Obtener la información del usuario desde la base de datos
                const dayToSearch = rangeFormat;
                //obtener las transacciones que sean de el mes y año teniendo en cuenta una transaccion puede ser 2024-10-27 21:29:53 y otra 2024-10-29 21:42:38
                //si busco 2024-10 deberia mostrarme todas las transacciones de ese mes
                const query = `
                SELECT 
                    tx.amount, 
                    tx.type, 
                    tx.currency, 
                    tx.transaction_date, 
                    us.name 
                FROM 
                    transaction_history AS tx 
                JOIN 
                    users AS us 
                ON 
                    us.user_id = tx.user_id 
                WHERE 
                    DATE_FORMAT(tx.transaction_date, '%Y-%m') = ?;
                `;
                const [transactions] = await executeQueryFromPoolAsync(conexionOrbet, query, [dayToSearch]);




                // Crear un nuevo documento PDF
                const doc = new PDFDocument({ margin: 30, layout: 'landscape', size: 'A4' });

                // Ruta para guardar temporalmente el PDF
                const pdfPath = path.join(__dirname, `monthly_report_${year}_${month}.pdf`);
                const writeStream = fs.createWriteStream(pdfPath);

                // Pipe the document to a file
                doc.pipe(res);

                // Añadir título
                doc
                    .fontSize(20)
                    .text(`Monthly (${year}-${month}) Report of orbet`, { align: 'center' })
                    .moveDown(1.5);

                doc.lineWidth(2);

                doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                const pageWidth = doc.page.width;
                doc
                    .moveTo(50, doc.y) // Posición inicial (50 px desde el borde izquierdo, en la posición vertical actual)
                    .lineTo(pageWidth - 50, doc.y) // Posición final (50 px desde el borde derecho)
                    .stroke(); // Dibujar la línea

                // Añadir espacio después de la línea
                doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                // Añadir título
                doc
                    .fontSize(20)
                    .text('Transactions', { align: 'center' })
                    .moveDown(1.5);

                // Formatear los datos para la tabla
                const tableRows = transactions.map(tx => [
                    tx.type,
                    tx.name,                         // Columna 1: Transation type
                    `$${tx.amount}`,      // Columna 2: Amount
                    tx.currency.toUpperCase(),       // Columna 3: Currency
                    tx.transaction_date.toISOString().split('T')[0] // Columna 4: Fecha (YYYY-MM-DD)
                ]);

                // Definir la estructura de la tabla
                const tableData = {
                    headers: [
                        { label: "Transation type", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "User", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Amount", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Currency", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        { label: "Date", align: 'center', headerColor: "#58b5e1", valign: "center" },
                    ],
                    rows: tableRows
                };

                // Usar pdfkit-table para generar la tabla
                await doc.table(tableData, {
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                    prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                });

                /*-----------------------------------------------------------------------*/
                //get account createds
                //DATE_FORMAT(tx.transaction_date, '%Y-%m') = ?
                // Query para obtener usuarios creados en el mes
                const accountsCreated = `
                    SELECT 
                        name, 
                        email, 
                        country,
                        created_at
                    FROM 
                        users 
                    WHERE 
                        DATE_FORMAT(created_at, '%Y-%m') = ? 
                        AND role = "user";
                `;
                const [accounts] = await executeQueryFromPoolAsync(conexionOrbet, accountsCreated, [dayToSearch]);

                if (accounts.length > 0) {
                    // Añadir espacio después de la tabla de transacciones
                    doc.moveDown(2);

                    // Verificar espacio disponible antes de agregar nueva tabla
                    if (doc.y > doc.page.height - 100) {  // Ajusta el valor según los márgenes
                        doc.addPage();
                    }

                    doc.lineWidth(2);

                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    const pageWidth = doc.page.width;
                    doc
                        .moveTo(50, doc.y) // Posición inicial (50 px desde el borde izquierdo, en la posición vertical actual)
                        .lineTo(pageWidth - 50, doc.y) // Posición final (50 px desde el borde derecho)
                        .stroke(); // Dibujar la línea

                    // Añadir espacio después de la línea
                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Accounts New', { align: 'center' })
                        .moveDown(1.5);

                    // Formatear los datos para la tabla
                    const userRows = accounts.map(account => [
                        account.email,                         // Columna 1: Transation type
                        account.name,      // Columna 2: Amount
                        account.country,       // Columna 3: Currency
                        account.created_at.toISOString().split('T')[0]
                    ]);

                    // Definir la estructura de la tabla
                    const tableData2 = {
                        headers: [
                            { label: "Email", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Name", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Country", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Created at", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        ],
                        rows: userRows
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                /*-----------------------------------------------------------------------*/
                //get comments
                const commentsQuery = `
                SELECT 
                    com.comment_text as comentary, 
                    com.created_at as creationComm,
                    u.name, 
                    u.email 
                FROM 
                    user_comments AS com 
                JOIN 
                    users AS u 
                ON 
                    u.user_id = com.user_id 
                WHERE 
                    DATE_FORMAT(com.created_at, '%Y-%m') = ? 
                `;
                const [comments] = await executeQueryFromPoolAsync(conexionOrbet, commentsQuery, [dayToSearch]);

                if (comments.length > 0) {
                    // Añadir espacio después de la tabla de transacciones
                    doc.moveDown(2);

                    // Verificar espacio disponible antes de agregar nueva tabla
                    if (doc.y > doc.page.height - 100) {  // Ajusta el valor según los márgenes
                        doc.addPage();
                    }

                    doc.lineWidth(2);

                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    const pageWidth = doc.page.width;
                    doc
                        .moveTo(50, doc.y) // Posición inicial (50 px desde el borde izquierdo, en la posición vertical actual)
                        .lineTo(pageWidth - 50, doc.y) // Posición final (50 px desde el borde derecho)
                        .stroke(); // Dibujar la línea

                    // Añadir espacio después de la línea
                    doc.moveDown(1.5);  // Ajusta el valor según el espacio que desees

                    // Añadir título
                    doc
                        .fontSize(20)
                        .text('Comments by users', { align: 'center' })
                        .moveDown(1.5);

                    // Formatear los datos para la tabla
                    const commentsRows = comments.map(comment => [
                        comment.comentary,                         // Columna 1: Transation type
                        comment.name,      // Columna 2: Amount
                        comment.email,       // Columna 3: Currency
                        comment.creationComm.toISOString().split('T')[0]
                    ]);

                    console.log(accounts);
                    console.log(commentsRows);

                    // Definir la estructura de la tabla
                    const tableData2 = {
                        headers: [
                            { label: "Comment", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Name", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Email", align: 'center', headerColor: "#58b5e1", valign: "center" },
                            { label: "Created at", align: 'center', headerColor: "#58b5e1", valign: "center" },
                        ],
                        rows: commentsRows
                    };

                    // Usar pdfkit-table para generar la tabla
                    await doc.table(tableData2, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
                    });

                }

                // Finaliza el documento
                doc.end();

                // Esperar a que se complete la escritura del PDF y enviarlo como respuesta
                writeStream.on('finish', () => {
                    res.download(pdfPath, `daily_report_${todayFormatted}.pdf`, (err) => {
                        if (err) {
                            console.error('Error sending the PDF:', err);
                            res.status(500).send('Error generating PDF');
                        }

                        console.log("report generated!");
                        // Eliminar el archivo temporal después de enviarlo
                        fs.unlinkSync(pdfPath);
                    });
                });

            } catch (error) {
                console.error('Error exporting user data to PDF:', error);
                res.status(500).send('Server error');
            }
        } else if (format === 'Excel') {
            const rangeFormat = `${year}-${month}`;

            const query = `
                SELECT 
                    tx.amount, 
                    tx.type, 
                    tx.currency, 
                    tx.transaction_date, 
                    us.name 
                FROM 
                    transaction_history AS tx 
                JOIN 
                    users AS us 
                ON 
                    us.user_id = tx.user_id 
                WHERE 
                    DATE_FORMAT(tx.transaction_date, '%Y-%m') = ?;
            `;
            const [transactions] = await executeQueryFromPoolAsync(conexionOrbet, query, [rangeFormat]);

            if (!transactions.length) {
                return res.status(404).json({ message: 'No transactions found for the selected month.' });
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Monthly Report');

            // Agregar encabezado
            worksheet.columns = [
                { header: 'Transaction Type', key: 'type', width: 20 },
                { header: 'User', key: 'name', width: 25 },
                { header: 'Amount', key: 'amount', width: 15 },
                { header: 'Currency', key: 'currency', width: 15 },
                { header: 'Transaction Date', key: 'transaction_date', width: 25 },
            ];

            // Agregar filas con datos
            transactions.forEach((tx) => {
                worksheet.addRow({
                    type: tx.type,
                    name: tx.name,
                    amount: `$${tx.amount}`,
                    currency: tx.currency.toUpperCase(),
                    transaction_date: tx.transaction_date.toISOString().split('T')[0],
                });
            });

            // Estilizar encabezados
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).alignment = { horizontal: 'center' };

            // Guardar y enviar el archivo
            const excelPath = path.join(__dirname, `monthly_report_${year}_${month}.xlsx`);
            await workbook.xlsx.writeFile(excelPath);

            res.download(excelPath, `monthly_report_${year}_${month}.xlsx`, (err) => {
                if (err) {
                    console.error('Error sending the Excel:', err);
                    res.status(500).send('Error generating Excel');
                }

                // Eliminar el archivo temporal después de enviarlo
                fs.unlinkSync(excelPath);
            });
        } else {
            res.status(400).json({ message: 'Invalid format specified' });
        }
    } catch (error) {

        //hay que empezar a guardar los logs en la BD asi -- >
        SaveServerLog(`Error: ${error}`, "Error exporting data");


        console.error('Error exporting data:', error);
        res.status(500).json({ message: 'Server internal error, try again' });
    }
}

async function getTransaction(req, res) {
    const transactionId = req.params.id;

    try {
        const query = `
            SELECT 
                tx.amount, 
                tx.type, 
                tx.currency, 
                tx.transaction_date, 
                us.name AS user_name, 
                us.email AS user_email 
            FROM 
                transaction_history AS tx 
            JOIN 
                users AS us 
            ON 
                tx.user_id = us.user_id 
            WHERE 
                tx.transaction_id = ?;
        `;
        const [transaction] = await executeQueryFromPoolAsync(conexionOrbet, query, [transactionId]);

        if (!transaction.length) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        res.status(200).json(transaction[0]);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

//get all transactions in the server
async function getAllTransaction(req, res) {
    try {
        const query = `
            SELECT 
                tx.transaction_id, 
                tx.amount, 
                tx.type, 
                tx.currency, 
                tx.transaction_date, 
                us.name AS user_name, 
                us.email AS user_email 
            FROM 
                transaction_history AS tx 
            JOIN 
                users AS us 
            ON 
                tx.user_id = us.user_id;
        `;
        const [transactions] = await executeQueryFromPoolAsync(conexionOrbet, query);

        if (!transactions.length) {
            return res.status(404).json({ message: 'No transactions found.' });
        }

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching all transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

async function getTransactionUser(req, res) {
    const userId = req.params.userid;

    try {
        const query = `
            SELECT 
                tx.transaction_id, 
                tx.amount, 
                tx.type, 
                tx.currency, 
                tx.transaction_date, 
                us.name AS user_name, 
                us.email AS user_email 
            FROM 
                transaction_history AS tx 
            JOIN 
                users AS us 
            ON 
                tx.user_id = us.user_id 
            WHERE 
                us.user_id = ?;
        `;
        const [transactions] = await executeQueryFromPoolAsync(conexionOrbet, query, [userId]);

        if (!transactions.length) {
            return res.status(404).json({ message: 'No transactions found for the specified user.' });
        }

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions for user:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

//Inicia sesion con usuario administrador
async function LoginAdmin(req, res) {
    const { hashAccess, username, password, ip, device } = req.body;

    if (!hashAccess || hashAccess !== process.env.ADMIN_HASH) {
        return res.status(403).send('You do not have access to this zone!');
    }

    try {
        const query = 'SELECT * FROM admins WHERE email = ? AND password_hash = ?';
        const [results1] = await executeQueryFromPoolAsync(conexionOrbet, query, [username, password]);

        // Validar si se encontró un administrador
        if (results1.length === 0) {
            return res.status(401).send({ success: false, message: 'Invalid credentials' });
        }

        const startTime = new Date().now;
        const querySession = 'INSERT INTO admins_sessions(user_id, hash, ip_address, device, login_time, logout_time) VALUES(?,?,?,?,?)';
        const [results2] = await executeQueryFromPoolAsync(conexionOrbet, querySession, hashAccess, [results1.user_id, ip, device, startTime, -1]);

        //esto se debe quitar
        currentAdminHash = hashAccess; // Actualizamos el hash de sesión

        adminsHash.push(hashAccess);

        res.status(200).send({ success: true, message: 'Login successful' });
    } catch (error) {
        res.status(401).send({ success: false, message: 'Invalid credentials' });
    }
}

//Termina la sesion de un usuario administrador
async function LogoutAdmin(req, res) {
    const { hashAccess } = req.body;

    if (!hashAccess || hashAccess !== process.env.ADMIN_HASH) {
        return res.status(403).send('You do not have access to this zone!');
    }

    try {
        // Buscar la sesión del administrador usando el hash
        const query = 'SELECT * FROM admins_sessions WHERE hash = ?';
        const [results1] = await executeQueryFromPoolAsync(conexionOrbet, query, [hashAccess]);

        // Validar si se encontró una sesión de administrador
        if (results1.length !== 0) {
            // Obtener el tiempo de logout actual
            const endTime = new Date().toISOString();  // Alternativamente, Date.now() si prefieres un timestamp numérico

            // Actualizar la sesión con el tiempo de logout
            const query2 = 'UPDATE admins_sessions SET logout_time = ? WHERE hash = ?';
            await executeQueryFromPoolAsync(conexionOrbet, query2, [endTime, hashAccess]);
        }

        // Si adminsHash es un array, verificamos si contiene el hash y lo eliminamos
        if (adminsHash.includes(hashAccess)) {
            const index = adminsHash.indexOf(hashAccess);
            if (index !== -1) {
                adminsHash.splice(index, 1);  // Eliminar el elemento del array
            }
        }


        res.status(200).send({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error('Error during admin logout:', error);
        res.status(500).send({ success: false, message: 'Server error, please try again later.' });
    }
}

async function getAdminLogs(req, res) {
    try {

        const userId = req.params.id;
        if (userId == null || userId === 'undefined') {
            res.status(500).json({ message: 'User ID not provided' });
        }

        console.log("obteniendo logs de admin!");

        const query = 'SELECT log_id, action, dateEvent,userAffected FROM admin_activity_logs WHERE user_id = ?';
        const [results1] = await executeQueryFromPoolAsync(conexionOrbet, query, [userId]);

        res.status(200).json(results1);
    } catch (error) {
        console.error('Error en ReturnUserList:', error);
        res.status(500).json({ message: 'Server internal error, try again' });
    }
}

async function getUserLogs(req, res) {
    try {

        const userId = req.params.id;
        if (userId == null || userId === 'undefined') {
            res.status(500).json({ message: 'User ID not provided' });
        }

        console.log("obteniendo logs de usuario!");

        const query = 'SELECT log_id, action, dateEvent FROM users_activity_logs WHERE user_id = ?';
        const [results1] = await executeQueryFromPoolAsync(conexionOrbet, query, [userId]);

        res.status(200).json(results1);
    } catch (error) {
        console.error('Error en ReturnUserList:', error);
        res.status(500).json({ message: 'Server internal error, try again' });
    }
}

//obtiene la lista de los juegos actuales
function GetGamesList(req, res) {
    const body = req.body;

    if (body == null || body.hashAccess == null) {
        return res.status(403).send('You have not access to this zone!');
    }
}

//#endregion

//#region CDN

// Validar y crear automáticamente el directorio de almacenamiento
const storageDir = path.join(path.dirname(__dirname), process.env.CDN_STORAGE_DIR || '/static/cdn_storage/Documents');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Asegurar que el directorio existe
        cb(null, storageDir);
    },
    filename: (req, file, cb) => {
        // Crear un nombre único basado en la fecha y extensión
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// Filtrar archivos por tipo
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|gif|pdf/;
    const mimetype = allowedFileTypes.test(file.mimetype);
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error(`Solo se permiten estos formatos: ${allowedFileTypes.toString()}`));
    }
};

// Configuración de límites y opciones adicionales
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Límite de tamaño: 10MB
    fileFilter: fileFilter
});

//#endregion

//#region ChangeBalance

// Función para manejar el evento de balanceChangeBalance
async function handleBalanceChangeBalance(data) {
    const { action, currency, amount, userid } = data;

    // Verificar que los datos requeridos estén presentes
    if (!action || !currency || !amount || !userid) {
        throw new Error('Missing required parameters');
    }

    // Convertir el monto a un número
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue)) {
        throw new Error('Invalid amount value');
    }

    // Obtener conexión desde el pool
    const connection = await conexionOrbet.getConnection();
    try {
        // Iniciar la transacción
        await connection.query('START TRANSACTION');

        // Buscar si el usuario ya tiene un registro con la moneda especificada en la tabla user_accounts
        const [accountRows] = await connection.query('SELECT * FROM user_accounts WHERE user_id = ? AND currency = ?', [userid, currency]);

        let newBalance;
        if (accountRows.length > 0) {
            // Si el registro existe, actualizar el balance
            const currentBalance = parseFloat(accountRows[0].balance);
            newBalance = action === 'Add' ? currentBalance + amountValue : currentBalance - amountValue;

            await connection.query('UPDATE user_accounts SET balance = ? WHERE user_id = ? AND currency = ?',
                [newBalance, userid, currency]
            );
        } else {
            // Si no existe, crear un nuevo registro
            if (action === 'Subtract') {
                throw new Error('Cannot subtract from a non-existent balance');
            }

            newBalance = amountValue;

            await connection.query('INSERT INTO user_accounts (user_id, currency, balance) VALUES (?, ?, ?)',
                [userid, currency, newBalance]
            );
        }

        // Actualizar la tabla user_balances
        const [balanceRows] = await connection.query('SELECT * FROM user_balances WHERE user_id = ? AND currency = ?',
            [userid, currency]
        );

        if (balanceRows.length > 0) {
            // Si ya existe un registro en user_balances, actualizar el balance y la fecha de actualización
            await connection.query('UPDATE user_balances SET balance = ?, last_updated = NOW() WHERE user_id = ? AND currency = ?',
                [newBalance, userid, currency]
            );
        } else {
            // Si no existe, crear un nuevo registro en user_balances
            await connection.query('INSERT INTO user_balances (user_id, currency, balance, last_updated) VALUES (?, ?, ?, NOW())',
                [userid, currency, newBalance]
            );
        }

        // Confirmar la transacción
        await connection.query('COMMIT', []);

        return { status: true, message: 'Balance updated successfully', currency: currency, balance: newBalance };
    } catch (error) {
        // Revertir la transacción en caso de error
        await connection.query('ROLLBACK', []);
        console.error('Error during balance change transaction:', error);
        return { status: false, message: error.message };
    }
    finally {
        if (connection) connection.release();
    }
}

// Función para manejar el evento de TransactionChangeBalance
async function handleTransactionChangeBalance(data) {
    const { userid, amount, currency, type, reference_id, paymentSystem } = data;

    if (!userid || !amount || !currency || !type || !['deposit', 'withdrawal'].includes(type)) {
        throw new Error('Invalid parameters');
    }

    // Convertir el monto a un número
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue)) {
        throw new Error('Invalid amount value');
    }

    // Obtener conexión desde el pool
    const connection = await conexionOrbet.getConnection();
    try {
        // Iniciar la transacción
        await connection.query('START TRANSACTION');

        // Insertar la transacción en la tabla `transactions`
        await connection.query('INSERT INTO transaction_history (user_id, type, amount, currency, status, reference_id, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userid, type, amountValue, currency, 'completed', reference_id, paymentSystem]
        );

        // Actualizar la tabla `user_accounts`
        const [accountRows] = await connection.query('SELECT * FROM user_accounts WHERE user_id = ? AND currency = ?',
            [userid, currency]
        );

        let newBalance;
        if (accountRows.length > 0) {
            const currentBalance = parseFloat(accountRows[0].balance);
            if (type === 'deposit') {
                newBalance = currentBalance + amountValue;
                await connection.query('UPDATE user_accounts SET balance = ?, deposit_sum = deposit_sum + ? WHERE user_id = ? AND currency = ?',
                    [newBalance, amountValue, userid, currency]
                );
            } else {
                newBalance = currentBalance - amountValue;
                await connection.query('UPDATE user_accounts SET balance = ?, cashouts_sum = cashouts_sum + ? WHERE user_id = ? AND currency = ?',
                    [newBalance, amountValue, userid, currency]
                );
            }
        } else {
            if (type === 'withdrawal') {
                throw new Error('Cannot withdraw from a non-existent account');
            }

            newBalance = amountValue;
            await connection.query('INSERT INTO user_accounts (user_id, currency, balance, deposit_sum, cashouts_sum) VALUES (?, ?, ?, ?, ?)',
                [userid, currency, newBalance, amountValue, 0.00]
            );
        }

        // Actualizar la tabla `user_balances`
        const [balanceRows] = await connection.query('SELECT * FROM user_balances WHERE user_id = ? AND currency = ?',
            [userid, currency]
        );

        if (balanceRows.length > 0) {
            await connection.query('UPDATE user_balances SET balance = ?, last_updated = NOW() WHERE user_id = ? AND currency = ?',
                [newBalance, userid, currency]
            );
        } else {
            await connection.query('INSERT INTO user_balances (user_id, currency, balance, last_updated) VALUES (?, ?, ?, NOW())',
                [userid, currency, newBalance]
            );
        }

        // Confirmar la transacción
        await connection.query('COMMIT', []);

        // Retornar el resultado dependiendo del tipo de transacción
        if (type === 'deposit') {
            return { status: true, message: 'Transaction processed successfully', currency: currency, balance: newBalance, deposit_sum: amountValue };
        } else {
            return { status: true, message: 'Transaction processed successfully', currency: currency, balance: newBalance, cashouts_sum: amountValue };
        }

    } catch (error) {
        // Revertir la transacción en caso de error
        await connection.query('ROLLBACK', []);
        console.error('Error during transaction change balance:', error);
        return { status: false, message: error.message };
    } finally {
        if (connection) connection.release();
    }
}

// Función para manejar el evento de GiftChangeBalance
async function handleGiftChangeBalance(data) {
    const { userid, currency, amount, comment, authCode } = data;

    // Validación de los parámetros
    if (!userid || !currency || !amount || isNaN(amount) || amount <= 0) {
        throw new Error('Invalid parameters');
    }

    // Obtener conexión desde el pool
    const connection = await conexionOrbet.getConnection();
    try {
        await connection.query('START TRANSACTION');

        // Usar executeQueryFromPoolAsync para insertar la transacción en `transaction_history`
        await connection.query('INSERT INTO transaction_history (user_id, type, amount, currency, status, reference_id, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userid, 'gift', amount, currency, 'completed', authCode, 'bank-transfer']);

        // Usar executeQueryFromPoolAsync para actualizar la tabla `user_accounts`
        const [accountRows] = await connection.query('SELECT * FROM user_accounts WHERE user_id = ? AND currency = ?',
            [userid, currency]);

        let newBalance;
        if (accountRows.length > 0) {
            // Si existe un registro, actualizar el balance y los regalos recibidos
            const currentBalance = parseFloat(accountRows[0].balance);
            newBalance = currentBalance + amount;

            await connection.query('UPDATE user_accounts SET balance = ?, gifts_sum = gifts_sum + ? WHERE user_id = ? AND currency = ?',
                [newBalance, amount, userid, currency]);
        } else {
            // Si no existe, crear un nuevo registro en la tabla `user_accounts`
            newBalance = amount;
            await connection.query('INSERT INTO user_accounts (user_id, currency, balance, gifts_sum) VALUES (?, ?, ?, ?)',
                [userid, currency, newBalance, amount]);
        }

        // Usar executeQueryFromPoolAsync para actualizar la tabla `user_balances`
        const [balanceRows] = await connection.query('SELECT * FROM user_balances WHERE user_id = ? AND currency = ?',
            [userid, currency]);

        if (balanceRows.length > 0) {
            await connection.query('UPDATE user_balances SET balance = ?, last_updated = NOW() WHERE user_id = ? AND currency = ?',
                [newBalance, userid, currency]);
        } else {
            await connection.query('INSERT INTO user_balances (user_id, currency, balance, last_updated) VALUES (?, ?, ?, NOW())',
                [userid, currency, newBalance]);
        }

        // Confirmar la transacción
        await connection.query('COMMIT', []);

        // Retornar el resultado
        return {
            status: true,
            message: 'Gift transaction processed successfully',
            currency: currency,
            balance: newBalance,
            gift_sum: amount
        };
    } catch (error) {
        await connection.query('ROLLBACK', []);
        console.error('Error during gift transaction:', error.message);
        return { status: false, message: error.message };
    } finally {
        if (connection) connection.release();
    }
}

//#endregion

//#region JWT-check

function TestJwtIntegration(req, res) {
    const { token } = req.body;
    const decodedToken = verifyToken(token, process.env.JWT_SECRET);
    if (!decodedToken) {
        res.status(500).json({ message: 'Acess Forbbiden' });
        return res
    }

    res.status(200).json({ message: 'You have access with JWT token auth' });
}

function verifyToken(token, secret) {
    try {
        const decoded = jwt.verify(token, secret);
        console.log('Token is valid:', decoded);
        return true;
    } catch (error) {
        console.error('Token is invalid:', error.message);
        return false;
    }
}

function decodedJwt(token, secret) {
    try {
        const decoded = jwt.verify(token, secret);
        console.log('Token is valid:', decoded);
        return decoded;
    } catch (error) {
        console.error('Token is invalid:', error.message);
        return null;
    }
}

//#endregion

//#region  login and register system

async function LinkAccountGoogle(profile, accessToken) {
    console.log("Linking Google account");

    //the first step is search if exist a account with this email
    const user_email = profile.emails[0].value;
    const google_id = profile.id;
    const userID = profile.user_ID;

    const passHashed = "PROVIDER_BY_THIRDPARTY";


    const queryByMailOrGoogleId = "SELECT userID, provider FROM linked_accounts WHERE provider_id = ?";
    const existingUser = await executeQueryFromPoolAsync(conexionOrbet, queryByMailOrGoogleId, [google_id]);

    //ahora con el nuevo sistema lo primero es verificar si existe una solicitud de de linkeo de cuenta




    if (existingUser.length === 0) {
        //so how this is a link for a account we need search the account by the userID



        //the user not exist, so we need add this
        const usernameGenerated = user_email.split("@")[0] + "_" + nanoid(4);
        const queryRegister = "SELECT 1 FROM users WHERE user_id = ?";
        const resultReg = await executeQueryFromPoolAsync(conexionOrbet, queryRegister, [userID]);

        if (resultReg.length > 0) {
            //create link row
            const queryRegister2 = "INSERT INTO linked_accounts(	userID, provider_id, provider, display_name, email ) VALUES (?,?,?,?, ?)";
            const resultReg2 = await executeQueryFromPoolAsync(conexionOrbet, queryRegister2, [userID, google_id, 2, profile.displayName, user_email]);

            console.log("usuario registrado!");

            return { status: true, msg: "User linked", token: profile.tokenSession };


        } else {
            console.log("ocurrio un error al registrar");
            return { status: false, msg: "Network error, try again", token: null };
        }
    } else {

        //if the account is linked to another user return false!
        if (existingUser[0].userID != userID) {
            return { status: false, msg: "Account is linked with another user" };
        }

        console.log("Link ");
        console.log("user id :" + existingUser[0].userID);
        console.log("email :" + user_email);

        return { status: true, msg: "Autenticación exitosa.", token: profile.tokenSession };
    }
}

async function loginOrRegisterByGoogle(profile, accessToken, req) {
    console.log("loginOrRegisterByGoogle");

    //the first step is search if exist a account with this email
    const user_email = profile.emails[0].value;
    const google_id = profile.id;

    const passHashed = "PROVIDER_BY_THIRDPARTY";

    const queryByMailOrGoogleId = "SELECT userID, provider FROM linked_accounts WHERE provider_id = ? AND provider = 2";
    const existingUser = await executeQueryFromPoolAsync(conexionOrbet, queryByMailOrGoogleId, [google_id]);


    if (existingUser.length === 0) {
        //the user not exist, so we need add this
        const usernameGenerated = user_email.split("@")[0] + "_" + nanoid(4);
        const queryRegister = "INSERT INTO users(name, username, email, password_hash, byProvider ) VALUES (?,?,?,?, username)";
        const resultReg = await executeQueryFromPoolAsync(conexionOrbet, queryRegister, [profile.displayName, usernameGenerated, user_email, passHashed, 1]);

        if (resultReg.insertId) {
            //create link row
            const queryRegister2 = "INSERT INTO linked_accounts(	userID, provider_id, provider, display_name, email, isMaster ) VALUES (?,?,?,?, ?, ?)";
            const resultReg2 = await executeQueryFromPoolAsync(conexionOrbet, queryRegister2, [resultReg.insertId, google_id, 2, profile.displayName, user_email, 1]);

            console.log("usuario registrado!");

            const token = jwt.sign(
                { id: resultReg.insertId, email: user_email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' } // El token expira en 1 hora
            );

            // Crear sesión
            await saveUserSession(resultReg.insertId, token, req);

            return { status: true, msg: "User registered", token: token };


        } else {
            console.log("ocurrio un error al registrar");
            return { status: false, msg: "Network error, try again", token: null };
        }
    } else if (existingUser[0].provider !== 2) {

        console.log("the provider not is the same");
        return { status: false, msg: "Issue with the provider auth", token: null };
    } else {



        console.log("Autenticación exitosa.");
        console.log("user id :" + existingUser[0].userID);
        console.log("email :" + user_email);

        const token = jwt.sign(
            { id: existingUser[0].userID, email: user_email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        // Crear sesión
        await saveUserSession(existingUser[0].userID, token, req);

        console.log("token :", token);
        return { status: true, msg: "Autenticación exitosa.", token: token };
    }
}

//loginOrRegisterByFB
async function loginOrRegisterByFB(profile, accessToken, req) {
    console.log("loginOrRegisterByFB");
    let user_email = "";

    if (typeof profile.emails === 'undefined') {
        user_email = profile.id + "@facebook.com";
    } else {
        user_email = profile.emails[0].value;
    }

    //the first step is search if exist a account with this email

    const fb_id = profile.id;

    const passHashed = "PROVIDER_BY_THIRDPARTY";

    console.log("loginOrRegisterByFB 2");

    const queryByMailOrGoogleId = "SELECT userID, provider FROM linked_accounts WHERE provider_id = ? AND provider = 3";
    const [existingUser] = await executeQueryFromPoolAsync(conexionOrbet, queryByMailOrGoogleId, [fb_id]);


    if (existingUser.length === 0) {
        //the user not exist, so we need add this
        const usernameGenerated = user_email.split("@")[0] + "_" + nanoid(4);
        const queryRegister = "INSERT INTO users(name, username, email, password_hash, byProvider ) VALUES (?,?,?,?, ?)";
        const [resultReg] = await executeQueryFromPoolAsync(conexionOrbet, queryRegister, [profile.displayName, usernameGenerated, user_email, passHashed, 1]);

        if (resultReg.insertId) {
            console.log("usuario registrado!");

            //create link row
            const queryRegister2 = "INSERT INTO linked_accounts(	userID, provider_id, provider, display_name, email, isMaster ) VALUES (?,?,?,?, ?, ?)";
            const resultReg2 = await executeQueryFromPoolAsync(conexionOrbet, queryRegister2, [resultReg.insertId, fb_id, 3, profile.displayName, user_email, 1]);

            const token = jwt.sign(
                { id: resultReg.insertId, email: user_email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' } // El token expira en 1 hora
            );

            await saveUserSession(resultReg.insertId, token, req);

            return { status: true, msg: "User registered", token: token };


        } else {
            console.log("ocurrio un error al registrar");
            return { status: false, msg: "Network error, try again", token: null };
        }
    } else if (existingUser[0].provider !== 3) {
        console.log("the provider not is the same");
        return { status: false, msg: "Issue with the provider auth", token: null };
    } else {

        console.log("Autenticación exitosa.");
        console.log("user id :" + existingUser[0].userID);
        console.log("email :" + user_email);

        const token = jwt.sign(
            { id: existingUser[0].userID, email: user_email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        await saveUserSession(existingUser[0].userID, token, req);

        return { status: true, msg: "Autenticación exitosa.", token: token };
    }
}

async function LinkAccountFacebook(profile, accessToken) {
    console.log("Linking Facebook account");

    //the first step is search if exist a account with this email
    let user_email = "";

    if (typeof profile.emails === 'undefined') {
        user_email = profile.id + "@facebook.com";
    } else {
        user_email = profile.emails[0].value;
    }

    const fb_id = profile.id;

    const userID = profile.user_ID;

    const queryByMailOrGoogleId = "SELECT * FROM linked_accounts WHERE provider_id = ? AND provider = 3";
    const existingUser = await executeQueryFromPoolAsync(conexionOrbet, queryByMailOrGoogleId, [fb_id]);

    if (existingUser.length === 0) {
        //so how this is a link for a account we need search the account by the userID



        //the user not exist, so we need add this
        const usernameGenerated = user_email.split("@")[0] + "_" + nanoid(4);
        const queryRegister = "SELECT 1 FROM users WHERE user_id = ?";
        const resultReg = await executeQueryFromPoolAsync(conexionOrbet, queryRegister, [userID]);

        if (resultReg.length > 0) {
            //create link row
            const queryRegister2 = "INSERT INTO linked_accounts(	userID, provider_id, provider, display_name, email ) VALUES (?,?,?,?, ?)";
            const resultReg2 = await executeQueryFromPoolAsync(conexionOrbet, queryRegister2, [userID, fb_id, 3, profile.displayName, user_email]);

            console.log("usuario linkeado!");

            return { status: true, msg: "User registered", token: profile.tokenSession };


        } else {
            console.log("ocurrio un error al registrar");
            return { status: false, msg: "Network error, try again", token: null };
        }
    } else {

        //if the account is linked to another user return false!
        if (existingUser[0].userID != userID) {
            return { status: false, msg: "Account is linked with another user" };
        }

        console.log("Link ");
        console.log("user id :" + existingUser[0].userID);
        console.log("email :" + user_email);

        return { status: true, msg: "Autenticación exitosa.", token: profile.tokenSession };
    }
}

async function getUserIdByEmail(email, providerId) {
    const queryText = "SELECT user_id FROM users WHERE email = ? AND provider_id = ?";
    const [result] = await executeQueryFromPoolAsync(conexionOrbet, queryText, [email, providerId]);
    if (result.length > 0) {
        return result[0].user_id;
    } else {
        return -1;
    }
}

//loginOrRegisterBytwitch
async function loginOrRegisterBytwitch(profile, accessToken, req) {
    console.log("loginOrRegisterBytwitch");
    let user_email = "";

    if (typeof profile.emails === 'undefined') {
        user_email = profile.id + "@twitch.com";
    } else {
        user_email = profile.emails[0].value;
    }

    //the first step is search if exist a account with this email

    const twitch_id = profile.id;

    const passHashed = "PROVIDER_BY_THIRDPARTY";

    console.log("loginOrRegisterBytwitch 2");

    const queryByMailOrGoogleId = "SELECT userID, provider FROM linked_accounts WHERE provider_id = ? AND provider = 4";
    const existingUser = await executeQueryFromPoolAsync(conexionOrbet, queryByMailOrGoogleId, [twitch_id]);


    if (existingUser.length === 0) {
        //the user not exist, so we need add this
        const usernameGenerated = user_email.split("@")[0] + "_" + nanoid(4);
        const queryRegister = "INSERT INTO users(name, username, email, password_hash, byProvider ) VALUES (?,?,?,?, ?)";
        const resultReg = await executeQueryFromPoolAsync(conexionOrbet, queryRegister, [profile.displayName, usernameGenerated, user_email, passHashed, 1]);

        if (resultReg.insertId) {
            console.log("usuario registrado!");

            //create link row
            const queryRegister2 = "INSERT INTO linked_accounts(	userID, provider_id, provider, display_name, email, isMaster ) VALUES (?,?,?,?, ?, ?)";
            const resultReg2 = await executeQueryFromPoolAsync(conexionOrbet, queryRegister2, [resultReg.insertId, twitch_id, 4, profile.displayName, user_email, 1]);

            const token = jwt.sign(
                { id: resultReg.insertId, email: user_email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' } // El token expira en 1 hora
            );

            await saveUserSession(resultReg.insertId, token, req);

            return { status: true, msg: "User registered", token: token };


        } else {
            console.log("ocurrio un error al registrar");
            return { status: false, msg: "Network error, try again", token: null };
        }
    } else if (existingUser[0].provider !== 4) {
        console.log("the provider not is the same");
        return { status: false, msg: "Issue with the provider auth", token: null };
    } else {

        console.log("Autenticación exitosa.");
        console.log("user id :" + existingUser[0].userID);
        console.log("email :" + user_email);

        const token = jwt.sign(
            { id: existingUser[0].userID, email: user_email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        await saveUserSession(existingUser[0].userID, token, req);

        return { status: true, msg: "Autenticación exitosa.", token: token };
    }
}

async function LinkAccountTwitch(profile, accessToken) {
    console.log("Linking Twitch account");

    //the first step is search if exist a account with this email
    let user_email = "";

    if (typeof profile.emails === 'undefined') {
        user_email = profile.id + "@twitch.com";
    } else {
        user_email = profile.emails[0].value;
    }

    const twitch_id = profile.id;

    const userID = profile.user_ID;

    const queryByMailOrGoogleId = "SELECT * FROM linked_accounts WHERE provider_id = ? AND provider = 4";
    const existingUser = await executeQueryFromPoolAsync(conexionOrbet, queryByMailOrGoogleId, [twitch_id]);

    if (existingUser.length === 0) {
        //so how this is a link for a account we need search the account by the userID



        //the user not exist, so we need add this
        const usernameGenerated = user_email.split("@")[0] + "_" + nanoid(4);
        const queryRegister = "SELECT 1 FROM users WHERE user_id = ?";
        const resultReg = await executeQueryFromPoolAsync(conexionOrbet, queryRegister, [userID]);

        if (resultReg.length > 0) {
            //create link row
            const queryRegister2 = "INSERT INTO linked_accounts(	userID, provider_id, provider, display_name, email ) VALUES (?,?,?,?, ?)";
            const resultReg2 = await executeQueryFromPoolAsync(conexionOrbet, queryRegister2, [userID, twitch_id, 4, profile.displayName, user_email]);

            console.log("usuario linkeado!");

            return { status: true, msg: "User registered", token: profile.tokenSession };


        } else {
            console.log("ocurrio un error al registrar");
            return { status: false, msg: "Network error, try again", token: null };
        }
    } else {

        //if the account is linked to another user return false!
        if (existingUser[0].userID != userID) {
            return { status: false, msg: "Account is linked with another user" };
        }

        console.log("Link ");
        console.log("user id :" + existingUser[0].userID);
        console.log("email :" + user_email);

        return { status: true, msg: "Autenticación exitosa.", token: profile.tokenSession };
    }
}

async function getUserIdByEmail(email, providerId) {
    const queryText = "SELECT userID FROM linked_accounts WHERE email = ? AND provider_id = ?";
    const result = await executeQueryFromPoolAsync(conexionOrbet, queryText, [email, providerId]);
    if (result.length > 0) {
        return result[0].userID;
    } else {
        return -1;
    }
}

async function getUserIdByProvider(provider, providerId) {
    const queryText = "SELECT userID FROM linked_accounts WHERE provider = ? AND provider_id = ?";
    const result = await executeQueryFromPoolAsync(conexionOrbet, queryText, [provider, providerId]);
    if (result.length > 0) {
        return result[0].userID;
    } else {
        return -1;
    }
}



async function GetLinkedAccounts(req, res) {
    console.log("obteniendo linked accounts");

    const token = req.params.token;

    const tokenData = decodedJwt(token, process.env.JWT_SECRET);
    if (!tokenData) {
        return res.json({ status: false, message: "Miss data." });
    }

    const UserID = tokenData.id;

    // Query para obtener las cuentas vinculadas y sus nombres
    const query = `
        SELECT pu.name, la.display_name, la.email 
        FROM linked_accounts la
        INNER JOIN provider_users pu ON la.provider = pu.id
        WHERE la.userID = ?;
    `;

    try {
        const response = await executeQueryFromPoolAsync(conexionOrbet, query, [UserID]);
        res.json({ status: true, elementos: response }); // Respuesta con los resultados
    } catch (error) {
        console.error("Error fetching linked accounts:", error);
        res.json({ status: false, message: "Failed to fetch linked accounts" });
    }
}

//#endregion  

//#region validate2FA

//verify the code in the DB 
async function validate2fa(req, res) {
    const { user_id, code } = req.body;

    if (!user_id || !code) {
        return res.json({ enabled: false, result: "fail", message: "Data is missing" });
    }

    try {
        const queryText = "SELECT created_at FROM 2fa_codes WHERE code = ? AND userID = ? ORDER BY id DESC LIMIT 1";
        const result = await executeQueryFromPoolAsync(conexionOrbet, queryText, [code, user_id]);

        if (result.length === 0) {
            return res.json({ status: false, result: "fail", message: "Invalid code" });
        }

        const created_at = new Date(result[0].created_at); // Convert to Date object
        const now = new Date();
        const expirationTimeInMinutes = 15; // Set expiration time for the code
        const expirationTime = new Date(created_at.getTime() + expirationTimeInMinutes * 60000);

        //ya vencio el codigo
        if (now > expirationTime) {
            return res.json({ status: false, result: "fail", message: "Code expired" });
        }

        // Code is valid
        return res.json({ status: true, result: "success", message: "Code is valid" });
    } catch (error) {
        console.error("Error validating 2FA code:", error);
        return res.status(500).json({ status: false, result: "fail", message: "Internal server error" });
    }
}

//request a code to the mail
async function request2fa(req, res) {
    const { user_id } = req.body;

    if (typeof user_id === 'undefined') {
        return res.json({ status: false, result: "fail", message: "user_id not defined" });
    }

    const data2fa = await GetProvider2FA(user_id);

    if (!data2fa.enabled) {
        return res.json({ status: false, result: "fail", message: "user_id have not enable 2FA" });
    }



    if (data2fa.provider == 'email') {

        //we will send one code to the email
        //make a code for send 
        const code_request = customAlphabet("0123456789", 8);

        // Reemplazar los marcadores con los valores correspondientes
        var bodyMail = data.replace('{{name}}', results[0].name).replace('{{code}}', code_);
        const getUserInfo = "SELECT name, email FROM users WHERE user_id = ?";

        const userInfo = await executeQueryFromPoolAsync(conexionOrbet, getUserInfo, [user_id]);

        if (userInfo.length > 0) {
            const name_ = getUserInfo[0].name;
            const emailUser = getUserInfo[0].email;

            const templatePath = path.join(__dirname, 'email_templates', '2fa_email_template.html');

            const add_2fa_db = "INSERT INTO 2fa_codes(code,userID) VALUES(?,?)";
            const additional_db = await executeQueryFromPoolAsync(conexionOrbet, add_2fa_db, [code_request, user_id]);

            if (!additional_db.insertId) {
                res.json({ status: false, result: "fail", message: "server error on requesting" });
            }

            // Leer el archivo de plantilla HTML
            fs.readFile(templatePath, 'utf8', (err, data) => {
                if (err) {
                    console.error("Error al leer la plantilla de correo:", err);
                    return;
                }

                // Reemplazar los marcadores con los valores correspondientes
                var bodyMail = data.replace('{{name}}', name_).replace('{{code}}', code_request);

                // Correo sin formato (texto plano)
                var plainMail = `Hi ${results[0].name},\nEnter this your 2FA Code: ${code_request}`;

                // Opciones del correo
                var mailOptions = {
                    from: 'Orbet <gambleversecontact@gmail.com>', //this need be changed in production!
                    to: emailUser,
                    subject: 'Orbet 2FA Code',
                    text: plainMail,
                    html: bodyMail
                };

                // Enviar el correo con el código de recuperación
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log("Email sending failed!");
                        console.log(error);

                        res.json({ status: false, result: "fail", message: "server issue" });
                    } else {
                        console.log('Email sent to ' + data_.email + ": " + info.response);

                        res.json({ status: true, result: "success", message: "Code was sent" });
                    }
                });
            });
        } else {
            console.log("user not found");
            res.json({ status: false, result: "fail", message: "user_id not defined" });
        }
    }
}

//verify if an user have enable the 2FA
async function IsEnable2FA(req, res) {
    const { user_id } = req.body;

    if (typeof user_id === 'undefined') {
        return res.json({ enabled: false, result: "fail", message: "user_id not defined" });
    }

    const response = await GetProvider2FA(user_id);
    return res.json(response);
}

async function GetProvider2FA(user_id) {
    const query_text = `
    SELECT uf.status, p.name AS providerName
    FROM users_2fa_setting uf
    JOIN providers_2fa p ON p.id = uf.provider_2FA
    WHERE uf.userID = ?
    `;

    const result1 = await executeQueryFromPoolAsync(conexionOrbet, query_text, [user_id]);
    if (result1.length == 0) {
        return { enabled: false };
    }

    const providerName = result1[0].providerName;
    const status_current = (result1[0].status == 1);
    return { enabled: status_current, provider: providerName };
}

//#endregion

//#region security

//verify that session ip be equals to the request
function verifyIp(session, ip) {
    const currentIp = ip;// req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (session.ipAddress && session.ipAddress !== currentIp) {
        return false;
    }
    return true;
}

//managment de sessions
function saveSession(userID, ip, agent, token,) {

}

function logoutAllSessions() {

}

function updateActivitySession() {

}

//#endregion

//#region API

//#region secure-endpoint

/**
 * @api {get} /secure-endpoint Secure Endpoint
 * @description Verifies if the request has access to the secure endpoint.
 * @status Documented ✅
 * @notion https://www.notion.so/Secure-Endpoint-142be7ccfc36459480464ff467fb5c16?pvs=4
 */
app.get('/secure-endpoint', async (req, res) => {
    const path = req.route && req.route.path ? `${req.baseUrl}${req.route.path}` : req.originalUrl; // Usar `originalUrl` como alternativa
    return res.status(200).json({ message: 'Access granted to ' + path });
});

//#endregion

//#region Admin sessions

/**
 * @api {post} /admin/login Admin Login
 * @description Authenticates an admin user and returns a JWT token upon successful login.
 * 
 * @body {string} email - Admin's email (required).
 * @body {string} password - Admin's password (required).
 * 
 * @success {200} { message: "Login successful", token: "JWT_TOKEN" }
 * @error {400} Email and password are required.
 * @error {401} Invalid password.
 * @error {404} Admin not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Admin-Login-18c7ea735ace81c6aedacdbb0f015f02?pvs=4
 */
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // 1. Verificar si el administrador existe
        const [adminResult] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT a.admin_id, a.name, a.email, a.password_hash, a.role_id, r.role_name, r.permissions
            FROM admins a
            JOIN admin_roles r ON a.role_id = r.role_id
            WHERE a.email = ?
        `, [email]);

        if (adminResult.length === 0) {
            return res.status(404).json({ message: 'Admin not found.' });
        }

        const admin = adminResult[0];
        data = decryptRecursively(admin);
        console.log(data);
        // 2. Verificar la contraseña
        const isPasswordValid = await verifyPassword(password, admin.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        // 3. Generar el token JWT
        const tokenPayload = {
            admin_id: admin.admin_id,
            email: admin.email,
            name: admin.name,
            role: data.role_name,
            permissions: JSON.parse(data.permissions) // Convertir permisos a objeto
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 4. Respuesta con el token
        return res.status(200).json({
            message: 'Login successful',
            token
        });

    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region player-info

/**
 * @api {put} /player-info Update Player Information
 * @description Updates user information based on provided fields.
 * @body {number} user_id - User ID (required)
 * @body {Object} Other key-value pairs for updating user data.
 * @success {200} { message: "User updated successfully" }
 * @error {400} Missing or invalid fields.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Player-Info-1777ea735ace81fb908aeb69ae89cbab?pvs=4
 */
app.put('/player-info', encryptMiddleware, async (req, res) => {
    const { user_id, ...fieldsToUpdate } = req.body; // Leer user_id y los campos a actualizar

    try {
        // Validar que se recibió un user_id
        if (!user_id) {
            return res.status(400).json({ message: 'user_id is required' });
        }

        // Verificar que hay datos para actualizar
        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({ message: 'No fields provided to update' });
        }

        // Crear la consulta dinámica
        const fields = Object.keys(fieldsToUpdate).map(field => `${field} = ?`).join(', ');
        const values = Object.values(fieldsToUpdate);
        const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;

        // Ejecutar la consulta
        await executeQueryFromPoolAsync(conexionOrbet, query, [...values, user_id]);

        return res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error en ' + path + ":", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region update-user-tags

/**
 * @api {put} /update-user-tags Update User Tags
 * @description Updates the user's tags by replacing existing ones.
 * @body {number} user_id - User ID (required)
 * @body {array} tags - List of tag IDs.
 * @success {200} { message: "Tags updated successfully" }
 * @error {400} Invalid input.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Update-User-Tags-1777ea735ace81e6a287ec453807e303?pvs=4
 */
app.put('/update-user-tags', async (req, res) => {
    const { user_id, tags } = req.body;

    try {
        // Validar que se recibió un user_id y un array de tags
        if (!user_id) {
            return res.status(400).json({ message: 'user_id is required' });
        }

        if (!Array.isArray(tags)) {
            return res.status(400).json({ message: 'tags must be an array' });
        }

        // Iniciar una transacción para garantizar la consistencia
        const connection = await conexionOrbet.getConnection();
        try {
            await connection.query('START TRANSACTION');

            // Eliminar las tags actuales del usuario
            await connection.query('DELETE FROM user_tags WHERE user_id = ?', [user_id]);

            // Si hay nuevas tags, insertarlas
            if (tags.length > 0) {
                const insertQuery = `
                    INSERT INTO user_tags (user_id, tag_id)
                    VALUES ${tags.map(() => '(?, ?)').join(', ')}
                `;
                const values = tags.flatMap(tag_id => [user_id, tag_id]);
                await connection.query(insertQuery, values);
            }

            // Confirmar la transacción
            await connection.query('COMMIT');
            return res.status(200).json({ message: 'Tags updated successfully' });
        } catch (transactionError) {
            await connection.query('ROLLBACK');
            throw transactionError;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating user tags:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region update-user-groups

/**
 * @api {put} /update-user-groups Update User Groups
 * @description Updates the user's group memberships.
 * @body {number} user_id - User ID (required)
 * @body {array} groups - List of group IDs.
 * @success {200} { message: "Groups updated successfully" }
 * @error {400} Invalid input.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Update-User-Groups-1777ea735ace81df8108d9d586805f86?pvs=4
 */
app.put('/update-user-groups', async (req, res) => {
    const { user_id, groups } = req.body;

    try {
        // Validar que se recibió un user_id y un array de groups
        if (!user_id) {
            return res.status(400).json({ message: 'user_id is required' });
        }

        if (!Array.isArray(groups)) {
            return res.status(400).json({ message: 'groups must be an array' });
        }

        // Iniciar una transacción para garantizar la consistencia
        const connection = await conexionOrbet.getConnection();
        try {
            await connection.query('START TRANSACTION');

            // Eliminar los grupos actuales del usuario
            await connection.query('DELETE FROM user_groups WHERE user_id = ?', [user_id]);

            // Si hay nuevos grupos, insertarlos
            if (groups.length > 0) {
                const insertQuery = `
                    INSERT INTO user_groups (user_id, group_id)
                    VALUES ${groups.map(() => '(?, ?)').join(', ')}
                `;
                const values = groups.flatMap(group_id => [user_id, group_id]);
                await connection.query(insertQuery, values);
            }

            // Confirmar la transacción
            await connection.query('COMMIT');
            return res.status(200).json({ message: 'Groups updated successfully' });
        } catch (transactionError) {
            await connection.query('ROLLBACK');
            throw transactionError;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating user groups:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region update-user-ip

/**
 * @api {put} /update-user-ip Update User IP Address
 * @description Registers or updates the last-used timestamp of a user's IP address.
 * @body {number} user_id - User ID (required)
 * @body {string} ip_address - User's IP address.
 * @success {200} { message: "IP registered or updated successfully" }
 * @error {400} Missing user_id or ip_address.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Update-User-IP-1777ea735ace810c89fce1ed8bd3e612?pvs=4
 */
app.put('/update-user-ip', async (req, res) => {
    const { user_id, ip_address } = req.body;

    try {
        // Validar que se recibió un user_id y una ip_address
        if (!user_id || !ip_address) {
            return res.status(400).json({ message: 'user_id and ip_address are required' });
        }

        // Iniciar una transacción para garantizar la consistencia
        const connection = await conexionOrbet.getConnection();
        try {
            await connection.query('START TRANSACTION');

            // Verificar si la IP ya está registrada para el usuario
            const [rows] = await connection.query(
                'SELECT * FROM user_ips WHERE user_id = ? AND ip_address = ?',
                [user_id, ip_address]
            );

            if (rows.length > 0) {
                // Si la IP ya existe, actualizar el campo used_at
                await connection.query(
                    'UPDATE user_ips SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND ip_address = ?',
                    [user_id, ip_address]
                );
            } else {
                // Si no existe, insertar un nuevo registro
                await connection.query(
                    'INSERT INTO user_ips (user_id, ip_address, used_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                    [user_id, ip_address]
                );
            }

            // Confirmar la transacción
            await connection.query('COMMIT');
            return res.status(200).json({ message: 'IP registered or updated successfully' });
        } catch (transactionError) {
            await connection.query('ROLLBACK');
            throw transactionError;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating user IP:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region update-user-addresse

/**
 * @api {put} /update-user-addresses Update User Crypto Addresses
 * @description Updates or registers new cryptocurrency addresses for the user.
 * @body {number} user_id - User ID (required)
 * @body {array} addresses - List of address objects with address_value and currency_type.
 * @success {200} { message: "Addresses updated successfully" }
 * @error {400} Invalid input.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Update-User-Addresses-ca59032749d7491d8b2d1fe75c221cb9?pvs=4
 */
app.put('/update-user-addresses', async (req, res) => {
    const { user_id, addresses } = req.body;

    try {
        // Validar que se recibió un user_id y un array de addresses
        if (!user_id) {
            return res.status(400).json({ message: 'user_id is required' });
        }
        if (!Array.isArray(addresses) || addresses.length === 0) {
            return res.status(400).json({ message: 'addresses must be a non-empty array' });
        }

        // Iniciar una transacción para consistencia
        const connection = await conexionOrbet.getConnection();
        try {
            await connection.query('START TRANSACTION');

            // Insertar o actualizar direcciones
            for (const address of addresses) {
                const { address_value, currency_type } = address;

                if (!address_value || !currency_type) {
                    throw new Error('Each address must include address_value and currency_type');
                }

                // Intentar insertar o actualizar la dirección
                const query = `
                    INSERT INTO user_used_addresses (user_id, crypto_address, currency, used_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON DUPLICATE KEY UPDATE used_at = CURRENT_TIMESTAMP
                `;
                await connection.query(query, [user_id, address_value, currency_type]);
            }

            // Confirmar la transacción
            await connection.query('COMMIT');
            return res.status(200).json({ message: 'Addresses updated successfully' });
        } catch (transactionError) {
            await connection.query('ROLLBACK');
            throw transactionError;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating user addresses:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region user-phones

/**
 * @api {post} /user-phones Add or Update Phone Number
 * @description Adds or updates a user's phone number.
 * @body {number} user_id - User ID (required)
 * @body {string} phone_number - Phone number.
 * @body {string} phone_type - Type of phone (mobile, home, etc.).
 * @body {string} country - Country of the phone number.
 * @success {200} { message: "Phone number added/updated successfully" }
 * @error {400} Missing required fields.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Add-or-Update-Phone-Number-eda62db86bcf400c8895c1cf9c774073?pvs=4
 */
app.post('/user-phones', async (req, res) => {
    const { user_id, phone_number, phone_type, country } = req.body;

    if (!user_id || !phone_number || !phone_type || !country) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Verificar si el número de teléfono ya existe con los mismos datos
        const selectQuery = `
            SELECT * FROM user_phones
            WHERE user_id = ? AND phone_number = ? AND phone_type = ? AND country = ?
        `;
        const existingPhone = await executeQueryFromPoolAsync(conexionOrbet, selectQuery, [
            user_id, phone_number, phone_type, country
        ]);

        // Si el número ya existe y no hay cambios, no hacemos nada
        if (existingPhone.length > 0) {
            return res.status(200).json({ message: 'Phone number already exists, no update performed' });
        }

        // Si no existe o hay cambios, procedemos con el INSERT o UPDATE
        const insertQuery = `
            INSERT INTO user_phones (user_id, phone_number, phone_type, verified, status, country, added_at)
            VALUES (?, ?, ?, 'not verified', 'not active', ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE phone_type = ?, country = ?, added_at = CURRENT_TIMESTAMP
        `;
        await executeQueryFromPoolAsync(conexionOrbet, insertQuery, [
            user_id, phone_number, phone_type, country, phone_type, country
        ]);

        return res.status(200).json({ message: 'Phone number added/updated successfully' });
    } catch (error) {
        console.error('Error updating phone number:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {put} /user-phones/verify Verify User Phone Number
 * @description Verifies a user's phone number by updating its status to "verified".
 * @body {number} user_id - User ID (required).
 * @body {string} phone_number - Phone number to verify (required).
 * @success {200} { message: "Phone number verified successfully" }
 * @error {400} Missing required fields: user_id and phone_number.
 * @error {404} Phone number not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Verify-User-Phone-Number-64053a21a5814d13aa6234074a38a990?pvs=4
 */
app.put('/user-phones/verify', async (req, res) => {
    const { user_id, phone_number } = req.body;

    if (!user_id || !phone_number) {
        return res.status(400).json({ message: 'user_id and phone_number are required' });
    }

    try {
        const query = `
            UPDATE user_phones 
            SET verified = 'verified'
            WHERE user_id = ? AND phone_number = ?
        `;
        const result = await executeQueryFromPoolAsync(conexionOrbet, query, [user_id, phone_number]);

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'Phone number verified successfully' });
        } else {
            return res.status(404).json({ message: 'Phone number not found' });
        }
    } catch (error) {
        console.error('Error verifying phone number:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {delete} /user-phones Delete User Phone Number
 * @description Deletes a specific phone number associated with a user.
 * @body {number} user_id - User ID (required).
 * @body {string} phone_number - Phone number to delete (required).
 * @success {200} { message: "Phone number deleted successfully" }
 * @error {400} Missing required fields: user_id and phone_number.
 * @error {404} Phone number not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Delete-User-Phone-Number-674e9474a1a24a6eb23fa6b2d4fff314?pvs=4
 */
app.delete('/user-phones', async (req, res) => {
    const { user_id, phone_number } = req.body;

    if (!user_id || !phone_number) {
        return res.status(400).json({ message: 'user_id and phone_number are required' });
    }

    try {
        const query = `
            DELETE FROM user_phones
            WHERE user_id = ? AND phone_number = ?
        `;
        const result = await executeQueryFromPoolAsync(conexionOrbet, query, [user_id, phone_number]);

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'Phone number deleted successfully' });
        } else {
            return res.status(404).json({ message: 'Phone number not found' });
        }
    } catch (error) {
        console.error('Error deleting phone number:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /user-phones/:user_id Get User Phone Numbers
 * @description Retrieves all phone numbers associated with a specific user.
 * @param {number} user_id - User ID (required) passed as a URL parameter.
 * @success {200} Returns an array of phone numbers associated with the user.
 * @example Success Response:
 * {
 *   "phones": [
 *     {
 *       "user_id": 1,
 *       "phone_number": "+1234567890",
 *       "phone_type": "mobile",
 *       "verified": "not verified",
 *       "status": "not active",
 *       "country": "USA",
 *       "added_at": "2025-01-01T12:00:00.000Z"
 *     }
 *   ]
 * }
 * @error {400} user_id is required.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-User-Phone-Numbers-9425abecf809483cbda44aa917a4008b?pvs=4
 */
app.get('/user-phones/:user_id', async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ message: 'user_id is required' });
    }

    try {
        const query = `
            SELECT user_id, phone_number, phone_type, verified, status, country, added_at
            FROM user_phones
            WHERE user_id = ?
        `;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query, [user_id]);

        return res.status(200).json({ phones: results });
    } catch (error) {
        console.error('Error fetching phone numbers:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region duplications

/**
 * @api {post} /duplications Add or Update User Duplication Record
 * @description Adds a new duplication record for a user or updates the existing record if it already exists.
 * 
 * @body {number} user_id - User ID to whom the duplication record belongs (required).
 * @body {string} [reason_uuid] - UUID representing the reason for the duplication (optional).
 * @body {number} [other_user_id] - ID of another user suspected to be duplicated (optional).
 * 
 * @success {201} Duplication record added successfully.
 * @example Success Response:
 * {
 *   "message": "Duplication added successfully"
 * }
 * 
 * @success {200} Duplication record updated successfully.
 * @example Update Response:
 * {
 *   "message": "Duplication updated successfully"
 * }
 * 
 * @error {400} user_id is required.
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Add-or-Update-User-Duplication-Record-c07ba61766b14240ae290c0aef98eef1?pvs=4
 */
app.post('/duplications', async (req, res) => {
    const { user_id, reason_uuid, other_user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ message: 'user_id is required' });
    }

    try {
        // Validar si ya existe una duplicación con los mismos datos
        const selectQuery = `
            SELECT * FROM user_duplications
            WHERE user_id = ? AND 
                  (reason_uuid = ? OR duplicated_user_id = ?)
        `;
        const existingDuplication = await executeQueryFromPoolAsync(conexionOrbet, selectQuery, [user_id, reason_uuid || null, other_user_id || null]);

        if (existingDuplication.length > 0) {
            // Actualizar `updated_at` si ya existe
            const updateQuery = `
                UPDATE user_duplications
                SET updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND 
                      (reason_uuid = ? OR duplicated_user_id = ?)
            `;
            await executeQueryFromPoolAsync(conexionOrbet, updateQuery, [user_id, reason_uuid || null, other_user_id || null]);
            return res.status(200).json({ message: 'Duplication updated successfully' });
        } else {
            // Insertar nueva duplicación
            const insertQuery = `
                INSERT INTO user_duplications (user_id, reason_uuid, duplicated_user_id, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            await executeQueryFromPoolAsync(conexionOrbet, insertQuery, [user_id, reason_uuid || null, other_user_id || null]);
            return res.status(201).json({ message: 'Duplication added successfully' });
        }
    } catch (error) {
        console.error('Error handling duplications:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /duplications/:user_id Get User Duplications
 * @description Retrieves all duplication records for a specific user.
 * 
 * @param {number} user_id - The ID of the user whose duplications are to be fetched (required, passed as a URL parameter).
 * 
 * @success {200} Returns a list of duplication records associated with the user.
 * @example Success Response:
 * {
 *   "duplications": [
 *     {
 *       "user_id": 1,
 *       "reason_uuid": "123e4567-e89b-12d3-a456-426614174000",
 *       "duplicated_user_id": 2,
 *       "created_at": "2025-01-01T12:00:00Z",
 *       "updated_at": "2025-01-02T12:00:00Z"
 *     }
 *   ]
 * }
 * 
 * @error {400} Missing user_id in the request.
 * @example Error Response:
 * {
 *   "message": "user_id is required"
 * }
 * 
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Get-User-Duplications-17a7ea735ace8115a93cf21caef8c8c9?pvs=4
 */
app.get('/duplications/:user_id', async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ message: 'user_id is required' });
    }

    try {
        const query = `
            SELECT user_id, reason_uuid, duplicated_user_id, created_at, updated_at
            FROM user_duplications
            WHERE user_id = ?
        `;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query, [user_id]);

        return res.status(200).json({ duplications: results });
    } catch (error) {
        console.error('Error fetching duplications:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {delete} /duplications Delete User Duplication
 * @description Deletes a duplication record for a specific user based on the reason or duplicated user ID.
 * 
 * @body {number} user_id - The ID of the user (required).
 * @body {string} [reason_uuid] - The UUID of the reason for the duplication (optional).
 * @body {number} [other_user_id] - The ID of the duplicated user (optional).
 * 
 * @success {200} Duplication record deleted successfully.
 * @example Success Response:
 * {
 *   "message": "Duplication deleted successfully"
 * }
 * 
 * @error {400} Missing required `user_id` in the request.
 * @example Error Response:
 * {
 *   "message": "user_id is required"
 * }
 * 
 * @error {404} Duplication record not found.
 * @example Error Response:
 * {
 *   "message": "Duplication not found"
 * }
 * 
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Delete-User-Duplication-17a7ea735ace81f0836df8408a57ef10?pvs=4
 */
app.delete('/duplications', async (req, res) => {
    const { user_id, reason_uuid, other_user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ message: 'user_id is required' });
    }

    try {
        const deleteQuery = `
            DELETE FROM user_duplications
            WHERE user_id = ? AND 
                  (reason_uuid = ? OR duplicated_user_id = ?)
        `;
        const result = await executeQueryFromPoolAsync(conexionOrbet, deleteQuery, [user_id, reason_uuid, other_user_id]);

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'Duplication deleted successfully' });
        } else {
            return res.status(404).json({ message: 'Duplication not found' });
        }
    } catch (error) {
        console.error('Error deleting duplication:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region documents

/**
 * @api {post} /documents Upload Document
 * @description Uploads a document (image or PDF) to the server.
 * @body {file} file - Document file to upload.
 * @success {200} { message: "File uploaded successfully", file: "filename" }
 * @error {400} No file provided.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Upload-Document-17a7ea735ace81bea74fc7ad1632a36a?pvs=4
 */
app.post('/documents', upload.single('file'), (req, res) => {
    try {
        // Validar si se recibió un archivo
        if (!req.file) {
            return res.status(400).json({
                message: 'No se ha proporcionado un archivo'
            });
        }

        // Responder con éxito
        res.status(200).json({
            message: 'Archivo subido correctamente',
            file: req.file.filename
        });
    } catch (error) {
        // Manejo de errores
        console.error('Error al subir el archivo:', error);
        res.status(500).json({
            message: 'Error al subir el archivo',
            error: error.message
        });
    }
});

/**
 * @api {get} /documents/:filename Download a Document
 * @description Retrieves and downloads a document by its filename if it exists in the storage directory.
 * 
 * @param {string} filename - The name of the file to be downloaded (required, passed as a URL parameter).
 * 
 * @success {200} The requested file is sent for download.
 * @example Success Response:
 * (File download is triggered for the requested document)
 * 
 * @error {404} The requested file was not found.
 * @example Error Response:
 * {
 *   "message": "File Not Found"
 * }
 * 
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Download-a-Document-17a7ea735ace8117b493f8e6c992d3e7?pvs=4
 */
app.get('/documents/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(storageDir, filename);

    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);  // Enviar el archivo al cliente
    } else {
        res.status(404).json({ message: 'File Not Found' });
    }
});

/**
 * @api {get} /api/admin/documents Get User Documents
 * @description Retrieves a list of user documents with optional filtering by status and user_id.
 * 
 * @query {string} [status] - Filter documents by status (optional).
 * @query {number} [user_id] - Filter documents by user ID (optional).
 * 
 * @success {200} { documents: [{ document_id, user_id, file_path, type, status, updated_at }] }
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-User-Documents-18c7ea735ace817aa7e1f1dc60946a17?pvs=4
 */
app.get('/api/admin/documents', async (req, res) => {
    const { status, user_id } = req.query;

    let query = `
        SELECT 
            document_id, user_id, file_path, type, status, updated_at
        FROM user_documents
        WHERE 1=1
    `; // where is always true to avoid checking if there are more conditions
    let params = [];

    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    if (user_id) {
        query += ` AND user_id = ?`;
        params.push(user_id);
    }

    try {
        const [documents] = await conexionOrbet.query(query, params);
        res.status(200).json({ documents });
    } catch (error) {
        console.error('Error retrieving documents:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /api/admin/documents/:doc_id Get Specific Document
 * @description Retrieves a specific document's details along with a secure download link.
 * 
 * @param {number} doc_id - Document ID (required).
 * 
 * @success {200} { document_id, user_id, file_name, file_type, status, upload_date, secure_url }
 * @error {404} Document not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Specific-Document-18c7ea735ace81c3befbd23516eb12d6?pvs=4
 */
app.get('/api/admin/documents/:doc_id', async (req, res) => {
    const { doc_id } = req.params;

    try {
        const [document] = await conexionOrbet.query(`
            SELECT document_id, user_id, description, type, status, created_at, file_path
            FROM user_documents
            WHERE document_id = ?
        `, [doc_id]);

        if (document.length === 0) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        const doc = document[0];
        const secureLink = generateSecureLink(doc.file_path);

        res.status(200).json({
            document_id: doc.document_id,
            user_id: doc.user_id,
            file_name: doc.description,
            file_type: doc.file_type,
            status: doc.status,
            upload_date: doc.created_at,
            secure_url: secureLink
        });
    } catch (error) {
        console.error('Error retrieving document:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {put} /api/admin/documents/:doc_id/status Update Document Status
 * @description Updates the status of a document.
 * 
 * @param {number} doc_id - Document ID (required).
 * @body {string} status - New status of the document ("pending", "approved", "not approved").
 * 
 * @success {200} { message: "Document status updated to {status}." }
 * @error {400} Invalid status value.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Document-Status-18c7ea735ace81a38b72ff615eb22889?pvs=4
 */
app.put('/api/admin/documents/:doc_id/status', async (req, res) => {
    const { doc_id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'not approved'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
    }

    try {
        await conexionOrbet.query(`
            UPDATE user_documents 
            SET status = ?, updated_at = NOW(), is_approved = ?
            WHERE document_id = ?
        `, [status, status === 'approved' ? 'YES' : 'NO', doc_id]);

        res.status(200).json({ message: `Document status updated to ${status}.` });
    } catch (error) {
        console.error('Error updating document status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

function generateSecureLink(filePath) {
    const baseUrl = process.env.FILE_STORAGE_URL || 'http://localhost:3004/cdn_orbet';
    const secretKey = process.env.JWT_SECRET;
    const expiresIn = process.env.EXPIRE_TIME || '5m'; // Link expiration time
    filePath = encrypt(filePath);
    // Generate JWT token with file path and expiration
    const token = jwt.sign({ filePath }, secretKey, { expiresIn });

    return `${baseUrl}/${token}`;
}

/**
 * @api {get} /cdn_orbet/:token Retrieve Secure File
 * @description Provides secure access to files stored in the CDN by verifying a signed JWT token.
 *
 * @param {string} token - The JWT token containing the file path (required).
 *
 * @success {200} The requested file is sent for download.
 * @example Success Response:
 * (File download is triggered for the requested document)
 *
 * @error {403} Invalid or expired link.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Secure-File-18c7ea735ace814bb882c3a5ad8e5d93?pvs=4
 */
app.get('/cdn_orbet/:token', async (req, res) => {
    const { token } = req.params;
    const secretKey = process.env.JWT_SECRET;

    try {
        // Verify the token
        const decoded = jwt.verify(token, secretKey);
        let filePath = decoded.filePath;
        filePath = decrypt(filePath);
        // Send the file if the token is valid
        try {
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
            res.sendFile(filePath, { root: storageDir });
        } catch (error) {
            console.error('Error sending file:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(403).json({ message: 'Invalid or expired link' });
    }
});

/**
 * @api {get} /api/admin/compliance_logs Retrieve Compliance Logs
 * @description Fetches a list of compliance log entries, including user and admin information.
 *
 * @auth Requires authentication with an admin role.
 *
 * @success {200} { logs: [{ log_id, user_id, admin_id, action_taken, timestamp, admin_name, user_name }] }
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Compliance-Logs-18c7ea735ace81529a30fb2c7c11a155?pvs=4
 */
app.get('/api/admin/compliance_logs', verifyAuth({ useJWT: true, ReqRole: 'admin' }), async (req, res) => {
    try {
        const logs = await conexionOrbet.query(`
            SELECT cl.*, a.name AS admin_name, u.name AS user_name
            FROM compliance_logs cl
            JOIN admins a ON cl.admin_id = a.admin_id
            JOIN users u ON cl.user_id = u.user_id
            ORDER BY cl.timestamp DESC
        `);

        res.status(200).json({ logs });
    } catch (error) {
        console.error('Error fetching compliance logs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region TestEncryption

/**
 * @api {post} /save-sensitive-data Save Sensitive Data
 * @description Saves encrypted sensitive data into the database. If the key already exists, it updates the value.
 * 
 * @body {object} key-value pairs - Data to be encrypted and saved. Example:
 * @example Request Body:
 * {
 *   "token": "example-token",
 *   "apiKey": "example-api-key"
 * }
 * 
 * @success {200} Sensitive data saved or updated successfully.
 * @example Success Response:
 * {
 *   "message": "Sensitive data saved securely"
 * }
 * 
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Save-Sensitive-Data-Only-Test-17a7ea735ace8160aaf0e7f7889af658?pvs=4
 */
app.post('/save-sensitive-data', async (req, res) => {
    try {
        // Guardar datos cifrados en la base de datos
        for (const [key, value] of Object.entries(req.body)) {
            if (!key || !value) continue; // Validar que tanto la clave como el valor estén presentes

            const query = `
                INSERT INTO sensitive_data (key_name, encrypted_value)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE encrypted_value = ?, updated_at = CURRENT_TIMESTAMP
            `;
            await executeQueryFromPoolAsync(conexionOrbet, query, [key, value, value]);
        }

        res.status(200).json({ message: 'Sensitive data saved securely' });
    } catch (error) {
        console.error('Error saving sensitive data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /get-sensitive-data Retrieve Sensitive Data
 * @description Retrieves all encrypted sensitive data from the database.
 * 
 * @success {200} Sensitive data retrieved successfully.
 * @example Success Response:
 * {
 *   "results": [
 *     { "key_name": "token", "value": "encrypted_token_value" },
 *     { "key_name": "apiKey", "value": "encrypted_api_key_value" }
 *   ]
 * }
 * 
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Sensitive-Data-Only-Test-17a7ea735ace8120bd65d72fa7d892be?pvs=4
 */
app.get('/get-sensitive-data', async (req, res) => {
    try {
        const query = `SELECT key_name, encrypted_value AS value FROM sensitive_data`;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query);

        // El middleware de descifrado descifrará automáticamente si está habilitado
        res.json({ results });
    } catch (error) {
        console.error('Error fetching sensitive data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region TermsAndConditions

/**
 * @api {post} /terms Create New Terms and Conditions
 * @description Creates a new version of the terms and conditions. The current active version is archived.
 * 
 * @body {string} content - The content of the new terms and conditions (required).
 * @body {string} [created_by] - Optional ID of the admin who created the version.
 * 
 * @example Request Body:
 * {
 *   "content": "These are the updated terms and conditions.",
 *   "created_by": "admin_123"
 * }
 * 
 * @success {201} New terms and conditions version created successfully.
 * @example Success Response:
 * {
 *   "message": "New terms and conditions version created successfully."
 * }
 * 
 * @error {400} Missing or invalid content field.
 * @example Error Response:
 * {
 *   "message": "Content is required and must be a string."
 * }
 * 
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Create-New-Terms-and-Conditions-17a7ea735ace81928669df81070b70a4?pvs=4
 */
app.post('/terms', encryptMiddleware, async (req, res) => {
    const { content, created_by } = req.body; // `created_by` es opcional, puede ser un identificador del administrador

    try {
        // Validar los campos requeridos
        if (!content || typeof content !== 'string') {
            return res.status(400).json({ message: 'Content is required and must be a string.' });
        }

        // Desactivar la versión activa actual (si existe)
        const deactivateQuery = `
            UPDATE terms_and_conditions
            SET status = 'archived'
            WHERE status = 'active'
        `;
        await executeQueryFromPoolAsync(conexionOrbet, deactivateQuery);

        // Insertar la nueva versión
        const insertQuery = `
            INSERT INTO terms_and_conditions (content, status, created_at)
            VALUES (?, 'active', CURRENT_TIMESTAMP)
        `;
        await executeQueryFromPoolAsync(conexionOrbet, insertQuery, [content]);

        res.status(201).json({ message: 'New terms and conditions version created successfully.' });
    } catch (error) {
        console.error('Error creating new terms and conditions:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {post} /terms/consent User Consent to Terms
 * @description Records user consent for a specific version of the terms and conditions.
 * @body {number} user_id - User ID (required)
 * @body {number} version_id - Terms version ID.
 * @body {string} consent_status - Consent status (accepted/rejected).
 * @success {201} { message: "Consent recorded successfully" }
 * @error {400} Missing fields.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/User-Consent-to-Terms-17a7ea735ace81aea2ecd4e88095756a?pvs=4
 */
app.post('/terms/consent', async (req, res) => {
    const { user_id, version_id, consent_status } = req.body;

    try {
        // Validación de datos requeridos
        if (!user_id || !version_id || !consent_status) {
            return res.status(400).json({ message: 'user_id, version_id, and consent_status are required' });
        }

        // Consulta para insertar o actualizar el consentimiento
        const query = `
            INSERT INTO user_consent_records (user_id, version_id, consent_status, consented_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE 
                consent_status = VALUES(consent_status),
                consented_at = CURRENT_TIMESTAMP
        `;

        await executeQueryFromPoolAsync(conexionOrbet, query, [user_id, version_id, consent_status]);

        res.status(201).json({ message: 'Consent recorded successfully' });
    } catch (error) {
        console.error('Error recording consent:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /terms/consents/:user_id Get User Consent Records
 * @description Retrieves all consent records for a specific user, ordered by the consent date.
 * 
 * @param {number} user_id - The ID of the user to retrieve consent records for. (required)
 * 
 * @success {200} Consent records retrieved successfully.
 * @example Success Response:
 * {
 *   "consents": [
 *     {
 *       "id": 1,
 *       "version_id": 2,
 *       "consent_status": "accepted",
 *       "consented_at": "2024-01-01T10:00:00.000Z"
 *     }
 *   ]
 * }
 * 
 * @error {400} user_id is required.
 * @error {404} No consent records found for this user.
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Get-User-Consent-Records-17a7ea735ace81189a98f1b38fcec351?pvs=4
 */
app.get('/terms/consents/:user_id', async (req, res) => {
    const { user_id } = req.params;

    try {
        // Validar que se envió el user_id
        if (!user_id) {
            return res.status(400).json({ message: 'user_id is required' });
        }

        // Consultar los consentimientos del usuario
        const query = `
            SELECT id, version_id, consent_status, consented_at
            FROM user_consent_records
            WHERE user_id = ?
            ORDER BY consented_at DESC
        `;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query, [user_id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No consent records found for this user' });
        }

        res.status(200).json({ consents: results });
    } catch (error) {
        console.error('Error fetching consent records:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /terms/active Get Active Terms and Conditions
 * @description Retrieves the latest active version of the terms and conditions.
 * 
 * @success {200} Active terms and conditions retrieved successfully.
 * @example Success Response:
 * {
 *   "version_id": 3,
 *   "content": "These are the current active terms and conditions.",
 *   "created_at": "2024-01-01T10:00:00.000Z"
 * }
 * 
 * @error {404} No active terms found.
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Active-Terms-and-Conditions-17a7ea735ace81ac8131c9ec6cc72164?pvs=4
 */
app.get('/terms/active', async (req, res) => {
    try {
        const query = `
            SELECT version_id, content, created_at
            FROM terms_and_conditions
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const [result] = await executeQueryFromPoolAsync(conexionOrbet, query);

        if (!result) {
            return res.status(404).json({ message: 'No active terms found' });
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching active terms:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /terms/consents/version/:version_id Get Consent Records by Version
 * @description Retrieves all user consent records for a specific version of the terms and conditions.
 * 
 * @param {number} version_id - The ID of the version to retrieve consent records for. (required)
 * 
 * @success {200} Consent records retrieved successfully.
 * @example Success Response:
 * {
 *   "consents": [
 *     {
 *       "user_id": 1,
 *       "consent_status": "accepted",
 *       "consented_at": "2024-01-01T10:00:00.000Z"
 *     },
 *     {
 *       "user_id": 2,
 *       "consent_status": "declined",
 *       "consented_at": "2024-01-02T11:30:00.000Z"
 *     }
 *   ]
 * }
 * 
 * @error {400} version_id is required.
 * @error {404} No consent records found for this version.
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Consent-Records-by-Version-17a7ea735ace81c9a08bd3ea16e78efd?pvs=4
 */
app.get('/terms/consents/version/:version_id', async (req, res) => {
    const { version_id } = req.params;

    try {
        // Validar que se envió el version_id
        if (!version_id) {
            return res.status(400).json({ message: 'version_id is required' });
        }

        // Consultar los consentimientos de la versión
        const query = `
            SELECT user_id, consent_status, consented_at
            FROM user_consent_records
            WHERE version_id = ?
            ORDER BY consented_at DESC
        `;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query, [version_id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No consent records found for this version' });
        }

        res.status(200).json({ consents: results });
    } catch (error) {
        console.error('Error fetching consent records:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

async function testConsent(req, res) {
    const userId = req.params.userid;

    const userAccept = await UserAcceptTerms(userId);
    res.send(userAccept ? "User was accept terms" : "User have not access before accept terms");
}

async function checkConsent(req, res) {
    const userId = req.params.userid;

    const userAccept = await UserAcceptTerms(userId);
    res.json({ status: userAccept });
}

async function UserAcceptTerms(userid) {

    const queryGet = "SELECT * FROM terms_and_conditions ORDER BY version_id DESC LIMIT 1 ";
    const [resultTerm] = await executeQueryFromPoolAsync(conexionOrbet, queryGet);

    if (resultTerm.length == 0) {
        return false;
    }

    const currentVersion = resultTerm[0].version_id; //debe ser obtenido desde la DB
    const query = "SELECT 1 FROM user_consent_records WHERE version_id = ? AND user_id = ?";

    const [userConsent] = await executeQueryFromPoolAsync(conexionOrbet, query, [currentVersion, userid]);
    if (userConsent.length == 0) {
        return false;
    }

    //si esta aqui es porque si acepto esta version de terminos y contrato
    return true;
}

//#endregion

//#region ChangePassword

/**
 * @api {put} /user/change-password User Change Password
 * @description Allows users to change their password after verifying the current one.
 * @body {number} user_id - User ID (required)
 * @body {string} current_password - Current password.
 * @body {string} new_password - New password.
 * @success {200} { message: "Password updated successfully" }
 * @error {400} Missing fields or invalid new password.
 * @error {401} Incorrect current password.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/User-Change-Password-17a7ea735ace81dcac38d86af459c99e?pvs=4
 */
app.put('/user/change-password', async (req, res) => {
    const { user_id, current_password, new_password } = req.body;

    // Validar datos de entrada
    if (!user_id || !current_password || !new_password) {
        return res.status(400).json({ message: 'Faltan datos requeridos: user_id, current_password, new_password' });
    }

    try {
        // Recuperar la contraseña actual del usuario desde la base de datos
        const query = `SELECT password_hash FROM users WHERE user_id = ?`;
        const [result] = await executeQueryFromPoolAsync(conexionOrbet, query, [user_id]);

        if (!result) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const hashedPassword = result.password_hash;

        // Validar la contraseña actual
        const isPasswordValid = await verifyPassword(current_password, hashedPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
        }

        // Verificar si la nueva contraseña es igual a la actual
        const isSamePassword = await verifyPassword(new_password, hashedPassword);
        if (isSamePassword) {
            return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la actual' });
        }

        // Generar el hash de la nueva contraseña
        const newHashedPassword = await hashPassword(new_password);

        // Actualizar la contraseña en la base de datos
        const updateQuery = `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
        await executeQueryFromPoolAsync(conexionOrbet, updateQuery, [newHashedPassword, user_id]);

        res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error al cambiar la contraseña:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

//#endregion

//#region BackendPreferences

/**
 * @api {put} /backend_preferences Update Backend Preferences
 * @description Updates or inserts backend preferences. If a preference already exists, it will be updated.
 * 
 * @body {Array} preferences - Array of preference objects to be updated or inserted. (required)
 * @body {string} preferences[].preference_key - The key of the preference.
 * @body {string} preferences[].preference_value - The value of the preference.
 * 
 * @success {200} Preferences saved successfully.
 * @example Success Response:
 * {
 *   "message": "Preferencias guardadas correctamente"
 * }
 * 
 * @error {400} Missing or invalid preferences data.
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Backend-Preferences-17a7ea735ace81d3aef7fc7dc437a119?pvs=4
 */
app.put('/backend_preferences', async (req, res) => {
    const { preferences } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!Array.isArray(preferences) || preferences.length === 0) {
        return res.status(400).json({ message: 'Faltan datos requeridos: una lista de preferencias válida' });
    }

    try {
        // Construir la consulta SQL para múltiples inserciones o actualizaciones
        const query = `
            INSERT INTO backend_preferences (preference_key, preference_value, created_at, updated_at)
            VALUES ${preferences.map(() => '(?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').join(', ')}
            ON DUPLICATE KEY UPDATE preference_value = VALUES(preference_value), updated_at = CURRENT_TIMESTAMP
        `;

        // Mapear los valores para la consulta
        const values = preferences.flatMap(pref => [pref.preference_key, pref.preference_value]);

        // Ejecutar la consulta
        await executeQueryFromPoolAsync(conexionOrbet, query, values);

        return res.status(200).json({ message: 'Preferencias guardadas correctamente' });
    } catch (error) {
        console.error('Error al guardar las preferencias:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/**
 * @api {get} /backend_preferences Get Backend Preferences
 * @description Retrieves all backend preferences stored in the system.
 * 
 * @success {200} Preferences retrieved successfully.
 * @example Success Response:
 * {
 *   "preferences": [
 *     {
 *       "preference_key": "theme",
 *       "preference_value": "dark",
 *       "created_at": "2024-01-01T10:00:00.000Z",
 *       "updated_at": "2024-01-02T12:00:00.000Z"
 *     },
 *     {
 *       "preference_key": "notifications",
 *       "preference_value": "enabled",
 *       "created_at": "2024-01-01T10:00:00.000Z",
 *       "updated_at": "2024-01-02T12:00:00.000Z"
 *     }
 *   ]
 * }
 * 
 * @error {500} Internal server error.
 * 
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Backend-Preferences-17a7ea735ace81d88ca2e3ab7c87ceec?pvs=4
 */
app.get('/backend_preferences', async (req, res) => {

    try {
        const query = `
            SELECT preference_key, preference_value, created_at, updated_at
            FROM backend_preferences
        `;

        const results = await executeQueryFromPoolAsync(conexionOrbet, query, []);

        return res.status(200).json({ preferences: results });
    } catch (error) {
        console.error('Error al obtener las preferencias:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
});

//#endregion

//#region Admins

/**
 * @api {get} /admins Get All Admins
 * @description Retrieves a list of all admin users in the system.
 *
 * @success {200} List of admins.
 * @example Success Response:
 * {
 *   "admins": [
 *     {
 *       "admin_id": 1,
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "role_id": 2,
 *       "two_factor_enabled": true,
 *       "current_sign_in_at": "2024-01-01T10:00:00.000Z",
 *       "sign_in_count": 5,
 *       "disabled": false,
 *       "created_at": "2024-01-01T09:00:00.000Z",
 *       "updated_at": "2024-01-02T12:00:00.000Z"
 *     }
 *   ]
 * }
 *
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-All-Admins-17a7ea735ace8198b8c1d526b6d69034?pvs=4
 */
app.get('/admins', async (req, res) => {
    try {
        const query = `
            SELECT admin_id, name, email, role_id, two_factor_enabled, current_sign_in_at, sign_in_count, disabled,created_at, updated_at 
            FROM admins
        `;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query);
        res.status(200).json({ admins: results });
    } catch (error) {
        console.error('Error al listar administradores:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/**
 * @api {get} /admins/:admin_id Get Admin by ID
 * @description Retrieves a specific admin's details by their ID.
 *
 * @param {Number} admin_id - Admin ID (required)
 *
 * @success {200} Admin details.
 * @example Success Response:
 * {
 *   "admin": {
 *     "admin_id": 1,
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role_id": 2,
 *     "two_factor_enabled": true
 *   }
 * }
 *
 * @error {400} Admin ID is required.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Admin-by-ID-17a7ea735ace815589b4fe57296a2f39?pvs=4
 */
app.get('/admins/:admin_id', async (req, res) => {
    try {
        const { admin_id } = req.params;
        const query = `
           SELECT admin_id, name, email, role_id, two_factor_enabled, current_sign_in_at, sign_in_count, disabled,created_at, updated_at 
            FROM admins WHERE admin_id = ?
        `;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query, [admin_id]);
        res.status(200).json({ admin: results[0] });
    } catch (error) {
        console.error('Error al listar administradores:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/**
 * @api {post} /admins Create New Admin
 * @description Creates a new admin user.
 *
 * @body {string} name - Admin's name (required)
 * @body {string} email - Admin's email (required)
 * @body {string} password - Admin's password (required)
 * @body {number} role - Role ID (required)
 * @body {boolean} two_factor_enabled - Enable two-factor authentication (optional)
 *
 * @success {201} Admin created successfully.
 * @example Success Response:
 * {
 *   "message": "Admin added successfully"
 * }
 *
 * @error {400} Missing required fields.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Create-New-Admin-17a7ea735ace81a4b5b2ddc47b095890?pvs=4
 */
app.post('/admins', async (req, res) => {
    const { name, email, password, role, two_factor_enabled } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Missing required data' });
    }

    try {
        const hashedPassword = await hashPassword(password); // Hash de la contraseña
        const query = `
            INSERT INTO admins (name, email, password_hash, role_id, two_factor_enabled, created_at) 
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        await executeQueryFromPoolAsync(conexionOrbet, query, [
            name, email, hashedPassword, role, two_factor_enabled || false
        ]);

        res.status(201).json({ message: 'Admin added successfully' });
    } catch (error) {
        console.error('Error adding administrator:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @api {put} /admins/:admin_id Update Admin
 * @description Updates an existing admin's details.
 *
 * @param {Number} admin_id - Admin ID (required)
 * @body {string} name - Admin's updated name.
 * @body {string} email - Admin's updated email.
 * @body {number} role - Updated role ID.
 * @body {boolean} two_factor_enabled - Enable/disable 2FA.
 *
 * @success {200} Admin updated successfully.
 * @example Success Response:
 * {
 *   "message": "Administrator updated successfully"
 * }
 *
 * @error {400} Admin ID is required.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Admin-17a7ea735ace818aae03f359d0bf42c0?pvs=4
 */
app.put('/admins/:admin_id', async (req, res) => {
    const { admin_id } = req.params;
    const { name, email, role, two_factor_enabled } = req.body;

    if (!admin_id) {
        return res.status(400).json({ message: 'admin_id is required' });
    }

    try {
        const query = `
            UPDATE admins 
            SET name = ?, email = ?, role_id = ?, two_factor_enabled = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE admin_id = ?
        `;
        await executeQueryFromPoolAsync(conexionOrbet, query, [
            name, email, role, two_factor_enabled, admin_id
        ]);

        res.status(200).json({ message: 'Administrator updated successfully' });
    } catch (error) {
        console.error('Administrator update failed:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @api {delete} /admins/:admin_id Delete Admin
 * @description Deletes an admin by their ID.
 *
 * @param {Number} admin_id - Admin ID (required)
 *
 * @success {200} Admin deleted successfully.
 * @example Success Response:
 * {
 *   "message": "Admin Removed Successfully"
 * }
 *
 * @error {400} Admin ID is required.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Delete-Admin-17a7ea735ace814e9879def031594042?pvs=4
 */
app.delete('/admins/:admin_id', async (req, res) => {
    const { admin_id } = req.params;

    if (!admin_id) {
        return res.status(400).json({ message: 'admin_id is required' });
    }

    try {
        const query = `DELETE FROM admins WHERE admin_id = ?`;
        await executeQueryFromPoolAsync(conexionOrbet, query, [admin_id]);

        res.status(200).json({ message: 'Admin Removed Successfully' });
    } catch (error) {
        console.error('Error Deleting Administrator:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @api {get} /admins/search/:email Search Admin by Email
 * @description Searches for an admin by their email address.
 *
 * @param {String} email - Admin's email (required)
 *
 * @success {200} Admin found.
 * @example Success Response:
 * {
 *   "admin": {
 *     "admin_id": 1,
 *     "name": "John Doe",
 *     "email": "john@example.com"
 *   }
 * }
 *
 * @error {400} Email is required.
 * @error {404} Admin not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Search-Admin-by-Email-17a7ea735ace81688873cb276112d7d6?pvs=4
 */
app.get('/admins/search/:email', async (req, res) => {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ message: 'Email es requerido para la búsqueda' });
    }

    try {
        const query = `
            SELECT *
            FROM admins 
            WHERE email = ?
        `;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query, [email]);
        console.log(results);
        if (results.length > 0) {
            res.status(200).json({ admin: results });
        } else {
            res.status(404).json({ message: 'Administrador no encontrado' });
        }
    } catch (error) {
        console.error('Error al buscar administrador:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/**
 * @api {get} /roles Get All Admin Roles
 * @description Retrieves all admin roles from the system.
 *
 * @success {200} List of admin roles.
 * @example Success Response:
 * {
 *   "roles": [
 *     {
 *       "role_id": 1,
 *       "role_name": "Super Admin",
 *       "permissions": ["manage_users", "view_reports"]
 *     }
 *   ]
 * }
 *
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-All-Admin-Roles-17a7ea735ace8158a4dae8011f2d11f2?pvs=4
 */
app.get('/roles', async (req, res) => {
    try {
        const query = `SELECT * FROM admin_roles`;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query);
        res.status(200).json({ roles: results });
    } catch (error) {
        console.error('Error al listar roles:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/**
 * @api {post} /roles Create New Admin Role
 * @description Creates a new role with specific permissions for admins.
 *
 * @body {string} role - Role name (required)
 * @body {array} permissions - List of permissions for the role (required)
 *
 * @success {201} Role created successfully.
 * @example Success Response:
 * {
 *   "message": "Rol creado correctamente"
 * }
 *
 * @error {400} Missing required fields.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Create-New-Admin-Role-17a7ea735ace8115b09bcc8a38b1a859?pvs=4
 */
app.post('/roles', encryptMiddleware, async (req, res) => {
    const { role, permissions } = req.body;

    if (!role || !permissions) {
        return res.status(400).json({ message: 'Faltan datos requeridos' });
    }

    try {
        const query = `INSERT INTO admin_roles (role_name, permissions) VALUES (?, ?)`;
        await executeQueryFromPoolAsync(conexionOrbet, query, [role, permissions]);

        res.status(201).json({ message: 'Rol creado correctamente' });
    } catch (error) {
        console.error('Error al crear rol:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

//#endregion

//#region API OAuth

/**
 * @api {post} /oauth-services Create OAuth Service
 * @description Registers a new OAuth service for third-party authentication integration.
 *
 * @body {string} name - The name of the OAuth service (required).
 * @body {string} client_id - The client ID provided by the OAuth provider (required).
 * @body {string} client_secret - The client secret provided by the OAuth provider (required).
 * @body {string} redirect_uri - The URI to redirect after authentication (required).
 *
 * @success {201} OAuth service created successfully.
 * @example Success Response:
 * {
 *   "message": "Servicio OAuth creado correctamente"
 * }
 *
 * @error {400} Missing required fields.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Add-OAuth-Service-1777ea735ace813e99a8c70502c45b9f?pvs=4
 */
app.post('/oauth-serviceps', async (req, res) => {
    const { name, client_id, client_secret, redirect_uri } = req.body;

    if (!name || !client_id || !client_secret || !redirect_uri) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    try {
        const query = `
            INSERT INTO oauth_services (name, client_id, client_secret, redirect_uri)
            VALUES (?, ?, ?, ?)
        `;
        await executeQueryFromPoolAsync(conexionOrbet, query, [name, client_id, client_secret, redirect_uri]);

        res.status(201).json({ message: 'Servicio OAuth creado correctamente' });
    } catch (error) {
        console.error('Error al crear el servicio OAuth:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/**
 * @api {put} /oauth-services/:id Update OAuth Service
 * @description Updates the details of an existing OAuth service.
 *
 * @param {number} id - The ID of the OAuth service to update (required).
 * @body {string} name - Updated service name (required).
 * @body {string} client_id - Updated client ID (required).
 * @body {string} client_secret - Updated client secret (required).
 * @body {string} redirect_uri - Updated redirect URI (required).
 *
 * @success {200} OAuth service updated successfully.
 * @example Success Response:
 * {
 *   "message": "Servicio OAuth actualizado correctamente"
 * }
 *
 * @error {400} Missing required fields.
 * @error {404} OAuth service not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/OAuth-Edit-OAuth-Service-1777ea735ace811d9340cd025e6f1d10?pvs=4
 */
app.put('/oauth-services/:id', async (req, res) => {
    const { id } = req.params;
    const { name, client_id, client_secret, redirect_uri } = req.body;

    if (!name || !client_id || !client_secret || !redirect_uri) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    try {
        const query = `
            UPDATE oauth_services
            SET name = ?, client_id = ?, client_secret = ?, redirect_uri = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        const result = await executeQueryFromPoolAsync(conexionOrbet, query, [name, client_id, client_secret, redirect_uri, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Servicio OAuth no encontrado' });
        }

        res.status(200).json({ message: 'Servicio OAuth actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar el servicio OAuth:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/**
 * @api {get} /oauth-services Get All OAuth Services
 * @description Retrieves a list of all registered OAuth services.
 *
 * @success {200} List of OAuth services.
 * @example Success Response:
 * [
 *   {
 *     "id": 1,
 *     "name": "Google",
 *     "client_id": "google-client-id",
 *     "client_secret": "google-client-secret",
 *     "redirect_uri": "https://example.com/callback",
 *     "created_at": "2024-01-01T10:00:00.000Z",
 *     "updated_at": "2024-01-02T12:00:00.000Z"
 *   }
 * ]
 *
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/List-OAuth-Services-1777ea735ace81c38312df778a72b9e1?pvs=4
 */
app.get('/oauth-services', async (req, res) => {
    try {
        const query = `SELECT * FROM oauth_services`;
        const results = await executeQueryFromPoolAsync(conexionOrbet, query);

        res.status(200).json(results);
    } catch (error) {
        console.error('Error al listar los servicios OAuth:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/**
 * @api {delete} /oauth-services/:id Delete OAuth Service
 * @description Deletes an OAuth service by its ID.
 *
 * @param {number} id - The ID of the OAuth service to delete (required).
 *
 * @success {200} OAuth service deleted successfully.
 * @example Success Response:
 * {
 *   "message": "Servicio OAuth eliminado correctamente"
 * }
 *
 * @error {404} OAuth service not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/OAuth-Delete-OAuth-Service-1777ea735ace810a8d3cfd6a1b274aff?pvs=4
 */
app.delete('/oauth-services/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `DELETE FROM oauth_services WHERE id = ?`;
        const result = await executeQueryFromPoolAsync(conexionOrbet, query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Servicio OAuth no encontrado' });
        }

        res.status(200).json({ message: 'Servicio OAuth eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar el servicio OAuth:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

//#endregion

//#region API Promotions

/**
 * @api {post} /promotions Create or Update Promotion
 * @description Creates or updates a promotion with details like title, image, and status.
 * @body {string} title - Promotion title.
 * @body {string} description - Promotion description.
 * @body {string} image_url - URL to the promotion image.
 * @body {string} status - Promotion status (active/inactive).
 * @success {200} { message: "Promotion created/updated successfully" }
 * @error {400} Missing required fields.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Create-or-Update-Promotion-17a7ea735ace81f695f0f546d6a8c1cf?pvs=4
 */
app.post('/promotions', async (req, res) => {
    const { title, description, image_url, link_url, status } = req.body;

    if (!title || !image_url || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const query = `
        INSERT INTO promotions (title, description, image_url, link_url, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE 
            description = VALUES(description),
            image_url = VALUES(image_url),
            link_url = VALUES(link_url),
            status = VALUES(status),
            updated_at = CURRENT_TIMESTAMP;
    `;

    await executeQueryFromPoolAsync(conexionOrbet, query, [title, description, image_url, link_url, status]);
    res.status(200).json({ message: 'Promotion created/updated successfully' });
});

/**
 * @api {put} /promotions/:promotion_id/status Update Promotion Status
 * @description Updates the status of a promotion (active or inactive).
 *
 * @param {number} promotion_id - The ID of the promotion to update.
 * @body {string} status - New status of the promotion (required, values: "active" or "inactive").
 *
 * @success {200} Promotion status updated successfully.
 * @example Success Response:
 * {
 *   "message": "Promotion status updated successfully"
 * }
 *
 * @error {400} Missing or invalid status.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Promotion-Status-17a7ea735ace81f6a096ebddeb1a5137?pvs=4
 */
app.put('/promotions/:promotion_id/status', async (req, res) => {
    const { promotion_id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    try {
        const query = `UPDATE promotions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE promotion_id = ?`;
        await executeQueryFromPoolAsync(conexionOrbet, query, [status, promotion_id]);

        return res.status(200).json({ message: 'Promotion status updated successfully' });
    } catch (error) {
        console.error('Error updating promotion status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /promotions/:status Get Promotions by Status
 * @description Retrieves a list of promotions filtered by their status.
 *
 * @param {string} status - Promotion status to filter ("active", "inactive", "all").
 *
 * @success {200} List of promotions filtered by status.
 * @example Success Response:
 * {
 *   "promotions": [
 *     {
 *       "promotion_id": 1,
 *       "title": "New Year Promo",
 *       "description": "Celebrate with bonuses!",
 *       "image_url": "https://example.com/image.png",
 *       "link_url": "https://example.com",
 *       "status": "active"
 *     }
 *   ]
 * }
 *
 * @error {400} Invalid status.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Promotions-by-Status-17a7ea735ace81188d6fd904e31ae185?pvs=4
 */
app.get('/promotions/:status', async (req, res) => {
    const { status } = req.params;

    let query;
    let params = [];

    // Validar el parámetro de estado
    if (status === 'active' || status === 'inactive') {
        query = `
            SELECT promotion_id, title, description, image_url, link_url, status
            FROM promotions
            WHERE status = ?;
        `;
        params.push(status);
    } else if (status === 'all') {
        query = `
            SELECT promotion_id, title, description, image_url, link_url, status
            FROM promotions;
        `;
    } else {
        return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
        const [results] = await executeQueryFromPoolAsync(conexionOrbet, query, params);
        return res.status(200).json({ promotions: results });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {post} /promotions/:promotion_id/button Update Promotion Button Action
 * @description Updates the action button details for a promotion.
 *
 * @param {number} promotion_id - The ID of the promotion to update.
 * @body {string} button_text - Text displayed on the button (optional).
 * @body {string} button_action_url - URL the button will redirect to (required).
 * @body {string} button_status - Status of the button ("active" or "inactive").
 *
 * @success {200} Button action updated successfully.
 * @example Success Response:
 * {
 *   "message": "Button action updated successfully"
 * }
 *
 * @error {400} Invalid button_action_url or button_status.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Promotion-Button-Action-17a7ea735ace81b78a16c70ed6251847?pvs=4
 */
app.post('/promotions/:promotion_id/button', async (req, res) => {
    const { promotion_id } = req.params;
    const { button_text, button_action_url, button_status } = req.body;

    // Validación de datos
    if (!button_action_url || !['active', 'inactive'].includes(button_status)) {
        return res.status(400).json({ message: 'Invalid button_action_url or button_status' });
    }

    try {
        const query = `
            UPDATE promotions
            SET button_text = ?, button_action_url = ?, button_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE promotion_id = ?
        `;
        await executeQueryFromPoolAsync(conexionOrbet, query, [button_text, button_action_url, button_status, promotion_id]);

        return res.status(200).json({ message: 'Button action updated successfully' });
    } catch (error) {
        console.error('Error updating button action:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /promotions/:promotion_id/button Get Promotion Button Details
 * @description Retrieves the button details (text, action URL, and status) for a specific promotion.
 *
 * @param {number} promotion_id - The ID of the promotion (required).
 *
 * @success {200} Promotion button details retrieved successfully.
 * @example Success Response:
 * {
 *   "button": {
 *     "button_text": "Play Now",
 *     "button_action_url": "https://example.com/game",
 *     "button_status": "active"
 *   }
 * }
 *
 * @error {404} Promotion not found.
 * @example Error Response:
 * {
 *   "message": "Promotion not found"
 * }
 *
 * @error {500} Internal server error.
 * @example Error Response:
 * {
 *   "message": "Internal server error"
 * }
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Promotion-Button-Details-17a7ea735ace818f8dc1d0684eb1d2ba?pvs=4
 */
app.get('/promotions/:promotion_id/button', async (req, res) => {
    const { promotion_id } = req.params;
    try {
        const query = `
            SELECT button_text, button_action_url, button_status
            FROM promotions
            WHERE promotion_id = ? LIMIT 1;
        `;
        const [result] = await executeQueryFromPoolAsync(conexionOrbet, query, [promotion_id]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        return res.status(200).json({ button: result });
    } catch (error) {
        console.error('Error fetching button action:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {put} /promotions/:promotion_id/button Toggle Promotion Button Status
 * @description Toggles the button status between "active" and "inactive".
 *
 * @param {number} promotion_id - The ID of the promotion.
 *
 * @success {200} Button status updated successfully.
 * @example Success Response:
 * {
 *   "message": "Button status updated to 'inactive'",
 *   "new_status": "inactive"
 * }
 *
 * @error {404} Promotion not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Toggle-Promotion-Button-Status-17a7ea735ace81148fdcf12283f0c1cd?pvs=4
 */
app.put('/promotions/:promotion_id/button', async (req, res) => {
    const { promotion_id } = req.params;

    try {
        // Consultar el estado actual del botón
        const selectQuery = `
            SELECT button_status
            FROM promotions
            WHERE promotion_id = ? LIMIT 1;
        `;
        const [result] = await executeQueryFromPoolAsync(conexionOrbet, selectQuery, [promotion_id]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        const currentStatus = result.button_status;

        // Cambiar el estado: si es 'active' pasa a 'inactive' y viceversa
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

        const updateQuery = `
            UPDATE promotions
            SET button_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE promotion_id = ?
        `;
        await executeQueryFromPoolAsync(conexionOrbet, updateQuery, [newStatus, promotion_id]);

        return res.status(200).json({
            message: `Button status updated to '${newStatus}'`,
            new_status: newStatus
        });
    } catch (error) {
        console.error('Error updating button status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {post} /promotions/:promotion_id/feature-game Link Featured Game to Promotion
 * @description Links a game to a promotion as the featured game.
 *
 * @param {number} promotion_id - The ID of the promotion.
 * @body {number} featured_game_id - The ID of the game to feature (required).
 *
 * @success {200} Featured game linked successfully.
 * @example Success Response:
 * {
 *   "message": "Featured game linked successfully"
 * }
 *
 * @error {400} Missing featured_game_id.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Link-Featured-Game-to-Promotion-17a7ea735ace81e8aaa4ed5a62c66225?pvs=4
 */
app.post('/promotions/:promotion_id/feature-game', async (req, res) => {
    const { promotion_id } = req.params;
    const { featured_game_id } = req.body;

    if (!featured_game_id) {
        return res.status(400).json({ message: 'featured_game_id is required' });
    }

    try {
        const query = `
            UPDATE promotions
            SET featured_game_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE promotion_id = ?
        `;
        await executeQueryFromPoolAsync(conexionOrbet, query, [featured_game_id, promotion_id]);

        return res.status(200).json({ message: 'Featured game linked successfully' });
    } catch (error) {
        console.error('Error linking featured game:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /promotions/:promotion_id/feature-game Get Featured Game for Promotion
 * @description Retrieves the featured game linked to a promotion.
 *
 * @param {number} promotion_id - The ID of the promotion.
 *
 * @success {200} Featured game retrieved successfully.
 * @example Success Response:
 * {
 *   "featured_game": {
 *     "game_id": 5,
 *     "game_name": "Mega Slots",
 *     "image_url": "https://example.com/slot.png",
 *     "description": "Enjoy endless spins!"
 *   }
 * }
 *
 * @error {404} No featured game linked to this promotion.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Featured-Game-for-Promotion-17a7ea735ace8147b022dca08789c8f0?pvs=4
 */
app.get('/promotions/:promotion_id/feature-game', async (req, res) => {
    const { promotion_id } = req.params;

    try {
        const query = `
            SELECT g.game_id, g.game_name, g.image_url, g.description
            FROM promotions p
            JOIN games g ON p.featured_game_id = g.game_id
            WHERE p.promotion_id = ?
        `;
        const [result] = await executeQueryFromPoolAsync(conexionOrbet, query, [promotion_id]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'No featured game linked to this promotion' });
        }

        return res.status(200).json({ featured_game: result });
    } catch (error) {
        console.error('Error fetching featured game:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {delete} /promotions/:promotion_id/feature-game Unlink Featured Game
 * @description Removes the linked featured game from a promotion.
 *
 * @param {number} promotion_id - The ID of the promotion.
 *
 * @success {200} Featured game unlinked successfully.
 * @example Success Response:
 * {
 *   "message": "Featured game unlinked successfully"
 * }
 *
 * @error {404} Promotion not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Unlink-Featured-Game-17a7ea735ace817ca7b0da4f8ee0feb5?pvs=4
 */
app.delete('/promotions/:promotion_id/feature-game', async (req, res) => {
    const { promotion_id } = req.params;

    try {
        const query = `
            UPDATE promotions
            SET featured_game_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE promotion_id = ?
        `;
        await executeQueryFromPoolAsync(conexionOrbet, query, [promotion_id]);

        return res.status(200).json({ message: 'Featured game unlinked successfully' });
    } catch (error) {
        console.error('Error unlinking featured game:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region SocketAPI -> RestAPI

/**
 * @api {get} api/users Get Users with Balances
 * @description Retrieves a list of users with their balances.
 * @success {200} { users: [...], status: true } - Successfully retrieved user list.
 * @error {500} { users: null, status: false } - Server error while fetching users.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Users-with-Balances-17b7ea735ace81b2977bc1c513949377?pvs=4
 */
app.get('/api/users', async (req, res) => {
    try {
        // Call the function to get users with their balances
        const users = await getUsersWithBalances();

        console.log('Users:', users);

        // Send the users as a JSON response
        res.status(200).json({
            users: users || null,
            status: true
        });
    } catch (err) {
        console.error('Error fetching users:', err);

        // Send an error response
        res.status(500).json({
            users: null,
            status: false
        });
    }
});

/**
 * @api {get} api/user/:id Get User by ID
 * @description Retrieves user information by user ID.
 * @param {number} id - User ID (required)
 * @success {200} { user: {...}, status: true }
 * @error {400} Missing user ID.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-User-by-ID-17b7ea735ace8154bdb9df6998f1e6cc?pvs=4
 */
app.get('/api/user/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ user: null, status: false, message: 'User ID is required' });
    }

    try {
        const user = await getUserDataById(id);
        res.status(200).json({ user, status: true });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ user: null, status: false });
    }
});

/**
 * @api {get} api/tags-groups Get Tags and Groups
 * @description Retrieves all tags and groups.
 * @success {200} { tags: [...], groups: [...], status: true }
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Tags-and-Groups-17b7ea735ace816cb8d8d8fa115fb1d7?pvs=4
 */
app.get('/api/tags-groups', async (req, res) => {
    try {
        const tagsNgroups = await getAllTagsAndGroups();
        res.status(200).json({
            status: true,
            tags: tagsNgroups.tags,
            groups: tagsNgroups.groups
        });
    } catch (err) {
        console.error('Error fetching tags and groups:', err);
        res.status(500).json({ status: false, tags: null, groups: null });
    }
});

/**
 * @api {put} api/user/:id/tags Set User Tags
 * @description Updates user tags by replacing existing ones.
 * @param {number} id - User ID (required)
 * @body {array} tags - Array of tag IDs.
 * @success {200} { status: true }
 * @error {400} Invalid data.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Set-User-Tags-17b7ea735ace817a8351dff9abf08f03?pvs=4
 */
app.put('/api/user/:id/tags', async (req, res) => {
    const { id } = req.params;
    const { tags } = req.body;

    if (!id || !Array.isArray(tags)) {
        return res.status(400).json({ status: false, message: 'Invalid user ID or tags' });
    }

    try {
        await executeQueryFromPoolAsync(conexionOrbet, `DELETE FROM user_tags WHERE user_id = ?`, [id]);

        if (tags.length > 0) {
            const insertQuery = `
                INSERT INTO user_tags (user_id, tag_id)
                VALUES ${tags.map(() => '(?, ?)').join(', ')}
            `;
            const queryParams = tags.flatMap(tag_id => [id, tag_id]);
            await executeQueryFromPoolAsync(conexionOrbet, insertQuery, queryParams);
        }

        res.status(200).json({ status: true });
    } catch (error) {
        console.error('Error updating user tags:', error);
        res.status(500).json({ status: false });
    }
});

/**
 * @api {put} api/user/:id/groups Set User Groups
 * @description Updates user groups by replacing existing ones.
 * @param {number} id - User ID (required)
 * @body {array} groups - Array of group IDs.
 * @success {200} { status: true }
 * @error {400} Invalid data.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Set-User-Groups-17b7ea735ace8151addef87e9658726a?pvs=4
 */
app.put('/api/user/:id/groups', async (req, res) => {
    const { id } = req.params;
    const { groups } = req.body;

    if (!id || !Array.isArray(groups)) {
        return res.status(400).json({ status: false, message: 'Invalid user ID or groups' });
    }

    try {
        await executeQueryFromPoolAsync(conexionOrbet, `DELETE FROM user_groups WHERE user_id = ?`, [id]);

        if (groups.length > 0) {
            const insertQuery = `
                INSERT INTO user_groups (user_id, group_id)
                VALUES ${groups.map(() => '(?, ?)').join(', ')}
            `;
            const queryParams = groups.flatMap(group_id => [id, group_id]);
            await executeQueryFromPoolAsync(conexionOrbet, insertQuery, queryParams);
        }

        res.status(200).json({ status: true });
    } catch (error) {
        console.error('Error updating user groups:', error);
        res.status(500).json({ status: false });
    }
});

/**
 * @api {post} api/user/:id/comment Add Comment
 * @description Adds a comment for a user by an admin.
 * @param {number} id - User ID (required)
 * @body {number} admin_id - Admin ID.
 * @body {string} comment_text - Comment text.
 * @success {201} { status: true, message: 'Comment saved successfully' }
 * @error {400} Missing data.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Add-Comment-17b7ea735ace81f0b9b6d357ab3aa9fa?pvs=4
 */
app.post('/api/user/:id/comment', async (req, res) => {
    const { id } = req.params;
    const { admin_id, comment_text } = req.body;

    try {
        const adminQuery = `SELECT email FROM admins WHERE admin_id = ?`;
        const results = await executeQueryFromPoolAsync(conexionOrbet, adminQuery, [admin_id]);

        if (results.length === 0) {
            return res.status(404).json({ status: false, message: 'Admin not found' });
        }

        const insertQuery = `
            INSERT INTO user_comments (user_id, admin_email, comment_text, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `;
        await executeQueryFromPoolAsync(conexionOrbet, insertQuery, [id, results[0].email, comment_text]);

        res.status(201).json({ status: true, message: 'Comment saved successfully' });
    } catch (err) {
        console.error('Error saving comment:', err);
        res.status(500).json({ status: false, message: 'Error saving comment' });
    }
});

/**
 * @api {put} api/user/:id/status Change User Status
 * @description Updates the user's account status.
 * @param {number} id - User ID (required)
 * @body {string} status - New status (active/inactive).
 * @success {200} { status: true, userStatus: 'active' }
 * @error {400} Missing data.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Change-User-Status-17b7ea735ace81eabe89e7fb0adc6570?pvs=4
 */
app.put('/api/user/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const query = `UPDATE users SET status = ? WHERE user_id = ?`;
        await executeQueryFromPoolAsync(conexionOrbet, query, [status, id]);

        res.status(200).json({ status: true, userStatus: status });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ status: false });
    }
});

/**
 * @api {post} api/user/:id/suspicious Mark User as Suspicious
 * @description Flags a user as suspicious.
 * @param {number} id - User ID (required)
 * @body {string} failed_check_comment - Reason for suspicion.
 * @success {201} { status: true, message: 'Suspicion correctly registered' }
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Mark-User-as-Suspicious-17b7ea735ace817aa209cba0ff4837e1?pvs=4
 */
app.post('/api/user/:id/suspicious', async (req, res) => {
    const { id } = req.params;
    const { failed_check_comment } = req.body;

    try {
        const query = `
            INSERT INTO user_suspicions (user_id, created_at, updated_at, failed_check_comment)
            VALUES (?, NOW(), NOW(), ?);
        `;
        await executeQueryFromPoolAsync(conexionOrbet, query, [id, failed_check_comment]);

        res.status(201).json({ status: true, message: 'Suspicion correctly registered' });
    } catch (error) {
        console.error('Error registering suspicion:', error);
        res.status(500).json({ status: false });
    }
});

/**
 * @api {post} api/balance/change Change User Balance
 * @description Handles balance changes for balance, transaction, or gift types.
 * @body {string} type - Type of balance change ("balance", "transaction", "gift").
 * @body {object} data - Data related to the balance change.
 * @success {200} { status: true, message: "Balance updated successfully" }
 * @error {400} Invalid type provided.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Change-User-Balance-17b7ea735ace8141ae43c9703ed80396?pvs=4
 */
app.post('/api/balance/change', async (req, res) => {
    const { type, data } = req.body;

    try {
        let result;

        switch (type) {
            case 'balance':
                result = await handleBalanceChangeBalance(data);
                break;
            case 'transaction':
                result = await handleTransactionChangeBalance(data);
                break;
            case 'gift':
                result = await handleGiftChangeBalance(data);
                break;
            default:
                return res.status(400).json({ status: false, message: 'Invalid type' });
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

/**
 * @api {post} api/user/login User Login
 * @description Authenticates a user and returns a JWT token.
 * @body {string} email - User's email.
 * @body {string} pass - User's password.
 * @success {200} { message: "Login successful", token: "JWT_TOKEN" }
 * @error {401} Incorrect password.
 * @error {404} User not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/User-Login-17b7ea735ace814e826bd72f7660b025?pvs=4
 */
app.post('/api/user/login', async (req, res) => {
    const { email, pass } = req.body;

    try {
        const results = await executeQueryFromPoolAsync(conexionOrbet, 'SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = results[0];

        if (user.provider > 1) {
            return res.status(403).json({ message: 'Account is by third party provider' });
        }

        const hashedPassword = await verifyPassword(pass, user.password_hash);

        if (hashedPassword) {
            const token = jwt.sign({ id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Reactivar si el usuario está inactivo
            if (user.status === 'inactive') {
                await reactivateUser(user.user_id, 'login');
            }

            return res.status(200).json({ message: 'Login successful', token });
        } else {
            return res.status(401).json({ message: 'Incorrect password' });
        }

    } catch (err) {
        console.error('Error logging in user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @api {post} api/user/register User Registration
 * @description Registers a new user and returns a JWT token.
 * @body {string} email - User's email.
 * @body {string} username - Username.
 * @body {string} inputName - User's full name.
 * @body {string} pass - Password.
 * @success {201} { message: "User registered successfully", token: "JWT_TOKEN" }
 * @error {409} Email or username already exists.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/User-Registration-17b7ea735ace812fb61cff21c7a05006?pvs=4
 */
app.post('/api/user/register', async (req, res) => {
    const { email, username, inputName, pass } = req.body;

    try {
        const [existingUsers] = await executeQueryFromPoolAsync(conexionOrbet, 'SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Email or username is already in use' });
        }

        const hashedPassword = await hashPassword(pass);

        const [result] = await executeQueryFromPoolAsync(conexionOrbet,
            'INSERT INTO users (email, name, username, password_hash) VALUES (?, ?, ?, ?)',
            [email, inputName, username, hashedPassword]
        );

        const token = jwt.sign({ id: result.insertId, email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: 'User registered successfully', token });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @api {post} api/user/duplications Set User Duplications
 * @description Creates or updates a duplication record for a user.
 * @body {number} userId - User ID.
 * @body {string} reasonUuid - Reason UUID for duplication (optional).
 * @body {number} otherUserId - ID of the duplicated user (optional).
 * @success {200} { success: true, message: "Duplication saved successfully" }
 * @error {400} Missing reasonUuid or otherUserId.
 * @error {404} Invalid reasonUuid.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Set-User-Duplications-17b7ea735ace81e690cedabb4a7bcaf5?pvs=4
 */
app.post('/api/user/duplications', async (req, res) => {
    const { userId, otherUserId, reasonUuid } = req.body;

    if (!reasonUuid && !otherUserId) {
        return res.status(400).json({ success: false, message: 'Missing reasonUuid or otherUserId' });
    }

    try {
        const checkQuery = `SELECT COUNT(*) AS count FROM duplicity_reasons WHERE reason_uuid = ?`;
        const reasonCount = await executeQueryFromPoolAsync(conexionOrbet, checkQuery, [reasonUuid]);

        if (reasonUuid && reasonCount[0].count === 0) {
            return res.status(404).json({ success: false, message: 'Invalid reasonUuid' });
        }

        const insertQuery = `
            INSERT INTO user_duplications (user_id, reason_uuid, duplicated_user_id, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
        `;
        await executeQueryFromPoolAsync(conexionOrbet, insertQuery, [userId, reasonUuid || null, otherUserId || null]);

        res.status(200).json({ success: true, message: 'Duplication saved successfully' });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @api {post} api/user/affiliate Assign Affiliate URL
 * @description Assigns an affiliate URL to a user.
 * @body {number} userId - User ID.
 * @body {string} affiliateUrl - Affiliate URL to assign.
 * @success {201} { success: true, message: "Affiliate assigned successfully" }
 * @error {400} Missing userId or affiliateUrl.
 * @error {409} Affiliate URL already assigned.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Assign-Affiliate-URL-17b7ea735ace814a84d8d39ea4a16544?pvs=4
 */
app.post('/api/user/affiliate', async (req, res) => {
    const { userId, affiliateUrl } = req.body;

    if (!userId || !affiliateUrl) {
        return res.status(400).json({ success: false, message: 'Missing userId or affiliateUrl' });
    }

    try {
        const checkQuery = `
            SELECT assignment_id FROM user_stag_assignment
            WHERE user_id = ? AND affiliate_url = ?
        `;
        const existingRecord = await executeQueryFromPoolAsync(conexionOrbet, checkQuery, [userId, affiliateUrl]);

        if (existingRecord.length > 0) {
            return res.status(409).json({ success: false, message: 'Affiliate URL already assigned' });
        }

        const insertQuery = `
            INSERT INTO user_stag_assignment (user_id, affiliate_url, assigned_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `;
        await executeQueryFromPoolAsync(conexionOrbet, insertQuery, [userId, affiliateUrl]);

        res.status(201).json({ success: true, message: 'Affiliate assigned successfully' });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

//#endregion

//#region User Session Tracking

/**
 * @api {get} /api/admin/sessions Get Active Sessions
 * @description Retrieves active user sessions with optional filtering by user_id, IP address, and date range.
 * @query {number} [user_id] - Filter by user ID.
 * @query {string} [ip_address] - Filter by IP address.
 * @query {string} [start_date] - Filter by start date (YYYY-MM-DD).
 * @query {string} [end_date] - Filter by end date (YYYY-MM-DD).
 * @success {200} Returns a list of active sessions with user info.
 * @error {400} Invalid query parameters.
 * @error {500} Internal server error.
 * @status Documented ❌
 * @notion [Add Notion link here]
 */
app.get('/api/admin/sessions', async (req, res) => {
    const { user_id, ip_address, start_date, end_date } = req.query;

    try {
        let query = `
            SELECT s.session_id, s.user_id, u.username, u.status, s.event_date, 
                   s.event_type, s.ip, s.country, s.address, 
                   ST_X(s.coordinates) AS lat, ST_Y(s.coordinates) AS lng, s.status
            FROM user_sessions s
            JOIN users u ON s.user_id = u.user_id
            WHERE 1 = 1
        `;

        const params = [];

        // Filtros dinámicos según los parámetros recibidos
        if (user_id) {
            query += ` AND s.user_id = ?`;
            params.push(user_id);
        }

        if (ip_address) {
            query += ` AND s.ip = ?`;
            params.push(ip_address);
        }

        if (start_date) {
            query += ` AND s.event_date >= ?`;
            params.push(start_date);
        }

        if (end_date) {
            query += ` AND s.event_date <= ?`;
            params.push(end_date);
        }

        // Consulta a la base de datos
        const [results] = await executeQueryFromPoolAsync(conexionOrbet, query, params);

        res.status(200).json({
            status: true,
            sessions: results
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({
            status: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @api {post} /api/admin/sessions/:session_id/terminate Terminate User Session
 * @description Immediately revokes a user session and triggers risk analysis.
 * @path {number} session_id - ID of the session to terminate.
 * @success {200} { message: "Session terminated successfully." }
 * @error {400} Invalid session ID or session already terminated.
 * @error {404} Session not found.
 * @error {500} Internal server error.
 * @status Documented ❌
 * @notion [Add Notion link here]
 */
app.post('/api/admin/sessions/:session_id/terminate', async (req, res) => {
    const { session_id } = req.params;

    try {
        // Validar si la sesión existe y está activa
        const [sessionResult] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT * FROM user_sessions 
            WHERE session_id = ? AND status = 'active'
        `, [session_id]);

        // Verificar si la sesión existe
        if (sessionResult.length === 0) {
            try {
                await archiveInactiveSessions();
            } catch (error) {
                console.error('Error archiving sessions:', error);
            }

            return res.status(404).json({ message: 'Session not found or already terminated.' });
        }

        const session = sessionResult[0];
        const userId = session.user_id;

        // Terminar la sesión actual
        await executeQueryFromPoolAsync(conexionOrbet, `
            UPDATE user_sessions 
            SET status = 'terminated', updated_at = CURRENT_TIMESTAMP 
            WHERE session_id = ?
        `, [session_id]);

        // Buscar otras sesiones activas del mismo usuario
        const [otherSessions] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT * FROM user_sessions 
            WHERE user_id = ? AND status = 'active' AND session_id != ?
        `, [userId, session_id]);

        let suspiciousActivities = [];

        // Validar que 'otherSessions' sea un arreglo
        if (Array.isArray(otherSessions) && otherSessions.length > 0) {
            for (const otherSession of otherSessions) {
                const distance = calculateDistance(session.coordinates, otherSession.coordinates);

                // Detectar actividad sospechosa si la distancia es mayor a 1000 km
                if (distance > 1000) {
                    await executeQueryFromPoolAsync(conexionOrbet, `
                        INSERT INTO risk_events (user_id, session_id, risk_type, description, detected_at)
                        VALUES (?, ?, ?, ?, NOW())
                    `, [
                        userId,
                        otherSession.session_id,
                        'Suspicious Activity',
                        `Concurrent session detected from distant location. Distance: ${distance.toFixed(2)} km`
                    ]);

                    suspiciousActivities.push({
                        session_id: otherSession.session_id,
                        ip: otherSession.ip,
                        country: otherSession.country,
                        distance_km: distance.toFixed(2),
                        description: 'Concurrent session from distant location'
                    });
                }
            }
        }
        try {
            await archiveInactiveSessions();
        } catch (error) {
            console.error('Error archiving sessions:', error);
        }
        return res.status(200).json({
            message: 'Session terminated successfully.',
            terminated_session: {
                session_id: session.session_id,
                user_id: session.user_id,
                ip: session.ip,
                country: session.country,
                terminated_at: new Date()
            },
            active_sessions_remaining: otherSessions.length,
            suspicious_activities_detected: suspiciousActivities.length,
            suspicious_sessions: suspiciousActivities
        });

    } catch (error) {
        console.error('Error terminating session:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

function calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return 0;

    // Validar si el dato es tipo objeto (POINT) o string
    const parseCoordinates = (coord) => {
        if (typeof coord === 'object' && coord.x && coord.y) {
            // Caso para tipo POINT (MySQL)
            return [coord.y, coord.x]; // POINT almacena (lon, lat)
        } else if (typeof coord === 'string') {
            // Caso para tipo VARCHAR
            return coord.split(',').map(Number);
        } else {
            throw new Error('Invalid coordinate format');
        }
    };

    try {
        const [lat1, lon1] = parseCoordinates(coord1);
        const [lat2, lon2] = parseCoordinates(coord2);

        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distancia en km
    } catch (error) {
        console.error('Error calculating distance:', error.message);
        return 0;
    }
}

/**
 * @api {get} /api/admin/sessions/history Get Historical Sessions
 * @description Retrieve archived user sessions with optional filters and pagination.
 * @query {number} [user_id] - Filter by user ID.
 * @query {string} [start_date] - Start date in YYYY-MM-DD format.
 * @query {string} [end_date] - End date in YYYY-MM-DD format.
 * @query {number} [page=1] - Page number for pagination.
 * @query {number} [limit=10] - Number of results per page.
 * @success {200} Returns paginated historical session data.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion [Insert Notion link here]
 */
app.get('/api/admin/sessions/history', async (req, res) => {
    const { user_id, start_date, end_date, page = 1, limit = 10 } = req.query;

    // Validar los parámetros
    const offset = (page - 1) * limit;
    let whereClauses = [];
    let queryParams = [];

    // Filtrar por user_id
    if (user_id) {
        whereClauses.push("user_id = ?");
        queryParams.push(user_id);
    }

    // Filtrar por rango de fechas
    if (start_date && end_date) {
        whereClauses.push("event_date BETWEEN ? AND ?");
        queryParams.push(start_date, end_date);
    }

    const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    try {
        // Consulta con paginación
        const [sessions] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT * 
            FROM archived_user_sessions 
            ${whereCondition}
            ORDER BY event_date DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Contar el total de registros (sin paginación)
        const [totalResult] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT COUNT(*) AS total 
            FROM archived_user_sessions 
            ${whereCondition}
        `, queryParams);

        const totalRecords = totalResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        res.status(200).json({
            status: true,
            current_page: parseInt(page),
            total_pages: totalPages,
            total_records: totalRecords,
            sessions: sessions
        });

    } catch (error) {
        console.error('Error fetching historical sessions:', error);
        res.status(500).json({ status: false, message: 'Internal server error.' });
    }
});

/**
 * Archiva las sesiones inactivas o terminadas a la tabla 'archived_user_sessions'
 */
async function archiveInactiveSessions() {
    try {
        // Seleccionar sesiones inactivas o terminadas con coordenadas formateadas como texto
        const [inactiveSessions] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT 
                session_id, user_id, event_date, event_type, ip, country, 
                address, ST_AsText(coordinates) AS coordinates, status, 
                created_at, updated_at, token
            FROM user_sessions
            WHERE status IN ('inactive', 'terminated')
        `);

        if (inactiveSessions.length === 0) {
            console.log('No inactive or terminated sessions to archive.');
            return;
        }

        // Insertar en la tabla de sesiones archivadas
        const insertQuery = `
            INSERT INTO archived_user_sessions (
                session_id, user_id, event_date, event_type, ip, country,
                address, coordinates, status, created_at, updated_at, token
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ST_GeomFromText(?), ?, ?, ?, ?)
        `;

        // Formatear los datos para inserción
        for (const session of inactiveSessions) {
            let coordinates = null;

            // Verificar si coordinates tiene datos
            if (session.coordinates) {
                // session.coordinates tiene el formato 'POINT(lat lon)', extraemos lat y lon
                const coords = session.coordinates.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);

                if (coords) {
                    const lat = coords[1];
                    const lon = coords[2];
                    coordinates = `POINT(${lat} ${lon})`;
                }
            }

            // Ejecutar la inserción
            await executeQueryFromPoolAsync(conexionOrbet, insertQuery, [
                session.session_id,
                session.user_id,
                session.event_date,
                session.event_type,
                session.ip,
                session.country,
                session.address,
                coordinates,  // Insertar el POINT correctamente
                session.status,
                session.created_at,
                session.updated_at,
                session.token
            ]);
        }

        // Eliminar las sesiones archivadas de la tabla original
        const sessionIds = inactiveSessions.map(session => session.session_id);
        await executeQueryFromPoolAsync(conexionOrbet, `
            DELETE FROM user_sessions
            WHERE session_id IN (?)
        `, [sessionIds]);

        console.log(`Archived ${inactiveSessions.length} sessions successfully.`);
    } catch (error) {
        console.error('Error archiving sessions:', error);
    }
}

//#endregion

//#region User sessions mgr

app.get('/api/sessions/active', async (req, res) => {
    try {
        const query = `
            SELECT id, userID, ip, created_at, last_activity, location, agent 
            FROM sessions_user 
            WHERE expired = 0
        `;
        const activeSessions = await executeQueryFromPoolAsync(conexionOrbet, query);

        return res.json({ status: true, sessions: activeSessions });
    } catch (error) {
        console.error('Error retrieving active sessions:', error);
        return res.status(500).json({ status: false, message: 'Internal server error' });
    }
});

app.get('/api/sessions/user/:token/', async (req, res) => {
    const token = req.params.token;

    const tokenData = decodedJwt(token, process.env.JWT_SECRET);
    if (!tokenData) {
        return res.status(403).json({ status: false, message: 'Forbidden access, session expired' });
    }

    const userID = tokenData.id;

    try {
        const query = `
            SELECT id, ip, created_at, last_activity, location, agent 
            FROM sessions_user 
            WHERE userID = ? AND expired = 0
        `;
        const userSessions = await executeQueryFromPoolAsync(conexionOrbet, query, [userID]);

        return res.json({ status: true, sessions: userSessions });
    } catch (error) {
        console.error('Error retrieving user sessions:', error);
        return res.status(500).json({ status: false, message: 'Internal server error' });
    }
});

app.delete('/api/sessions/revoke/:sessionId', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header

    const tokenData = decodedJwt(token, process.env.JWT_SECRET);
    if (!tokenData) {
        return res.status(403).json({ status: false, message: 'Forbidden access, session expired' });
    }

    const userID = tokenData.id;
    const sessionId = req.params.sessionId;

    try {
        // Check if the session belongs to the user
        const queryCheckSession = `
            SELECT id 
            FROM sessions_user 
            WHERE id = ? AND userID = ?
        `;
        const session = await executeQueryFromPoolAsync(conexionOrbet, queryCheckSession, [sessionId, userID]);

        if (session.length === 0) {
            return res.status(404).json({ status: false, message: 'Session not found or does not belong to you' });
        }

        // Mark the session as expired
        const queryExpireSession = `
            UPDATE sessions_user 
            SET expired = 1 
            WHERE id = ?
        `;
        await executeQueryFromPoolAsync(conexionOrbet, queryExpireSession, [sessionId]);

        return res.json({ status: true, message: 'Session revoked successfully' });
    } catch (error) {
        console.error('Error revoking session:', error);
        return res.status(500).json({ status: false, message: 'Internal server error' });
    }
});

async function saveUserSession(userID, token, req) {
    try {
        const userAgentInfo = useragent.parse(req.headers['user-agent']); // Obtener información del navegador
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress; // Obtener IP del cliente
        const agent = req.get('user-agent');// `${userAgentInfo.browser.name} ${userAgentInfo.browser.version} (${userAgentInfo.os.name})`;

        // Verificar si ya existe una sesión activa con los mismos parámetros
        const existingSessionQuery = `
            SELECT id FROM sessions_user 
            WHERE userID = ? AND ip = ? AND agent = ? AND expired = 0
        `;
        const existingSession = await executeQueryFromPoolAsync(conexionOrbet, existingSessionQuery, [userID, ip, agent]);

        if (existingSession.length > 0) {
            // Si existe una sesión activa, actualizar la última actividad
            const updateSessionQuery = `
                UPDATE sessions_user 
                SET last_activity = NOW() 
                WHERE id = ?
            `;
            await executeQueryFromPoolAsync(conexionOrbet, updateSessionQuery, [existingSession[0].id]);

            console.log("Updated existing session's last_activity.");
        } else {
            // Si no existe, crear una nueva sesión
            const location = "unknown"; // Puedes integrarlo con una API de geolocalización si lo deseas

            const insertSessionQuery = `
                INSERT INTO sessions_user (userID, token, ip, created_at, last_activity, expired, location, agent)
                VALUES (?, ?, ?, NOW(), NOW(), 0, ?, ?)
            `;
            await executeQueryFromPoolAsync(conexionOrbet, insertSessionQuery, [
                userID,
                token,
                ip,
                location,
                agent
            ]);

            console.log("New session created successfully.");
        }
    } catch (error) {
        console.error("Error saving session:", error);
    }
}


//#region 

//#region Affiliate Stats API

/**
 * @api {post} /api/affiliate/statistics Register or Update Affiliate Statistics
 * @description Adds or updates affiliate statistics.
 * @body {number} user_id - ID of the affiliate (required)
 * @body {number} campaign_id - ID of the campaign (required)
 * @body {number} referrals - Number of referrals (optional)
 * @body {decimal} wagered - Total amount wagered (optional)
 * @body {decimal} earnings - Total earnings (optional)
 * @success {200} { message: "Affiliate statistics updated successfully." }
 * @error {400} Missing required fields.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Register-or-Update-Affiliate-Statistics-1807ea735ace8132a559d2317137f1b3?pvs=4
 */
app.post('/api/affiliate/statistics', async (req, res) => {
    const { user_id, campaign_id, referrals = 0, wagered = 0, earnings = 0 } = req.body;

    if (!user_id || !campaign_id) {
        return res.status(400).json({ message: 'user_id and campaign_id are required.' });
    }

    try {
        const query = `
            INSERT INTO affiliate_statistics (user_id, campaign_id, total_referrals, total_wagered, total_earnings)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_referrals = total_referrals + ?,
                total_wagered = total_wagered + ?,
                total_earnings = total_earnings + ?,
                last_updated = CURRENT_TIMESTAMP
        `;

        await executeQueryFromPoolAsync(conexionOrbet, query, [
            user_id, campaign_id, referrals, wagered, earnings,
            referrals, wagered, earnings
        ]);

        res.status(200).json({ message: 'Affiliate statistics updated successfully.' });
    } catch (error) {
        console.error('Error updating affiliate statistics:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {get} /api/affiliate/statistics/:user_id Get Affiliate Statistics by User
 * @description Retrieves affiliate statistics (referrals, bets, earnings) for a specific user.
 * @param {string} user_id - ID by user.
 * @success {200} { statistics: [...] }
 * @error {404} No statistics found for this user.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Affiliate-Statistics-by-User-1807ea735ace81c1888fe362d0d666fc?pvs=4
 */
app.get('/api/affiliate/statistics/:user_id', verifyAuth({ useJWT: true, useApiKey: true, ReqRole: 'admin' }), async (req, res) => {
    const { user_id } = req.params;

    try {
        const [results] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT campaign_id, total_referrals, total_wagered, total_earnings, last_updated
            FROM affiliate_statistics
            WHERE user_id = ?
        `, [user_id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No statistics found for this user.' });
        }

        res.status(200).json({ statistics: results });
    } catch (error) {
        console.error('Error fetching affiliate statistics:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {get} /api/affiliate/statistics Get General Affiliate Statistics
 * @description Returns affiliate statistics with optional filters by campaign, referrals or earnings.
 * @query {number} campaign_id - Campaign ID (optional).
 * @query {number} min_referrals - Minimum referrals (optional).
 * @query {number} min_earnings - Minimum earnings (optional).
 * @success {200} { statistics: [...] }
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-General-Affiliate-Statistics-1807ea735ace81fbb465e3f11456473c?pvs=4
 */
app.get('/api/affiliate/statistics', async (req, res) => {
    const { campaign_id, min_referrals, min_earnings } = req.query;

    let query = `SELECT * FROM affiliate_statistics WHERE 1=1`;
    const params = [];

    if (campaign_id) {
        query += ` AND campaign_id = ?`;
        params.push(campaign_id);
    }

    if (min_referrals) {
        query += ` AND total_referrals >= ?`;
        params.push(min_referrals);
    }

    if (min_earnings) {
        query += ` AND total_earnings >= ?`;
        params.push(min_earnings);
    }

    try {
        const [results] = await executeQueryFromPoolAsync(conexionOrbet, query, params);
        res.status(200).json({ statistics: results });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {post} /api/affiliate/link Link Affiliate to User
 * @description Links a user to an affiliate.
 * @body {number} user_id - User ID.
 * @body {number} affiliate_id - Affiliate ID.
 * @success {201} { message: "Affiliate linked successfully." }
 * @error {400} user_id and affiliate_id are required.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Link-Affiliate-to-User-1807ea735ace81b2ab83ef66b3458200?pvs=4
 */
app.post('/api/affiliate/link', async (req, res) => {
    const { user_id, affiliate_id } = req.body;

    // Validación de entrada
    if (!user_id || !affiliate_id) {
        return res.status(400).json({ message: 'user_id and affiliate_id are required.' });
    }

    try {
        // Verificar si ya existe el enlace
        const [existingLink] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT * FROM affiliate_links
            WHERE user_id = ? AND affiliate_id = ?
        `, [user_id, affiliate_id]);

        if (existingLink.length > 0) {
            return res.status(400).json({ message: 'Affiliate link already exists.' });
        }

        // Crear el vínculo de afiliado
        await executeQueryFromPoolAsync(conexionOrbet, `
            INSERT INTO affiliate_links (user_id, affiliate_id, status)
            VALUES (?, ?, 'active')
        `, [user_id, affiliate_id]);

        return res.status(201).json({ message: 'Affiliate linked successfully.' });
    } catch (error) {
        console.error('Error linking affiliate:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {delete} /api/affiliate/link Unlink Affiliate from User
 * @description Removes the link between a user and an affiliate.
 * @body {number} user_id - User ID.
 * @body {number} affiliate_id - Affiliate ID.
 * @success {200} { message: "Affiliate link removed successfully." }
 * @error {400} user_id and affiliate_id are required.
 * @error {404} Affiliate link not found.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Unlink-Affiliate-from-User-1807ea735ace8114aac3d7e863f171f8?pvs=4
 */
app.delete('/api/affiliate/link', async (req, res) => {
    const { user_id, affiliate_id } = req.body;

    // Validación de entrada
    if (!user_id || !affiliate_id) {
        return res.status(400).json({ message: 'user_id and affiliate_id are required.' });
    }

    try {
        // Verificar si el vínculo existe
        const [existingLink] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT * FROM affiliate_links
            WHERE user_id = ? AND affiliate_id = ?
        `, [user_id, affiliate_id]);

        if (existingLink.length === 0) {
            return res.status(404).json({ message: 'Affiliate link not found.' });
        }

        // Eliminar el vínculo
        await executeQueryFromPoolAsync(conexionOrbet, `
            DELETE FROM affiliate_links
            WHERE user_id = ? AND affiliate_id = ?
        `, [user_id, affiliate_id]);

        return res.status(200).json({ message: 'Affiliate link removed successfully.' });
    } catch (error) {
        console.error('Error unlinking affiliate:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {post} /api/affiliate/referral Register Referral
 * @description Registers a referral, validating possible fraud.
 * @body {number} user_id - User ID.
 * @body {string} referral_code - Referral code.
 * @body {string} ip_address - User IP address.
 * @body {string} session_id - Current session ID.
 * @success {201} { message: "Referral registered successfully." }
 * @error {400} Missing required fields.
 * @error {403} Fraudulent referral activity detected.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Register-Referral-1807ea735ace8115bde8fa2a110ef242?pvs=4
 */
app.post('/api/affiliate/referral', async (req, res) => {
    const { user_id, referral_code, ip_address, session_id } = req.body;

    // Validar que todos los campos requeridos estén presentes
    if (!user_id || !referral_code || !ip_address || !session_id) {
        return res.status(400).json({
            message: 'Missing required fields: user_id, referral_code, ip_address, session_id'
        });
    }

    try {
        // 1. Detectar fraude
        const fraudCheck = await detectReferralFraud(user_id, ip_address, referral_code);

        if (fraudCheck.flagged) {
            // 2. Registrar evento sospechoso en la tabla de eventos de riesgo
            await executeQueryFromPoolAsync(conexionOrbet, `
                INSERT INTO risk_events (user_id, session_id, risk_type, risk_level, description, detected_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [
                user_id,
                session_id,
                fraudCheck.risk_type,
                fraudCheck.risk_level,
                `Fraud detected: ${fraudCheck.details} | Referral Code: ${referral_code} | IP: ${ip_address}`
            ]);

            return res.status(403).json({
                message: 'Fraudulent referral activity detected',
                reason: fraudCheck.details,
                session_id: session_id
            });
        }

        // 3. Insertar referido si pasó las validaciones de fraude
        await executeQueryFromPoolAsync(conexionOrbet, `
            INSERT INTO referrals (user_id, code, ip_address, created_at)
            VALUES (?, ?, ?, NOW())
        `, [user_id, referral_code, ip_address]);

        res.status(201).json({
            message: 'Referral registered successfully',
            user_id: user_id,
            referral_code: referral_code,
            session_id: session_id
        });

    } catch (error) {
        console.error('Error registering referral:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /api/affiliate/calculate-earnings Calculate Affiliate Earnings
 * @description Calculates affiliate earnings based on active campaigns.
 * @query {number} affiliate_id - Affiliate ID (optional).
 * @success {200} { success: true, data: [...] }
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Calculate-Affiliate-Earnings-1807ea735ace814f802cd37970841c0a?pvs=4
 */
app.get('/api/affiliate/calculate-earnings', async (req, res) => {
    try {
        const { affiliate_id } = req.query;  // Permitir filtrar por afiliado si se envía el parámetro

        let query = `
            SELECT 
                af.user_id,
                af.campaign_id,
                af.total_referrals,
                af.total_wagered,
                af.total_earnings,
                af.last_updated,
                u.name AS user_name,
                u.email AS user_email,
                c.name AS campaign_name,
                c.start_date,
                c.end_date,
                c.status AS campaign_status
            FROM affiliate_statistics af
            JOIN users u ON af.user_id = u.user_id
            JOIN campaigns c ON af.campaign_id = c.campaign_id
        `;

        let params = [];

        if (affiliate_id) {
            query += ' WHERE af.campaign_id = ?';
            params.push(affiliate_id);
        }

        const [results] = await executeQueryFromPoolAsync(conexionOrbet, query, params);

        // Estructurar la respuesta en formato JSON
        const response = results.map(stat => ({
            user: {
                id: stat.user_id,
                name: stat.user_name,
                email: stat.user_email
            },
            campaign: {
                id: stat.campaign_id,
                name: stat.campaign_name,
                status: stat.campaign_status,
                start_date: stat.start_date,
                end_date: stat.end_date
            },
            statistics: {
                total_referrals: stat.total_referrals,
                total_wagered: stat.total_wagered,
                total_earnings: stat.total_earnings,
                last_updated: stat.last_updated
            }
        }));

        return res.status(200).json({
            success: true,
            data: response
        });

    } catch (error) {
        console.error('Error fetching affiliate statistics:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * @api {get} /affiliate/metrics/:user_id Get Real-Time Affiliate Metrics
 * @description Returns updated affiliate metrics (referrals, bets, earnings).
 * @param {number} user_id - User ID.
 * @success {200} { total_referrals, total_wagered, total_earnings, updated_at }
 * @error {404} No metrics found for this user.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Real-Time-Affiliate-Metrics-1807ea735ace81709f44d88711e7dbc7?pvs=4
 */
app.get('/affiliate/metrics/:user_id', async (req, res) => {
    const { user_id } = req.params;

    try {
        // Consulta las métricas del afiliado
        const [metrics] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT 
                total_referrals, 
                total_wagered, 
                total_earnings, 
                last_updated
            FROM affiliate_statistics
            WHERE user_id = ?
        `, [user_id]);

        if (metrics.length === 0) {
            return res.status(404).json({ message: 'No metrics found for this user.' });
        }

        res.status(200).json({
            user_id,
            total_referrals: metrics[0].total_referrals,
            total_wagered: metrics[0].total_wagered,
            total_earnings: metrics[0].total_earnings,
            updated_at: metrics[0].updated_at
        });
    } catch (error) {
        console.error('Error fetching affiliate metrics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region User preferences

/**
 * @api {get} /api/user/preferences/:userId Retrieve User Preferences
 * @description Fetches the preference settings for a specific user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { message: "User preferences retrieved successfully.", preferences: [{ preference_key, preference_value }] }
 * @error {400} User ID is required.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-User-Preferences-18c7ea735ace8195a010d57f49d729b2?pvs=4
 */
app.get('/api/user/preferences/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    try {
        // Consultar las preferencias del usuario
        const [preferences] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT preference_key, preference_value
            FROM user_preferences
            WHERE user_id = ?
        `, [userId]);

        res.status(200).json({
            message: 'User preferences retrieved successfully.',
            preferences
        });
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        res.status(500).json({
            message: 'Internal server error.',
            error: error.message
        });
    }
});

/**
 * @api {put} /api/user/preferences/:userId Update User Preferences
 * @description Updates or inserts the user's preferences in the system.
 *
 * @param {string} userId - The ID of the user (required).
 * @body {array} preferences - An array of objects containing key-value pairs for preferences. Example:
 *   [
 *     { "key": "currency", "value": "USD" },
 *     { "key": "dark_mode", "value": "true" }
 *   ]
 *
 * @success {200} { message: "User preferences updated successfully." }
 * @error {400} User ID and preferences array are required.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Update-User-Preferences-18c7ea735ace81b5bbc2f2228958b1cd?pvs=4
 */
app.put('/api/user/preferences/:userId', async (req, res) => {
    const { userId } = req.params;
    const { preferences } = req.body; // Array de objetos [{ key, value }]

    if (!userId || !Array.isArray(preferences)) {
        return res.status(400).json({
            message: 'User ID and preferences array are required.'
        });
    }

    try {
        // Construir la consulta para insertar o actualizar preferencias
        const query = `
            INSERT INTO user_preferences (user_id, preference_key, preference_value)
            VALUES ${preferences.map(() => '(?, ?, ?)').join(', ')}
            ON DUPLICATE KEY UPDATE preference_value = VALUES(preference_value)
        `;

        const params = preferences.flatMap(pref => [userId, pref.key, pref.value]);

        // Ejecutar la consulta
        await executeQueryFromPoolAsync(conexionOrbet, query, params);

        res.status(200).json({
            message: 'User preferences updated successfully.'
        });
    } catch (error) {
        console.error('Error updating user preferences:', error);
        res.status(500).json({
            message: 'Internal server error.',
            error: error.message
        });
    }
});

//#endregion

//#region User ignore

/**
 * @api {get} /api/user/ignored/:userId Retrieve Ignored Users
 * @description Fetches a list of user IDs that the specified user has ignored.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { message: "Ignored users retrieved successfully.", ignored_users: [1, 2, 3] }
 * @error {400} User ID is required.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Ignored-Users-18c7ea735ace81d994e8fbe120df2056?pvs=4
 */
app.get('/api/user/ignored/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({
            message: 'User ID is required.'
        });
    }

    try {
        // Obtener solo los IDs de los usuarios ignorados
        const [ignoredUsers] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT ignored_user_id
            FROM user_ignores
            WHERE user_id = ?
        `, [userId]);

        const ignoredUserIds = ignoredUsers.map(user => user.ignored_user_id);

        res.status(200).json({
            message: 'Ignored users retrieved successfully.',
            ignored_users: ignoredUserIds
        });
    } catch (error) {
        console.error('Error fetching ignored users:', error);
        res.status(500).json({
            message: 'Internal server error.',
            error: error.message
        });
    }
});

/**
 * @api {post} /api/user/ignore/:userId Ignore a User
 * @description Allows a user to ignore another user, preventing interactions.
 *
 * @param {string} userId - The ID of the user initiating the ignore action (required).
 * @body {string} ignored_user_id - The ID of the user to be ignored (required).
 *
 * @success {201} { message: "User ignored successfully." }
 * @error {400} ignored_user_id is required.
 * @error {400} User cannot ignore themselves.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Ignore-a-User-18c7ea735ace8123ac3cd12372b08984?pvs=4
 */
app.post('/api/user/ignore/:userId', async (req, res) => {
    const { userId } = req.params;
    const { ignored_user_id } = req.body;

    if (!ignored_user_id) {
        return res.status(400).json({ message: 'ignored_user_id is required.' });
    }

    if (userId === ignored_user_id) {
        return res.status(400).json({ message: 'You cannot ignore yourself.' });
    }

    try {
        // Obtener la lista de usuarios ignorados
        const ignoredUsers = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT ignored_user_id 
            FROM user_ignores 
            WHERE user_id = ?
        `, [userId]);

        // Desencriptar la lista de usuarios ignorados
        const decryptedIgnoredUsers = ignoredUsers.map(user => ({
            ignored_user_id: decrypt(user.ignored_user_id),
        }));

        // Verificar si el usuario ya está en la lista
        const alreadyIgnored = decryptedIgnoredUsers.some(
            user => user.ignored_user_id.toString() === ignored_user_id.toString()
        );

        if (alreadyIgnored) {
            return res.status(200).json({
                message: 'User is already ignored.',
            });
        }

        // Encriptar el ID del usuario a ignorar
        const encryptedIgnoredUserId = encrypt(ignored_user_id.toString());
        // Insertar el nuevo usuario ignorado
        await executeQueryFromPoolAsync(conexionOrbet, `
            INSERT INTO user_ignores (user_id, ignored_user_id)
            VALUES (?, ?)
        `, [userId, encryptedIgnoredUserId]);

        res.status(201).json({ message: 'User ignored successfully.' });
    } catch (error) {
        console.error('Error ignoring user:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {delete} /api/user/ignore/:userId Unignore a User
 * @description Allows a user to remove another user from their ignored list.
 *
 * @param {string} userId - The ID of the user initiating the unignore action (required).
 * @body {string} ignored_user_id - The ID of the user to be removed from the ignored list (required).
 *
 * @success {200} { message: "User unignored successfully." }
 * @error {400} ignored_user_id is required.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Unignore-a-User-18c7ea735ace81a086ece8cbfb539874?pvs=4
 */
app.delete('/api/user/ignore/:userId', async (req, res) => {
    const { userId } = req.params;
    const { ignored_user_id } = req.body;

    if (!ignored_user_id) {
        return res.status(400).json({ message: 'ignored_user_id is required.' });
    }

    try {
        // Eliminar el usuario de la lista de ignorados
        await executeQueryFromPoolAsync(conexionOrbet, `
            DELETE FROM user_ignores
            WHERE user_id = ? AND ignored_user_id = ?
        `, [userId, ignored_user_id]);

        res.status(200).json({ message: 'User unignored successfully.' });
    } catch (error) {
        console.error('Error unignoring user:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {post} /api/messages/send/:senderId Send a Message
 * @description Allows a user to send a message to another user. If the receiver has ignored the sender, the message will not be sent.
 *
 * @param {string} senderId - The ID of the sender (retrieved from the authentication token).
 * @body {string} receiver_id - The ID of the recipient (required).
 * @body {string} message_content - The message content (required).
 *
 * @success {201} { message: "Message sent successfully." }
 * @error {400} receiver_id and message_content are required.
 * @error {403} You cannot send messages to this user.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Send-a-Message-18c7ea735ace81e98779e36d701b3794?pvs=4
 */
app.post('/api/messages/send/:senderId', async (req, res) => {
    const senderId = req.userId;
    const { receiver_id, message_content } = req.body;

    if (!receiver_id || !message_content) {
        return res.status(400).json({ message: 'receiver_id and message_content are required.' });
    }

    try {
        // Verificar si el receptor ha bloqueado al remitente
        const [ignored] = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT * FROM user_ignores
            WHERE user_id = ? AND ignored_user_id = ?
        `, [receiver_id, senderId]);

        if (ignored.length > 0) {
            return res.status(403).json({ message: 'You cannot send messages to this user.' });
        }

        // Insertar el mensaje si no hay bloqueo
        await executeQueryFromPoolAsync(conexionOrbet, `
            INSERT INTO messages (sender_id, receiver_id, content, sent_at)
            VALUES (?, ?, ?, NOW())
        `, [senderId, receiver_id, message_content]);

        res.status(201).json({ message: 'Message sent successfully.' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region User profile

/**
 * @api {get} /api/user/profile/:userId Retrieve User Profile
 * @description Fetches the profile information of a specified user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { profile: { user_id, name, email, username, country, currency, language, created_at } }
 * @error {404} User profile not found.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-User-Profile-18c7ea735ace81599bbac0c7a3ece250?pvs=4
 */
app.get('/api/user/profile/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Consulta básica para obtener el perfil del usuario
        const userProfile = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT user_id, name, email, username, country,currency,language, created_at
            FROM users
            WHERE user_id = ?
        `, [userId]);

        if (userProfile.length === 0) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        res.status(200).json({ profile: userProfile[0] });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {put} /api/user/profile/:userId Update or Create User Profile
 * @description Updates an existing user profile or creates one if the user does not exist.
 *
 * @param {string} userId - The ID of the user (required).
 * @body {string} [name] - Updated name.
 * @body {string} [email] - Updated email.
 * @body {string} [username] - Updated username.
 * @body {string} [country] - Updated country.
 * @body {string} [currency] - Updated currency.
 * @body {string} [language] - Updated language.
 *
 * @success {200} { message: "User profile updated successfully." }
 * @success {201} { message: "User profile created successfully." }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Update-or-Create-User-Profile-18c7ea735ace8170af45cc2886e89da2?pvs=4
 */
app.put('/api/user/profile/:userId', encryptMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { name, email, username, country, currency, language } = req.body;

    try {
        // Verificar si el usuario ya existe
        const existingUser = await conexionOrbet.query(`
            SELECT user_id FROM users WHERE user_id = ?
        `, [userId]);

        if (existingUser.length === 0) {
            // Si no existe, insertar un nuevo perfil
            await executeQueryFromPoolAsync(conexionOrbet, `
                INSERT INTO users (user_id, name, email, username, country, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [userId, name, email, username, country]);

            return res.status(201).json({ message: 'User profile created successfully.' });
        }

        // Si ya existe, actualizar los campos proporcionados
        await executeQueryFromPoolAsync(conexionOrbet, `
            UPDATE users
            SET name = COALESCE(?, name),
                email = COALESCE(?, email),
                username = COALESCE(?, username),
                country = COALESCE(?, country),
                currency = COALESCE(?, currency),
                language = COALESCE(?, language),
                updated_at = NOW()
            WHERE user_id = ?
        `, [name, email, username, country, currency, language, userId]);

        res.status(200).json({ message: 'User profile updated successfully.' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//actualiza el username de un usuario
app.put('/api/user/account/username', async (req, res) => {
    const { token, username_new, } = req.body;

    const tokenData = decodedJwt(token, process.env.JWT_SECRET);
    if (!tokenData) {
        return res.status(403).json({ status: false, message: 'forbidden access' });
    }

    const userID = tokenData.id;

    //chequeamos que no exista el nuevo username ya
    const queryCheckUsername = 'SELECT 1 FROM users WHERE username = ?';
    const resultCheck = await executeQueryFromPoolAsync(conexionOrbet, queryCheckUsername, [username_new]);

    if (resultCheck.length > 0) {
        return res.status(403).json({ status: false, message: 'Username is already in use' });
    }

    //si estamos aqui quiere decir que el token es valido y el username esta disponible

    const updateQuery = 'UPDATE users SET username = ? WHERE user_id = ?';
    const resultUpdate = await executeQueryFromPoolAsync(conexionOrbet, updateQuery, [username_new, userID]);

    if (resultUpdate.affectedRows > 0) {
        return res.status(200).json({ status: true, message: 'Username updated' });
    } else {
        return res.status(400).json({ status: false, message: 'Failed to update username' });
    }
});

//#endregion

//#region Verification

app.get('/api/settings/verifyStatus/:token/', async (req, res) => {
    const token = req.params.token;

    const tokenData = decodedJwt(token, process.env.JWT_SECRET);
    if (!tokenData) {
        return res.status(403).json({ status: false, message: 'forbidden access, session expired' });
    }

    const userID = tokenData.id;

    //consultamos en la tabla verification_status si existe datos del usuario 
    const queryCheckVerification = 'SELECT * FROM verification_status WHERE userID = ?';
    const resultCheck = await executeQueryFromPoolAsync(conexionOrbet, queryCheckVerification, [userID]);


    //now we get the email
    const emailQuery = 'SELECT email FROM users WHERE user_id = ?';
    const resultEmail = await executeQueryFromPoolAsync(conexionOrbet, emailQuery, [userID]);

    if (!resultEmail || resultEmail.length == 0) {
        return res.status(200).json({ status: false, message: 'forbidden access, invalid data!' });
    }

    const emailUser = resultEmail[0].email;

    if (!resultCheck || resultCheck.length == 0) {
        return res.status(200).json({ status: true, emailStatus: false, kycStatus: false, email: emailUser, kycleveltwo: false });
    }

    const emailStatus = resultCheck[0].emailStatus == 1;
    const legalData = resultCheck[0].legalData > 0;

    console.log("data of setting getted");

    return res.status(200).json({ status: true, emailStatus: emailStatus, kycStatus: legalData, email: emailUser, kycleveltwo: (resultCheck[0].kycStatus > 0) });
});

app.get('/api/settings/verifyEmail/:token/', async (req, res) => {
    const token = req.params.token;

    const tokenData = decodedJwt(token, process.env.JWT_SECRET);
    if (!tokenData) {
        return res.status(403).json({ status: false, message: 'forbidden access, session expired' });
    }

    console.log("a user request ")

    const userID = tokenData.id;

    try {
        // Verificar si existe una solicitud de verificación en la última hora
        const queryCheckRequest = `
            SELECT created_at 
            FROM verification_email_requests 
            WHERE user_id = ? AND created_at >= NOW() - INTERVAL 1 HOUR
        `;
        const recentRequests = await executeQueryFromPoolAsync(conexionOrbet, queryCheckRequest, [userID]);

        if (recentRequests.length > 0) {
            return res.status(403).json({ status: false, message: 'A verification was requested in the last 60 minutes' });
        }

        // Obtener el email del usuario desde la tabla `users`
        const queryGetEmail = `SELECT email,name FROM users WHERE user_id = ?`;
        const userResult = await executeQueryFromPoolAsync(conexionOrbet, queryGetEmail, [userID]);

        if (!userResult || userResult.length === 0) {
            return res.status(404).json({ status: false, message: 'User email not found' });
        }

        // Si no existe una solicitud previa, crear una nueva
        const codeVerification = nanoid(32);
        const queryInsertRequest = `
            INSERT INTO verification_email_requests (user_id, code, created_at)
            VALUES (?, ?, NOW())
        `;
        await executeQueryFromPoolAsync(conexionOrbet, queryInsertRequest, [userID, codeVerification]);

        const tokenCifrado = jwt.sign({ code: codeVerification, user: userID }, process.env.JWT_SECRET)

        const userEmail = userResult[0].email;
        const user_name = userResult[0].name;
        const verificationLink = baseUrlWeb + `/verify/email/${tokenCifrado}`;

        const templatePath = path.join(__dirname, 'email_templates', 'email_verify_template.html');

        // Leer el archivo de plantilla HTML
        fs.readFile(templatePath, 'utf8', async (err, data) => {
            if (err) {
                console.error("Error al leer la plantilla de correo:", err);
                return;
            }

            // Reemplazar los marcadores con los valores correspondientes
            var bodyMail = data.replace('{{name}}', user_name).replace('{{code}}', verificationLink);

            // Correo sin formato (texto plano)
            var plainMail = `Hi ${user_name},\nEnter this is your verification link: ${verificationLink}`;

            // Opciones del correo
            var mailOptions = {
                from: 'Orbet <gambleversecontact@gmail.com>', //this need be changed in production!
                to: userEmail,
                subject: 'Orbet Email verification',
                text: plainMail,
                html: bodyMail
            };

            // Enviar el correo con el código de recuperación
            await transporter.sendMail(mailOptions);

            res.json({ status: true, message: 'Verification email sent successfully' });
        });
    } catch (error) {
        console.log("error al verificar email: ", error);
        return res.status(500).json({ status: false, message: 'Server error, try again later.' });
    }
});

//crea una solicitud para verificar el correo
app.get("/verify/email/:token", async (req, res) => {
    const token = req.params.token;

    // Decodificar el token JWT
    const tokenData = decodedJwt(token, process.env.JWT_SECRET);
    if (!tokenData) {
        return res.status(403).json({ status: false, message: "Forbidden access, session expired" });
    }

    const code = tokenData.code;
    const userID = tokenData.user;

    try {
        // Buscar en la tabla verification_email_requests que existe un item que coincida
        const queryFindRequest = `
            SELECT created_at 
            FROM verification_email_requests 
            WHERE user_id = ? AND code = ? AND status = 0
        `;
        const verificationRequest = await executeQueryFromPoolAsync(conexionOrbet, queryFindRequest, [userID, code]);

        if (verificationRequest.length === 0) {
            return res.status(404).json({ status: false, message: "Verification request not found or invalid" });
        }

        const requestCreatedAt = new Date(verificationRequest[0].created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Verificar que el item coincidente se haya creado hace menos de una hora
        if (requestCreatedAt < oneHourAgo) {
            return res.status(403).json({ status: false, message: "Verification request has expired" });
        }

        // Verificar si existe un registro en la tabla verification_status para este userID
        const queryFindStatus = `SELECT emailStatus FROM verification_status WHERE userID = ?`;
        const statusResult = await executeQueryFromPoolAsync(conexionOrbet, queryFindStatus, [userID]);

        if (statusResult.length === 0) {
            // Si no existe, insertar un nuevo registro
            const queryInsertStatus = `
                INSERT INTO verification_status (userID, emailStatus) 
                VALUES (?, ?)
            `;
            await executeQueryFromPoolAsync(conexionOrbet, queryInsertStatus, [userID, 1]);
        } else {
            // Si existe, actualizar el valor de email_status a 1
            const queryUpdateStatus = `
                UPDATE verification_status 
                SET emailStatus = ? 
                WHERE userID = ?
            `;
            await executeQueryFromPoolAsync(conexionOrbet, queryUpdateStatus, [1, userID]);
        }

        const updateRequest = `
                UPDATE verification_email_requests 
                SET status = 1 
                WHERE user_id = ? AND code = ?
            `;
        await executeQueryFromPoolAsync(conexionOrbet, updateRequest, [userID, code]);

        // Mostrar un mensaje de "Account verified successfully"
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Success</title>
            </head>
            <body>
                <h1>Account verified successfully!</h1>
                <p>Your email has been verified. You can now close this window.</p>
            </body>
            </html>
        `);

    } catch (error) {
        console.error("Error during email verification:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
});

//---------------------------------------------------------
//KYC SYSTEM

// Endpoint para crear solicitar una verificacion de usuario
app.get('/api/kyc/create/:token/', async (req, res) => {
    const token = req.params.token;

    // Decodificar el token JWT
    const tokenData = decodedJwt(token, process.env.JWT_SECRET);
    if (!tokenData) {
        console.log("el token es invalido");
        return res.status(403).json({ status: false, message: "Forbidden access, session expired" });
    }

    const externalUserId = tokenData.id;

    const findUser = `
            SELECT * 
            FROM users
            WHERE user_id = ?
        `;
    const userData = await executeQueryFromPoolAsync(conexionOrbet, findUser, [externalUserId]);
    if (!userData) {
        console.log("no se consiguio un usuario con ese id");
        return res.status(403).json({ status: false, message: "Forbidden access" });
    }


    const findRequest = `
            SELECT * 
            FROM kyc_verifications_request
            WHERE userID = ?
        `;
    const requestData = await executeQueryFromPoolAsync(conexionOrbet, findRequest, [externalUserId]);
    let NeedInsertAnRequest = true;
    let oldToken = null;
    let oldApplicantId = null;
    if (requestData.length > 0) {

        oldToken = requestData[0].token;
        oldApplicantId = requestData[0].applicantId;

        const requestCreatedAt = new Date(requestData[0].created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Verificar que el item coincidente se haya creado hace menos de una hora
        if (requestCreatedAt < oneHourAgo) {
            //si se creo hacer menos de una hora no necesito insertar una nueva solicitud
            NeedInsertAnRequest = false;
        }
    }


    // Preparar datos del usuario para SumSub
    const nameSections = userData[0].name.split(' ');
    const userInfo = {
        firstName: nameSections[0],
        lastName: nameSections.length > 1 ? nameSections[1] : "",
        dob: userData[0].dob || "",
        email: userData[0].email,
        phone: userData[0].phone || "",
        country: userData[0].country || "",
    };

    try {
        if (NeedInsertAnRequest) {
            console.log("no hay una solicitud previa asi que crearemos una!");

            // Crear al usuario en SumSub y obtener applicantId
            const applicant = await createApplicant(externalUserId, userInfo);
            const applicantId = applicant.id;

            console.log("applicantId getted form sumsub: " + applicantId);

            const tokenData = await getAccessTokenForApplicant(externalUserId);

            //guardamos en la db de solicitudes kyc_verifications_request la solicitud con su respentivo applicant id
            const saveRequest = `
                INSERT INTO  kyc_verifications_request (userID, applicantId, token)
                VALUES (?, ?, ?)
            `;
            await executeQueryFromPoolAsync(conexionOrbet, saveRequest, [externalUserId, applicant.id, tokenData]);

            console.log("solo nos falta crear el url vamos bien!");

            const urlToVerify = await generateUrlForApplicant(externalUserId);

            const urlKyc = urlToVerify.url;
            return res.json({ status: true, token: tokenData, urlKyc: urlKyc });
        } else {
            // Si ya existe un token reciente, devolverlo
            if (oldToken) {
                const objectToken = JSON.parse(oldToken);

                console.log("solo nos falta crear el url vamos bien 2!");

                const urlToVerify = await generateUrlForApplicant(oldApplicantId);
                const urlKyc = urlToVerify.url;

                return res.json({ status: true, token: objectToken, urlKyc: urlKyc });
            } else {
                return res.status(400).json({ status: false, message: 'We can get the token now, try again in a few moments' });
            }
        }

    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

app.post("/KYC/callback", async (req, res) => {
    console.log("new data from sumsub:", req.body);
    const { applicantId, type, reviewStatus, reviewResult } = req.body;

    if (!applicantId || !type || !reviewStatus) {
        console.log("Webhook data is incomplete:", req.body);
        return res.status(400).json({ status: false, message: "Incomplete webhook data" });
    }

    if (type == "applicantReviewed" && reviewStatus == 'completed') {

        //el documento fue revisado
        try {
            const findRequest = `
                SELECT * 
                FROM kyc_verifications_request
                WHERE applicantId = ?
                ORDER BY id DESC LIMIT 1
            `;
            const requestData = await executeQueryFromPoolAsync(conexionOrbet, findRequest, [applicantId]);

            if (!requestData || requestData.length === 0) {
                console.log("No KYC request found for applicantId:", applicantId);
                return res.status(404).json({ status: false, message: "KYC request not found" });
            }

            //ahora verificamos el estado
            const userID = requestData[0].userID;
            const requestID = requestData[0].id;

            statusData = {
                GREEN: {
                    msg: "Your account was verified success",
                    statusID: 1,
                    img: "https://gambleverse.store/images_templates/thumb-up.jpeg"
                },
                RED: {
                    msg: "Your verification was rejected, please try again",
                    statusID: 2,
                    img: "https://gambleverse.store/images_templates/sad_astronaut.jpeg"
                },
                RED_END: {
                    msg: "Your verification was rejected, please contact to support.",
                    statusID: 3,
                    img: "https://gambleverse.store/images_templates/sad_astronaut.jpeg"
                }
            }

            let reviewAnswer = statusData.RED;
            if (reviewResult.reviewAnswer == "GREEN") {
                reviewAnswer = statusData.GREEN;
            } else if (reviewResult.reviewAnswer == "RED" && reviewResult.reviewRejectType == 'FINAL') {
                reviewAnswer = statusData.RED_END;
            }

            // Obtener el correo del usuario
            const queryEmail = `SELECT email FROM users WHERE user_id = ?`;
            const requestEmail = await executeQueryFromPoolAsync(conexionOrbet, queryEmail, [userID]);

            if (!requestEmail || requestEmail.length === 0) {
                console.log("KYC-Callback: No user found for userID:", userID);
                return res.status(404).json({ status: false, message: "User not found" });
            }

            const templatePath = path.join(__dirname, 'email_templates', 'verify_kyc_template.html');
            const userEmail = requestEmail[0].email;

            //actualizamos en el server la solicitud
            const queryUpdateRequest = `UPDATE kyc_verifications_request SET status = ? WHERE id = ?`;
            await executeQueryFromPoolAsync(conexionOrbet, queryUpdateRequest, [reviewAnswer.statusID, requestID]);

            //si el usuario paso la verificacion
            if (reviewResult.reviewAnswer == "GREEN") {
                //actualizamos en el server el estado del usuario
                const queryUpdateRequest2 = `UPDATE verification_status SET kycStatus = 1 WHERE userID = ?`;
                await executeQueryFromPoolAsync(conexionOrbet, queryUpdateRequest2, [userID]);

                const applicantData = await GetApplicantData(applicantId);
                if (applicantData) {
                    const inspectionId = applicantData.inspectionId;
                    const docs = await getDocumentsInfo_kyc(applicantId);
                    if (docs) {
                        //obtenemos uno por uno los archivos y los almacenamos en nuestro server
                        for (let item of docs.items) {
                            const secretHash = nanoid(6);
                            const filePath = `doc_${item.id}_${secretHash}_${(item.fileMetadata.fileName || ".png")}`;
                            const image = await GetDocumentFromApplicant(inspectionId, item.id, filePath);
                            if (image) {
                                const descImg = item.reviewResult.clientComment || "";

                                const query_SaveDocumentOnDb = `INSERT INTO user_documents(user_id, description, file_path, status, is_approved, origin) VALUES(?,?,?,?,?,?)`;
                                await executeQueryFromPoolAsync(conexionOrbet, query_SaveDocumentOnDb, [userID, descImg, filePath, "approved", "SI", "sumsub"]);
                            }
                        }
                    }
                } else {
                    console.log("NO CONSEGUIMOS LA APPLICANT DATA");
                }
            }else{
                //actualizamos en el server el estado del usuario
                const queryUpdateRequest2 = `UPDATE verification_status SET kycStatus = 2 WHERE userID = ?`;
                await executeQueryFromPoolAsync(conexionOrbet, queryUpdateRequest2, [userID]);

                const applicantData = await GetApplicantData(applicantId);
                if (applicantData) {
                    const inspectionId = applicantData.inspectionId;
                    const docs = await getDocumentsInfo_kyc(applicantId);
                    if (docs) {
                        //obtenemos uno por uno los archivos y los almacenamos en nuestro server
                        for (let item of docs.items) {
                            const secretHash = nanoid(6);
                            const filePath = `doc_${item.id}_${secretHash}_${(item.fileMetadata.fileName || ".png")}`;
                            const image = await GetDocumentFromApplicant(inspectionId, item.id, filePath);
                            if (image) {
                                const descImg = item.reviewResult.clientComment || "";

                                const query_SaveDocumentOnDb = `INSERT INTO user_documents(user_id, description, file_path, status, is_approved, origin) VALUES(?,?,?,?,?,?)`;
                                await executeQueryFromPoolAsync(conexionOrbet, query_SaveDocumentOnDb, [userID, descImg, filePath, "declined", "NO", "sumsub"]);
                            }
                        }
                    }
                } else {
                    console.log("NO CONSEGUIMOS LA APPLICANT DATA");
                }
            }



            //le avisamos al usuario el estado de su verificion
            fs.readFile(templatePath, 'utf8', async (err, data) => {
                if (err) {
                    console.error("Error al leer la plantilla de correo, igualmente procedimos como debemos.", err);
                    return res.status(500).json({ status: false, message: "Error processing email template" });
                }

                const webDashboard = baseUrlWeb + "/webapp/settings.html";

                // Reemplazar los marcadores con los valores correspondientes
                const bodyMail = data.replace('{{name}}', userName)
                    .replace('{{msg}}', reviewAnswer.msg)
                    .replace('{{imgUp}}', reviewAnswer.img)
                    .replace('{{web}}', webDashboard);


                // Correo sin formato (texto plano)
                var plainMail = `Hi ${user_name},\n ${reviewAnswer.msg}`;

                // Opciones del correo
                var mailOptions = {
                    from: 'Orbet <gambleversecontact@gmail.com>', //this need be changed in production!
                    to: userEmail,
                    subject: 'Orbet KYC Verification',
                    text: plainMail,
                    html: bodyMail
                };

                // Enviar el correo con el código de recuperación
                await transporter.sendMail(mailOptions);

                return res.status(200).json({ status: true, message: "Webhook processed successfully" });
            });


        } catch (error) {
            console.log("error on KYC callback: ", error);
            return res.status(500).json({ status: false, message: "Internal server error" });
        }
    }

    res.status(200).json({ status: true, message: "Webhook received but no action taken" });
});

app.get("/KYC/TEST/GetApplicantData/:applicantId", async (req, res) => {
    const applicantId = req.params.applicantId;

    if (!applicantId) {
        console.log("data is incomplete:", req.params);
        return res.status(200).json({ status: false, message: "Incomplete webhook data" });
    }

    try {
        const applicantData = await GetApplicantData(applicantId);

        if (!applicantData) {
            return res.status(200).json({ status: false, message: "error gettint data" });
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(applicantData);
    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ status: false, message: "server error" });
    }
});

app.get("/KYC/TEST/getDocumentsInfo/:applicantId", async (req, res) => {
    const applicantId = req.params.applicantId;

    if (!applicantId) {
        console.log("data is incomplete:", req.params);
        return res.status(200).json({ status: false, message: "Incomplete webhook data" });
    }

    try {
        const applicantData = await getDocumentsInfo_kyc(applicantId);

        if (!applicantData) {
            return res.status(200).json({ status: false, message: "error gettint data" });
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(applicantData);
    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ status: false, message: "server error" });
    }
});

app.get("/KYC/TEST/getImage/:inspectionId/:itemId", async (req, res) => {
    const inspectionId = req.params.inspectionId;
    const itemId = req.params.itemId;

    console.log("cargando doc");

    if (!inspectionId || !itemId) {
        console.log("data is incomplete:", req.params);
        return res.status(200).json({ status: false, message: "Incomplete webhook data" });
    }

    try {
        //const numbers__ = customAlphabet('1234567890', 18);
        const secretHash = nanoid(6);
        const filePath = `doc_${itemId}_${secretHash}_${("Temporal.png")}`;

        console.log("calling GetDocumentFromApplicant");
        const image = await GetDocumentFromApplicant(inspectionId, itemId, filePath);

        if (image && image.status) {

            // Leer la imagen desde el archivo guardado y enviarla al navegador
            fs.readFile(image.filePath, (err, data) => {
                if (err) {
                    console.error("Error reading image file:", err);
                    return res.status(500).json({ status: false, message: "Error reading image" });
                }

                res.setHeader('Content-Type', 'image/png'); // Ajusta el tipo MIME según el formato
                return res.end(data); // Envía los datos de la imagen
            });
        } else {
            return res.status(200).json({ status: false, message: "error getting img" });
        }
    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ status: false, message: "server error" });
    }
});

//#endregion

//#region BONUS

/**
 * @api {post} /api/bonus/configuration/save Save Bonus Configuration
 * @description Saves all bonus configurations from the admin panel.
 *
 * @body {object} baseRakeback - Base Rakeback configuration.
 * @body {object} rakeBoost - RakeBoost configuration.
 * @body {object} dailyBonus - Daily Bonus configuration.
 * @body {object} weeklyBonus - Weekly Bonus configuration.
 * @body {object} monthlyBonus - Monthly Bonus configuration.
 * @body {array} rankUpBonus - Array of Rank Up Bonus configurations.
 * @body {array} battlePass - Array of Battle Pass level configurations.
 * @body {object} calendarBonus - Calendar Bonus configuration.
 *
 * @success {200} Configuration saved successfully.
 * @example Success Response:
 * {
 *   "message": "Configuration saved successfully"
 * }
 *
 * @error {400} Missing or invalid body data.
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Save-Bonus-Configuration-17c7ea735ace802899fcd813b9c7a492?pvs=4
 */
app.post('/api/bonus/configuration/save', async (req, res) => {
    const {
        baseRakeback,
        rakeBoost,
        dailyBonus,
        weeklyBonus,
        monthlyBonus,
        rankUpBonus,
        battlePass,
        calendarBonus,
    } = req.body;

    if (!baseRakeback || !rakeBoost || !dailyBonus || !weeklyBonus || !monthlyBonus || !rankUpBonus || !battlePass || !calendarBonus) {
        return res.status(400).json({ message: 'Missing or invalid body data' });
    }

    const connection = await conexionOrbet.getConnection(); // Get a connection from the pool
    await connection.beginTransaction(); // Start a transaction

    try {

        // Ensure the bonus entry exists
        const ensureBonusQuery = `
            INSERT IGNORE INTO bonus_config (id, bonus_name)
            VALUES (?, ?);
        `;
        await connection.query(ensureBonusQuery, [baseRakeback.bonusId, 'Base Rakeback']);

        const deleteBaseRakebackQuery = `DELETE FROM base_rakeback_config WHERE bonus_id = ?;`;
        await connection.query(deleteBaseRakebackQuery, [baseRakeback.bonusId]);
        // Insert/Update Base Rakeback
        const baseRakebackQuery = `
            INSERT INTO base_rakeback_config (bonus_id, percentage, claim_cooldown_minutes)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            percentage = VALUES(percentage),
            claim_cooldown_minutes = VALUES(claim_cooldown_minutes);
        `;
        await connection.query(baseRakebackQuery, [
            baseRakeback.bonusId,
            baseRakeback.percentage,
            baseRakeback.claimCooldownMinutes,
        ]);

        const deleteRakeboostQuery = `DELETE FROM rakeboost_config WHERE bonus_id = ?;`;
        await connection.query(deleteRakeboostQuery, [rakeBoost.bonusId]);
        // Insert/Update RakeBoost
        const rakeBoostQuery = `
            INSERT INTO rakeboost_config (bonus_id, bonus_percentage, duration_hours, trigger_activity)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            bonus_percentage = VALUES(bonus_percentage),
            duration_hours = VALUES(duration_hours),
            trigger_activity = VALUES(trigger_activity);
        `;
        await connection.query(rakeBoostQuery, [
            rakeBoost.bonusId,
            rakeBoost.bonusPercentage,
            rakeBoost.durationHours,
            rakeBoost.triggerActivity,
        ]);

        const deleteDailyBonusQuery = `DELETE FROM daily_bonus_config WHERE bonus_id = ?;`;
        await connection.query(deleteDailyBonusQuery, [dailyBonus.bonusId]);
        // Insert/Update Daily Bonus
        const dailyBonusQuery = `
            INSERT INTO daily_bonus_config (bonus_id, percentage, max_accumulation_days, immediate_claim_percentage, calendar_claim_percentage)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            percentage = VALUES(percentage),
            max_accumulation_days = VALUES(max_accumulation_days),
            immediate_claim_percentage = VALUES(immediate_claim_percentage),
            calendar_claim_percentage = VALUES(calendar_claim_percentage);
        `;
        await connection.query(dailyBonusQuery, [
            dailyBonus.bonusId,
            dailyBonus.percentage,
            dailyBonus.maxAccumulationDays,
            dailyBonus.immediateClaimPercentage,
            dailyBonus.calendarClaimPercentage,
        ]);

        const deleteWeeklyBonusQuery = `DELETE FROM weekly_bonus_config WHERE bonus_id = ?;`;
        await connection.query(deleteWeeklyBonusQuery, [weeklyBonus.bonusId]);
        // Insert/Update Weekly Bonus
        const weeklyBonusQuery = `
            INSERT INTO weekly_bonus_config (bonus_id, percentage, immediate_claim_percentage, calendar_claim_percentage)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            percentage = VALUES(percentage),
            immediate_claim_percentage = VALUES(immediate_claim_percentage),
            calendar_claim_percentage = VALUES(calendar_claim_percentage);
        `;
        await connection.query(weeklyBonusQuery, [
            weeklyBonus.bonusId,
            weeklyBonus.percentage,
            weeklyBonus.immediateClaimPercentage,
            weeklyBonus.calendarClaimPercentage,
        ]);

        const deleteMonthlyBonusQuery = `DELETE FROM monthly_bonus_config WHERE bonus_id = ?;`;
        await connection.query(deleteMonthlyBonusQuery, [monthlyBonus.bonusId]);
        // Insert/Update Monthly Bonus
        const monthlyBonusQuery = `
            INSERT INTO monthly_bonus_config (bonus_id, percentage, immediate_claim_percentage, calendar_claim_percentage)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            percentage = VALUES(percentage),
            immediate_claim_percentage = VALUES(immediate_claim_percentage),
            calendar_claim_percentage = VALUES(calendar_claim_percentage);
        `;
        await connection.query(monthlyBonusQuery, [
            monthlyBonus.bonusId,
            monthlyBonus.percentage,
            monthlyBonus.immediateClaimPercentage,
            monthlyBonus.calendarClaimPercentage,
        ]);

        // Insert/Update Rank Up Bonus
        if (rankUpBonus.length > 0) {
            const deleteRankUpQuery = `DELETE FROM rank_up_bonus_config WHERE bonus_id = ?;`;
            await connection.query(deleteRankUpQuery, [rankUpBonus[0].bonusId]);

            const insertRankUpQuery = `
                INSERT INTO rank_up_bonus_config (bonus_id, \`rank\`, total_wager, rakeback)
                VALUES (?, ?, ?, ?);
            `;
            for (const rank of rankUpBonus) {
                await connection.query(insertRankUpQuery, [
                    rank.bonusId,
                    rank.rank,
                    rank.totalWager,
                    rank.rakeback,
                ]);
            }
        }

        // Insert/Update Battle Pass
        if (battlePass.length > 0) {
            const deleteBattlePassQuery = `DELETE FROM battle_pass_config WHERE bonus_id = ?;`;
            await connection.query(deleteBattlePassQuery, [battlePass[0].bonusId]);

            const insertBattlePassQuery = `
                INSERT INTO battle_pass_config (bonus_id, level, wager, wager_difference, cash_prizes, rakeback_bonus, free_spins)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `;
            for (const level of battlePass) {
                await connection.query(insertBattlePassQuery, [
                    level.bonusId,
                    level.level,
                    level.wager,
                    level.wagerDifference,
                    level.cashPrizes,
                    level.rakebackBonus,
                    level.freeSpins,
                ]);
            }
        }

        const deleteCalendarBonusQuery = `DELETE FROM calendar_bonus_config WHERE bonus_id = ?;`;
        await connection.query(deleteCalendarBonusQuery, calendarBonus.bonusId);
        // Insert/Update Calendar Bonus
        const calendarBonusQuery = `
            INSERT INTO calendar_bonus_config (bonus_id, distribution_days, morning_split, afternoon_split, evening_split)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            distribution_days = VALUES(distribution_days),
            morning_split = VALUES(morning_split),
            afternoon_split = VALUES(afternoon_split),
            evening_split = VALUES(evening_split);
        `;
        await connection.query(calendarBonusQuery, [
            calendarBonus.bonusId,
            calendarBonus.distributionDays ?? 0, // Default to 0 if null
            calendarBonus.morningSplit ?? 0,    // Default to 0 if null
            calendarBonus.afternoonSplit ?? 0, // Default to 0 if null
            calendarBonus.eveningSplit ?? 0,   // Default to 0 if null
        ]);

        await connection.commit();
        return res.status(200).json({ message: 'Configuration saved successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error saving configuration:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
});

/**
 * @api {get} /api/bonus/configuration Get Bonus Configuration
 * @description Fetches all bonus configurations for the admin panel.
 *
 * @success {200} Configuration fetched successfully.
 * @example Success Response:
 * {
 *   "baseRakeback": { ... },
 *   "rakeBoost": { ... },
 *   "dailyBonus": { ... },
 *   "weeklyBonus": { ... },
 *   "monthlyBonus": { ... },
 *   "rankUpBonus": [ ... ],
 *   "battlePass": [ ... ],
 *   "calendarBonus": { ... }
 * }
 *
 * @error {500} Internal server error.
 * @status Documented ✅
 * @notion https://www.notion.so/Get-Bonus-Configuration-17b7ea735ace80009569c649be964534?pvs=4
 */
app.get('/api/bonus/configuration', async (req, res) => {
    const connection = await conexionOrbet.getConnection();

    try {
        const queries = {
            baseRakeback: `
                SELECT SQL_NO_CACHE percentage, claim_cooldown_minutes
                FROM base_rakeback_config
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            rakeBoost: `
                SELECT SQL_NO_CACHE bonus_percentage, duration_hours, trigger_activity
                FROM rakeboost_config
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            dailyBonus: `
                SELECT SQL_NO_CACHE percentage, max_accumulation_days, immediate_claim_percentage, calendar_claim_percentage
                FROM daily_bonus_config
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            weeklyBonus: `
                SELECT SQL_NO_CACHE percentage, immediate_claim_percentage, calendar_claim_percentage
                FROM weekly_bonus_config
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            monthlyBonus: `
                SELECT SQL_NO_CACHE percentage, immediate_claim_percentage, calendar_claim_percentage
                FROM monthly_bonus_config
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            rankUpBonus: `
                SELECT SQL_NO_CACHE \`rank\`, total_wager, rakeback
                FROM rank_up_bonus_config
                WHERE bonus_id = 1;                
            `,
            battlePass: `
                SELECT SQL_NO_CACHE level, wager, wager_difference, cash_prizes, rakeback_bonus, free_spins
                FROM battle_pass_config
                WHERE bonus_id = 1;                                       
            `,
            calendarBonus: `
                SELECT distribution_days, morning_split, afternoon_split, evening_split
                FROM calendar_bonus_config
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
        };

        // Execute all queries in parallel
        const [
            [baseRakeback],
            [rakeBoost],
            [dailyBonus],
            [weeklyBonus],
            [monthlyBonus],
            rankUpBonus,
            battlePass,
            [calendarBonus],
        ] = await Promise.all(
            Object.values(queries).map((query) => connection.query(query))
        );

        // Prepare the response payload
        const response = {
            baseRakeback: baseRakeback || null,
            rakeBoost: rakeBoost || null,
            dailyBonus: dailyBonus || null,
            weeklyBonus: weeklyBonus || null,
            monthlyBonus: monthlyBonus || null,
            rankUpBonus: rankUpBonus || [],
            battlePass: battlePass || [],
            calendarBonus: calendarBonus || null,
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching configuration:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
});

async function getBonusConfigurations() {
    const connection = await conexionOrbet.getConnection();

    try {
        const queries = {
            baseRakeback: `
                SELECT SQL_NO_CACHE percentage, claim_cooldown_minutes
                FROM base_rakeback
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            rakeBoost: `
                SELECT SQL_NO_CACHE bonus_percentage, duration_hours, trigger_activity
                FROM rakeboost
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            dailyBonus: `
                SELECT SQL_NO_CACHE percentage, max_accumulation_days, immediate_claim_percentage, calendar_claim_percentage
                FROM daily_bonus
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            weeklyBonus: `
                SELECT SQL_NO_CACHE percentage, immediate_claim_percentage, calendar_claim_percentage
                FROM weekly_bonus
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            monthlyBonus: `
                SELECT SQL_NO_CACHE percentage, immediate_claim_percentage, calendar_claim_percentage
                FROM monthly_bonus
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
            rankUpBonus: `
                SELECT SQL_NO_CACHE \`rank\`, total_wager, rakeback
                FROM rank_up_bonus
                WHERE bonus_id = 1;                
            `,
            battlePass: `
                SELECT SQL_NO_CACHE level, wager, wager_difference, cash_prizes, rakeback_bonus, free_spins
                FROM battle_pass
                WHERE bonus_id = 1;                                       
            `,
            calendarBonus: `
                SELECT distribution_days, morning_split, afternoon_split, evening_split
                FROM calendar_bonus
                WHERE bonus_id = 1
                ORDER BY id DESC
                LIMIT 1;
            `,
        };

        // Execute all queries in parallel
        const [
            [baseRakeback],
            [rakeBoost],
            [dailyBonus],
            [weeklyBonus],
            [monthlyBonus],
            rankUpBonus,
            battlePass,
            [calendarBonus],
        ] = await Promise.all(
            Object.values(queries).map((query) => connection.query(query))
        );

        return {
            baseRakeback: baseRakeback || null,
            rakeBoost: rakeBoost || null,
            dailyBonus: dailyBonus || null,
            weeklyBonus: weeklyBonus || null,
            monthlyBonus: monthlyBonus || null,
            rankUpBonus: rankUpBonus || [],
            battlePass: battlePass || [],
            calendarBonus: calendarBonus || null,
        };
    } catch (error) {
        console.error('Error fetching bonus configurations:', error);
        throw error;
    } finally {
        connection.release();
    }
}

//Calculate all bonuses
async function calculateAllBonuses(userId, houseEdge, userTotalWager, daysPlayed) {
    const configs = await getBonusConfigurations();

    //house edge 5 %
    await calculateBaseRakeback(userId, houseEdge, configs.baseRakeback);
    //house edge 10 %
    await applyRakeBoost(userId, houseEdge, configs.rakeBoost);
    //house edge 6%
    await calculateDailyBonus(userId, houseEdge, daysPlayed, configs.dailyBonus);
    //house edge 5%
    await calculateWeeklyBonus(userId, houseEdge, configs.weeklyBonus);
    //house edge 4%
    await calculateMonthlyBonus(userId, houseEdge, configs.monthlyBonus);
    //house edge 10%
    await checkRankUp(userId, userTotalWager, configs.rankUpBonus);
    //house edge ~10%
    await checkBattlePassLevel(userId, userTotalWager, configs.battlePass);
}

//Base Rakeback
//The base rakeback grants a percentage of the House Edge, split between immediate claims and calendar bonuses.
async function calculateBaseRakeback(userId, houseEdge, baseRakeback) {
    const { percentage } = baseRakeback.percentage;
    const rakeback = houseEdge * (percentage / 100);

    const immediateClaim = rakeback * 0.5; // 50%
    const calendarBonus = rakeback * 0.5;  // 50%

    // Save immediate claim to user_bonuses
    await saveBonus(userId, 'base_rakeback', immediateClaim, calendarBonus);

    // Log immediate claim
    await logBonusActivity(userId, 'base_rakeback', immediateClaim, 'Immediate claim for base rakeback');

    // Distribute calendar bonus over 3 days/.. to-do need to configured days. currently hardcoded 3
    await distributeCalendarBonus(userId, 'base_rakeback', calendarBonus, 3);

    // Log calendar bonus distribution
    await logBonusActivity(userId, 'base_rakeback', calendarBonus, 'Calendar bonus for base rakeback distributed over 3 days');

    return { immediateClaim, calendarBonus };
}

//Rake boost
//The RakeBoost temporarily increases the base rakeback percentage.
async function applyRakeBoost(userId, houseEdge, rakeBoost) {
    const percentage = rakeBoost.bonusPercentage; // Additional 10%
    const boostedRakeback = houseEdge * (0.05 + percentage); // Base + Boost //receive 15% of the House Edge. 0.05 is 5 percent

    const immediateClaim = boostedRakeback * 0.5;
    const calendarBonus = boostedRakeback * 0.5;

    // Save to database
    await saveBonus(userId, 'rake_boost', immediateClaim, calendarBonus);

    return { immediateClaim, calendarBonus };
}

//Daily bonus
//The Daily Bonus accumulates over a maximum of n number of days (3 from bonus document) and distributes rewards.
async function calculateDailyBonus(userId, houseEdge, daysPlayed, dailyBonusConfig) {
    const percentage = dailyBonusConfig.percentage; // 5%
    const dailyBonus = houseEdge * percentage * Math.min(daysPlayed, dailyBonusConfig.maxAccumulationDays);

    const immediateClaim = dailyBonus * dailyBonusConfig.immediateClaimPercentage;//0.2; // 20%
    const calendarBonus = dailyBonus * dailyBonusConfig.calendarClaimPercentage;//0.8;  // 80%

    // Save to database
    await saveBonus(userId, 'daily_bonus', immediateClaim, calendarBonus);

    return { immediateClaim, calendarBonus };
}

//Weekly Bonus
//The Weekly Bonus applies for games played between Monday and Sunday.
async function calculateWeeklyBonus(userId, houseEdge, weeklyBonusConfig) {
    const percentage = weeklyBonusConfig.percentage; // 5%
    const weeklyBonus = houseEdge * percentage;

    const immediateClaim = weeklyBonus * weeklyBonusConfig.immediateClaimPercentage;//0.2; // 20%
    const calendarBonus = weeklyBonus * weeklyBonusConfig.calendarClaimPercentage;//0.8;  // 80%

    // Save to database
    await saveBonus(userId, 'weekly_bonus', immediateClaim, calendarBonus);

    return { immediateClaim, calendarBonus };
}

//Monthly bonus
//The Monthly Bonus accumulates for games played throughout the month.
async function calculateMonthlyBonus(userId, houseEdge, monthlyBonusConfig) {
    const percentage = monthlyBonusConfig.percentage; // 4%
    const monthlyBonus = houseEdge * percentage;

    const immediateClaim = monthlyBonus * monthlyBonusConfig.immediateClaimPercentage;//0.2; // 20%
    const calendarBonus = monthlyBonus * monthlyBonusConfig.calendarClaimPercentage;//0.8;  // 80%

    // Save to database
    await saveBonus(userId, 'monthly_bonus', immediateClaim, calendarBonus);

    return { immediateClaim, calendarBonus };
}

//Rank Up Bonus
//Players level up based on their total wagers. Rewards are distributed on reaching specific wager milestones.
async function checkRankUp(userId, userTotalWager, ranks) {
    // const ranks = [
    //     { rank: 1, totalWager: 10000, rakeback: 0.1 },
    //     { rank: 2, totalWager: 25000, rakeback: 0.1 },
    //     { rank: 3, totalWager: 50000, rakeback: 0.1 },
    //     // Add more ranks as required
    // ];

    for (const rank of ranks) {
        if (userTotalWager >= rank.totalWager && !(await hasRank(userId, rank.rank))) {
            const rakebackReward = userTotalWager * rank.rakeback;

            //Upon rank-up, the player receives 20% of the rank reward immediately, while the remaining 80% goes towards the calendar bonus.
            const immediateClaim = rakebackReward * 0.2; // 20%
            const calendarBonus = rakebackReward * 0.8;  // 80%

            // Save rank and bonuses
            await saveRank(userId, rank.rank);
            await saveBonus(userId, 'rank_up_bonus', immediateClaim, calendarBonus);

            return { rank: rank.rank, immediateClaim, calendarBonus };
        }
    }

    return null;
}

//Battle Pass
//The Battle Pass has 50 levels, with rewards at each level.
async function checkBattlePassLevel(userId, totalWager, battlePassLevels) {
    // Iterate through each level in the configuration
    for (const level of battlePassLevels) {
        const { level: levelNumber, wager, cash_prizes, rakeback_bonus, free_spins } = level;

        // Check if the user qualifies for the current level
        if (totalWager >= wager && !(await hasBattlePassLevel(userId, levelNumber))) {
            // Save the user's new Battle Pass level
            await saveBattlePassLevel(userId, levelNumber);

            // Grant the rewards for the new level
            if (parseFloat(cash_prizes) > 0) {
                // Add fixed cash prize to the user's account
                await addCashToUser(userId, parseFloat(cash_prizes));
                await logBonusActivity(
                    userId,
                    'battle_pass',
                    parseFloat(cash_prizes),
                    `Granted cash prize for reaching Battle Pass level ${levelNumber}`
                );
            }

            if (parseFloat(rakeback_bonus) > 0) {
                // Apply rakeback bonus (adjusting the base rakeback)
                await applyRakebackBonus(userId, parseFloat(rakeback_bonus));
                await logBonusActivity(
                    userId,
                    'battle_pass',
                    parseFloat(rakeback_bonus),
                    `Granted rakeback bonus for reaching Battle Pass level ${levelNumber}`
                );
            }

            if (parseInt(free_spins, 10) > 0) {
                // Add free spins for the user
                await grantFreeSpins(userId, parseInt(free_spins, 10));
                await logBonusActivity(
                    userId,
                    'battle_pass',
                    parseInt(free_spins, 10),
                    `Granted ${free_spins} free spins for reaching Battle Pass level ${levelNumber}`
                );
            }

            // Return the current level details as confirmation
            return level;
        }
    }

    // If no new levels are achieved, return null
    return null;
}

//Calendar Bonus
//The Calendar Bonus distributes rewards over multiple days and splits them into morning, afternoon, and evening portions.
async function distributeCalendarBonus(userId, bonusType, totalAmount, days) {
    const connection = await conexionOrbet.getConnection();

    try {
        const dailyAmount = totalAmount / days;

        for (let i = 1; i <= days; i++) {
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + i);

            const query = `
                INSERT INTO calendar_bonus_schedule (user_id, bonus_type, day, amount, scheduled_date, claimed)
                VALUES (?, ?, ?, ?, ?, FALSE);
            `;

            await connection.query(query, [userId, bonusType, i, dailyAmount, scheduledDate]);

            // Log each scheduled bonus
            await logBonusActivity(userId, bonusType, dailyAmount, `Scheduled calendar bonus for day ${i}`);
        }
    } catch (error) {
        console.error('Error distributing calendar bonus:', error);
        throw error;
    } finally {
        connection.release();
    }
}

//table does not have description column
async function logBonusActivity(userId, bonusType, amount, description) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `
            INSERT INTO bonus_logs (user_id, bonus_type, amount, timestamp, description)
            VALUES (?, ?, ?, NOW(), ?);
        `;
        await connection.query(query, [userId, bonusType, amount, description]);
    } catch (error) {
        console.error('Error logging bonus activity:', error);
        throw error;
    } finally {
        connection.release();
    }
}

//Helper Functions for Bonus

//Save Bonus to Database
async function saveBonus(userId, bonusType, immediateClaim, calendarBonus) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `
            INSERT INTO user_bonuses (user_id, bonus_type, immediate_claim, calendar_bonus)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            immediate_claim = VALUES(immediate_claim),
            calendar_bonus = VALUES(calendar_bonus);
        `;
        await connection.query(query, [userId, bonusType, immediateClaim, calendarBonus]);
    } finally {
        connection.release();
    }
}

//Save User's Rank
async function saveRank(userId, rank) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `
            INSERT INTO user_ranks (user_id, \`rank\`)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE \`rank\` = VALUES(\`rank\`);
        `;
        await connection.query(query, [userId, rank]);
    } finally {
        connection.release();
    }
}

//Check if User Has Rank
async function hasRank(userId, rank) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `SELECT COUNT(*) AS count FROM user_ranks WHERE user_id = ? AND \`rank\` = ?;`;
        const [[{ count }]] = await connection.query(query, [userId, rank]);
        return count > 0;
    } finally {
        connection.release();
    }
}

//Save Battle Pass Level
async function saveBattlePassLevel(userId, level) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `
            INSERT INTO user_battle_pass (user_id, level)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE level = VALUES(level);
        `;
        await connection.query(query, [userId, level]);
    } finally {
        connection.release();
    }
}

//update user cash prize for battle pass
async function addCashToUser(userId, amount) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `
            UPDATE user_balances
            SET cash_prizes = cash_prizes + ?
            WHERE user_id = ?;
        `;

        // Update the cash_prizes column for the specified user
        const [result] = await connection.query(query, [amount, userId]);

        // Check if any row was updated (user exists in the table)
        if (result.affectedRows === 0) {
            throw new Error(`No user found with id ${userId} in user_balances`);
        }
    } catch (error) {
        console.error('Error adding cash prize:', error);
        throw error;
    } finally {
        connection.release();
    }
}


//Adjusts the user's base rakeback by adding the specified bonus percentage.
async function applyRakebackBonus(userId, rakebackBonus) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `
            UPDATE user_bonuses
            SET immediate_claim = immediate_claim + (immediate_claim * ? / 100),
                calendar_bonus = calendar_bonus + (calendar_bonus * ? / 100)
            WHERE user_id = ? AND bonus_type = 'base_rakeback';
        `;
        await connection.query(query, [rakebackBonus, rakebackBonus, userId]);
    } finally {
        connection.release();
    }
}

//Adds free spins for the user in the database.
async function grantFreeSpins(userId, spins) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `
            INSERT INTO user_free_spins (user_id, spins, granted_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE spins = spins + VALUES(spins);
        `;
        await connection.query(query, [userId, spins]);
    } finally {
        connection.release();
    }
}


//Check if User Has Battle Pass Level
async function hasBattlePassLevel(userId, level) {
    const connection = await conexionOrbet.getConnection();

    try {
        const query = `SELECT COUNT(*) AS count FROM user_battle_pass WHERE user_id = ? AND level = ?;`;
        const [[{ count }]] = await connection.query(query, [userId, level]);
        return count > 0;
    } finally {
        connection.release();
    }
}

//#endregion BONUS END

//#region Email preferences

/**
 * @api {get} /api/email/preferences/:userId Retrieve Email Preferences
 * @description Fetches the email marketing preferences of a specified user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { preferences: [{ campaign_id, campaign_name, subscribed, updated_at }] }
 * @error {404} No email preferences found for this user.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Email-Preferences-18c7ea735ace81348035c984bfd2f075?pvs=4
 */
app.get('/api/email/preferences/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [preferences] = await conexionOrbet.query(`
            SELECT p.campaign_id, c.name AS campaign_name, p.subscribed, p.updated_at
            FROM email_preferences p
            JOIN campaigns c ON p.campaign_id = c.campaign_id
            WHERE p.user_id = ?
        `, [userId]);

        if (preferences.length === 0) {
            return res.status(404).json({ message: 'No email preferences found for this user.' });
        }

        res.status(200).json({ preferences });
    } catch (error) {
        console.error('Error fetching email preferences:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {put} /api/email/preferences/:userId Update Email Preference
 * @description Updates the subscription status of a user for a specific email marketing campaign.
 *
 * @param {string} userId - The ID of the user (required).
 * @body {integer} campaign_id - The ID of the campaign (required).
 * @body {boolean} subscribed - Subscription status (true for subscribed, false for unsubscribed).
 *
 * @success {200} { message: "Email preference updated successfully." }
 * @error {400} campaign_id and subscribed status are required.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Email-Preference-18c7ea735ace811ea556fa223c1f9369?pvs=4
 */
app.put('/api/email/preferences/:userId', async (req, res) => {
    const { userId } = req.params;
    const { campaign_id, subscribed } = req.body;

    if (!campaign_id || typeof subscribed !== 'boolean') {
        return res.status(400).json({ message: 'campaign_id and subscribed status are required.' });
    }

    try {
        // Verificar si ya existe una preferencia para esta campaña
        const [existingPreference] = await conexionOrbet.query(`
            SELECT * FROM email_preferences
            WHERE user_id = ? AND campaign_id = ?
        `, [userId, campaign_id]);

        if (existingPreference.length > 0) {
            // Actualizar preferencia existente
            await conexionOrbet.query(`
                UPDATE email_preferences
                SET subscribed = ?, updated_at = NOW()
                WHERE user_id = ? AND campaign_id = ?
            `, [subscribed, userId, campaign_id]);
        } else {
            // Crear nueva preferencia
            await conexionOrbet.query(`
                INSERT INTO email_preferences (user_id, campaign_id, subscribed)
                VALUES (?, ?, ?)
            `, [userId, campaign_id, subscribed]);
        }
        let subs = 'subscribed';
        if (subscribed) {
            subs = 'subscribed';
        } else {
            subs = 'unsubscribed';
        }
        // Registrar la acción
        await conexionOrbet.query(`
            INSERT INTO email_marketing_logs (user_id, campaign_id, action)
            VALUES (?, ?, ?)
        `, [userId, campaign_id, subs]);

        res.status(200).json({ message: 'Email preference updated successfully.' });
    } catch (error) {
        console.error('Error updating email preferences:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {post} /api/email/preferences/:userId/subscribe-all Subscribe to All Email Campaigns
 * @description Subscribes a user to all available email marketing campaigns.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { message: "User subscribed to all campaigns." }
 * @error {404} No campaigns available.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Subscribe-to-All-Email-Campaigns-18c7ea735ace81d2bca2cee792757927?pvs=4
 */
app.post('/api/email/preferences/:userId/subscribe-all', async (req, res) => {
    const { userId } = req.params;

    try {
        // Obtener todas las campañas
        const [campaigns] = await conexionOrbet.query(`SELECT campaign_id FROM campaigns`);

        if (campaigns.length === 0) {
            return res.status(404).json({ message: 'No campaigns available.' });
        }

        for (const campaign of campaigns) {
            await conexionOrbet.query(`
                INSERT INTO email_preferences (user_id, campaign_id, subscribed)
                VALUES (?, ?, TRUE)
                ON DUPLICATE KEY UPDATE subscribed = TRUE, updated_at = NOW()
            `, [userId, campaign.campaign_id]);

            // Registrar la acción
            await conexionOrbet.query(`
            INSERT INTO email_marketing_logs (user_id, campaign_id, action)
            VALUES (?, ?, 'subscribed')
        `, [userId, campaign.campaign_id]);
        }

        res.status(200).json({ message: 'User subscribed to all campaigns.' });
    } catch (error) {
        console.error('Error subscribing to all campaigns:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {post} /api/email/preferences/:userId/unsubscribe-all Unsubscribe from All Email Campaigns
 * @description Unsubscribes a user from all email marketing campaigns.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { message: "User unsubscribed from all campaigns." }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Unsubscribe-from-All-Email-Campaigns-18c7ea735ace81c79be2d76fe9e80b74?pvs=4
 */
app.post('/api/email/preferences/:userId/unsubscribe-all', async (req, res) => {
    const { userId } = req.params;

    try {
        // Obtener todas las campañas
        const [campaigns] = await conexionOrbet.query(`SELECT campaign_id FROM campaigns`);

        await conexionOrbet.query(`
            UPDATE email_preferences
            SET subscribed = FALSE, updated_at = NOW()
            WHERE user_id = ?
        `, [userId]);

        for (const campaign of campaigns) {
            // Registrar la acción
            await conexionOrbet.query(`
            INSERT INTO email_marketing_logs (user_id, campaign_id, action)
            VALUES (?, ?, 'unsubscribed')
        `, [userId, campaign.campaign_id]);
        }

        res.status(200).json({ message: 'User unsubscribed from all campaigns.' });
    } catch (error) {
        console.error('Error unsubscribing from all campaigns:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region user transactions

/**
 * @api {get} /api/user/transactions/:user_id Retrieve User Transaction History
 * @description Fetches a user's transaction history with optional filters for date range and pagination.
 *
 * @param {string} user_id - The ID of the user (required).
 * @query {string} [start_date] - Filter transactions starting from this date.
 * @query {string} [end_date] - Filter transactions up to this date.
 * @query {integer} [page=1] - Page number for pagination.
 * @query {integer} [limit=10] - Number of transactions per page.
 *
 * @success {200} { transactions: [...], pagination: { current_page, total_pages, total_transactions } }
 * @error {400} User ID is required.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-User-Transaction-History-18c7ea735ace81f2bf5adeb43b945581?pvs=4
 */
app.get('/api/user/transactions/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { start_date, end_date, page = 1, limit = 10 } = req.query;

    // Validar parámetros requeridos
    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    try {
        // Construir la consulta con filtros opcionales
        let query = `
            SELECT 
                transaction_id, 
                user_id, 
                amount, 
                transaction_type, 
                status, 
                created_at, 
                description
            FROM user_transactions
            WHERE user_id = ?
        `;
        const params = [user_id];

        // Filtrar por rango de fechas
        if (start_date) {
            query += ` AND created_at >= ?`;
            params.push(start_date);
        }

        if (end_date) {
            query += ` AND created_at <= ?`;
            params.push(end_date);
        }

        // Ordenar por fecha de creación
        query += ` ORDER BY created_at DESC`;

        // Paginación
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        // Ejecutar la consulta
        const [transactions] = await conexionOrbet.query(query, params);

        // Obtener el número total de transacciones para el usuario
        const [countResult] = await conexionOrbet.query(`
            SELECT COUNT(*) AS total
            FROM user_transactions
            WHERE user_id = ?
        `, [user_id]);

        const total = countResult[0].total;

        // Respuesta
        res.status(200).json({
            transactions,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_transactions: total,
            },
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region user Wallet

/**
 * @api {get} /api/user/wallet-visibility/:userId Retrieve Wallet Visibility
 * @description Fetches the wallet visibility setting of a specific user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { userId, is_visible }
 * @error {404} User not found or visibility setting not set.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Wallet-Visibility-18c7ea735ace817b9c23fcca8ff2da78?pvs=4
 */
app.get('/api/user/wallet-visibility/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [result] = await conexionOrbet.query(`
            SELECT is_visible
            FROM wallet_visibility
            WHERE user_id = ?
        `, [userId]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found or visibility setting not set.' });
        }

        res.status(200).json({ userId, is_visible: result[0].is_visible });
    } catch (error) {
        console.error('Error fetching wallet visibility:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {put} /api/user/wallet-visibility/:userId Update Wallet Visibility
 * @description Updates a user's wallet visibility and optionally updates currency-specific balances.
 *
 * @param {string} userId - The ID of the user (required).
 * @body {boolean} is_visible - Visibility status (true = visible, false = hidden).
 * @body {string} [currency] - Currency to update (optional, updates all if not provided).
 *
 * @success {200} { message: "Wallet and balances visibility updated successfully.", userId, is_visible }
 * @error {400} is_visible must be a boolean.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Wallet-Visibility-18c7ea735ace814a858dd096ad57dc21?pvs=4
 */
app.put('/api/user/wallet-visibility/:userId', async (req, res) => {
    const { userId } = req.params;
    const { is_visible, currency } = req.body;

    if (typeof is_visible !== 'boolean') {
        return res.status(400).json({ message: 'is_visible must be a boolean.' });
    }

    try {
        const visibility = is_visible ? 'visible' : 'hidden';

        // Obtener la configuración actual
        const [currentSetting] = await conexionOrbet.query(`
            SELECT is_visible
            FROM wallet_visibility
            WHERE user_id = ? LIMIT 1
        `, [userId]);

        // Actualizar o insertar en `wallet_visibility`
        await conexionOrbet.query(`
            INSERT INTO wallet_visibility (user_id, is_visible, updated_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE is_visible = ?, updated_at = NOW()
        `, [userId, is_visible, is_visible]);

        // Registrar el cambio en `wallet_visibility_audit` si ya había una configuración previa
        if (currentSetting.length > 0) {
            await conexionOrbet.query(`
        INSERT INTO wallet_visibility_audit (user_id, old_visibility, new_visibility, changed_at)
        VALUES (?, ?, ?, NOW())
    `, [userId, currentSetting[0].is_visible, is_visible]);
        }

        // Actualizar la visibilidad de los balances del usuario
        if (currency) {
            await conexionOrbet.query(`
                UPDATE user_balances
                SET visibility = ?, last_updated = NOW()
                WHERE user_id = ? AND currency = ?
            `, [visibility, userId, currency]);
        }
        else {
            await conexionOrbet.query(`
                UPDATE user_balances
                SET visibility = ?, last_updated = NOW()
                WHERE user_id = ?
            `, [visibility, userId]);
        }


        res.status(200).json({
            message: 'Wallet and balances visibility updated successfully.',
            userId,
            is_visible
        });
    } catch (error) {
        console.error('Error updating wallet visibility:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region user privacy mode

/**
 * @api {get} /api/user/modes/:userId Retrieve User Modes
 * @description Fetches privacy and streamer mode settings for a user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { userId, privacy_mode, streamer_mode }
 * @error {404} User modes not found.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-User-Modes-18c7ea735ace81549336d70d3bd6c8cc?pvs=4
 */
app.get('/api/user/modes/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [result] = await conexionOrbet.query(`
            SELECT privacy_mode, streamer_mode
            FROM user_modes
            WHERE user_id = ?
        `, [userId]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'User modes not found.' });
        }

        res.status(200).json({
            userId,
            privacy_mode: result[0].privacy_mode,
            streamer_mode: result[0].streamer_mode
        });
    } catch (error) {
        console.error('Error fetching user modes:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {put} /api/user/modes/:userId Update User Modes
 * @description Updates the privacy mode and/or streamer mode settings of a user.
 *
 * @param {string} userId - The ID of the user (required).
 * @body {boolean} [privacy_mode] - Toggle for privacy mode.
 * @body {boolean} [streamer_mode] - Toggle for streamer mode.
 *
 * @success {200} { message: "User modes updated successfully.", userId, privacy_mode, streamer_mode }
 * @error {400} At least one mode (privacy_mode or streamer_mode) must be a boolean.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Update-User-Modes-18c7ea735ace81bea7ddfe4877930133?pvs=4
 */
app.put('/api/user/modes/:userId', async (req, res) => {
    const { userId } = req.params;
    const { privacy_mode, streamer_mode } = req.body;

    if (typeof privacy_mode !== 'boolean' && typeof streamer_mode !== 'boolean') {
        return res.status(400).json({ message: 'At least one mode (privacy_mode or streamer_mode) must be a boolean.' });
    }

    try {
        await conexionOrbet.query(`
            INSERT INTO user_modes (user_id, privacy_mode, streamer_mode, updated_at)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                privacy_mode = COALESCE(?, privacy_mode),
                streamer_mode = COALESCE(?, streamer_mode),
                updated_at = NOW()
        `, [
            userId,
            privacy_mode !== undefined ? privacy_mode : null,
            streamer_mode !== undefined ? streamer_mode : null,
            privacy_mode !== undefined ? privacy_mode : null,
            streamer_mode !== undefined ? streamer_mode : null
        ]);

        res.status(200).json({
            message: 'User modes updated successfully.',
            userId,
            privacy_mode,
            streamer_mode
        });
    } catch (error) {
        console.error('Error updating user modes:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region user currency preference

/**
 * @api {get} /api/user/currency-preferences/:userId Retrieve User Currency Preferences
 * @description Fetches the preferred currency of a user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { user_id, preferred_currency }
 * @error {404} Currency preferences not found.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-User-Currency-Preferences-18c7ea735ace8124a501cfd1d49ab397?pvs=4
 */
app.get('/api/user/currency-preferences/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [result] = await conexionOrbet.query(`
            SELECT preferred_currency
            FROM user_currency_preferences
            WHERE user_id = ?
        `, [userId]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Currency preferences not found.' });
        }

        res.status(200).json({
            user_id: userId,
            preferred_currency: result[0].preferred_currency
        });
    } catch (error) {
        console.error('Error fetching currency preferences:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {put} /api/user/currency-preferences/:userId Update User Currency Preferences
 * @description Updates the preferred currency of a user.
 *
 * @param {string} userId - The ID of the user (required).
 * @body {string} preferred_currency - The new preferred currency (required).
 *
 * @success {200} { message: "Currency preferences updated successfully.", user_id, preferred_currency }
 * @error {400} preferred_currency is required.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Update-User-Currency-Preferences-18c7ea735ace81c1b837c022a3d0798a?pvs=4
 */
app.put('/api/user/currency-preferences/:userId', async (req, res) => {
    const { userId } = req.params;
    const { preferred_currency } = req.body;

    if (!preferred_currency) {
        return res.status(400).json({ message: 'preferred_currency is required.' });
    }

    try {
        await conexionOrbet.query(`
            INSERT INTO user_currency_preferences (user_id, preferred_currency)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                preferred_currency = VALUES(preferred_currency),
                updated_at = NOW()
        `, [userId, preferred_currency]);

        res.status(200).json({
            message: 'Currency preferences updated successfully.',
            user_id: userId,
            preferred_currency
        });
    } catch (error) {
        console.error('Error updating currency preferences:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region user balance

/**
 * @api {get} /api/user/balances/:userId Retrieve User Balances
 * @description Fetches the balances of a user that are marked as visible.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { user_id, balances: [...] }
 * @error {404} No visible balances found for this user.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-User-Balances-18c7ea735ace81988a2dcb1d8ca19278?pvs=4
 */
app.get('/api/user/balances/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [balances] = await conexionOrbet.query(`
            SELECT balance_id, currency, balance, last_updated, visibility
            FROM user_balances
            WHERE user_id = ? AND visibility = 'visible'
        `, [userId]);

        if (balances.length === 0) {
            return res.status(404).json({ message: 'No visible balances found for this user.' });
        }

        res.status(200).json({
            user_id: userId,
            balances
        });
    } catch (error) {
        console.error('Error fetching balances:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region user presences

/**
 * @api {get} /user/presence/:userId Retrieve User Presence
 * @description Fetches the online/offline presence status of a user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { userId, status, last_active }
 * @error {404} User not found.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-User-Presence-18c7ea735ace8129a073f312861232d3?pvs=4
 */
app.get('/user/presence/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [result] = await conexionOrbet.query(
            `SELECT status, last_active FROM user_presence WHERE user_id = ?`,
            [userId]
        );

        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ userId, status: result[0].status, last_active: result[0].last_active });
    } catch (error) {
        console.error('Error fetching user presence:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /user/presence Retrieve Multiple Users' Presence
 * @description Fetches the online/offline presence of multiple users.
 *
 * @query {string} userIds - Comma-separated list of user IDs.
 *
 * @success {200} { users: [{ user_id, status, last_active }, ...] }
 * @error {400} userIds query parameter is required.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Multiple-Users-Presence-18c7ea735ace81a284f7d01fd7f0802e?pvs=4
 */
app.get('/user/presence', async (req, res) => {
    const { userIds } = req.query; // Esperar una lista de IDs como: ?userIds=1,2,3

    if (!userIds) {
        return res.status(400).json({ message: 'userIds query parameter is required' });
    }

    const userIdsArray = userIds.split(',').map(Number);

    try {
        const [results] = await conexionOrbet.query(
            `SELECT user_id, status, last_active FROM user_presence WHERE user_id IN (?)`,
            [userIdsArray]
        );

        res.status(200).json({ users: results });
    } catch (error) {
        console.error('Error fetching user presence:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region chat messages

/**
 * @api {delete} /api/chat/messages/:userId Delete User Chat Messages
 * @description Deletes all messages sent or received by a user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { message: "Messages deleted successfully." }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Delete-User-Chat-Messages-18c7ea735ace81f9a32fd5a422dfd721?pvs=4
 */
app.delete('/api/chat/messages/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await conexionOrbet.query(
            'DELETE FROM chat_messages WHERE sender_id = ? OR recipient_id = ?',
            [userId, userId]
        );
        res.status(200).json({ message: 'Messages deleted successfully' });
    } catch (error) {
        console.error('Error deleting messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {put} /api/user/chat-consent/:userId Update Chat Consent Preferences
 * @description Updates a user's preferences related to chat consent.
 *
 * @param {string} userId - The ID of the user (required).
 * @body {Array} preferences - Array of objects [{ key, value }] containing preference settings.
 *
 * @success {200} { message: "Chat consent updated successfully" }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Chat-Consent-Preferences-18c7ea735ace8198a37bc5c6a49a6c22?pvs=4
 */
app.put('/api/user/chat-consent/:userId', async (req, res) => {
    const { userId } = req.params;
    const { preferences } = req.body; // Array de objetos [{ key, value }]

    try {
        const query = `
            INSERT INTO user_preferences (user_id, preference_key, preference_value)
            VALUES ${preferences.map(() => '(?, ?, ?)').join(', ')}
            ON DUPLICATE KEY UPDATE preference_value = VALUES(preference_value)
        `;

        const params = preferences.flatMap(pref => [userId, pref.key, pref.value]);

        // Ejecutar la consulta
        await executeQueryFromPoolAsync(conexionOrbet, query, params);

        res.status(200).json({ message: 'Chat consent updated successfully' });
    } catch (error) {
        console.error('Error updating chat consent:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /api/chat/risk-events Retrieve Chat Risk Events
 * @description Fetches a list of chat-related risk events.
 *
 * @success {200} Array of chat risk events.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Chat-Risk-Events-18c7ea735ace8106855ed33f2db66bd2?pvs=4
 */
app.get('/api/chat/risk-events', async (req, res) => {
    try {
        const [events] = await conexionOrbet.query(`
            SELECT * FROM chat_risk_events
            ORDER BY detected_at DESC
        `);

        res.status(200).json(events);
    } catch (error) {
        console.error('Error fetching risk events:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region User Friends

/**
 * @api {post} /api/friends/send_request Send Friend Request
 * @description Sends a friend request to another user.
 *
 * @body {number} sender_id - The ID of the user sending the request.
 * @body {number} receiver_id - The ID of the user receiving the request.
 *
 * @success {201} { message: "Friend request sent successfully." }
 * @error {400} sender_id and receiver_id are required.
 * @error {400} You cannot send a friend request to yourself.
 * @error {400} Friend request already sent.
 * @error {400} You are already friends.
 * @error {403} You cannot send a friend request to this user.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Send-Friend-Request-18c7ea735ace818e986cd47e1912fc38?pvs=4
 */
app.post('/api/friends/send_request', async (req, res) => {
    const { sender_id, receiver_id } = req.body;

    if (!sender_id || !receiver_id) {
        return res.status(400).json({ message: 'Both sender_id and receiver_id are required.' });
    }

    if (sender_id === receiver_id) {
        return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
    }

    try {
        // Check if they are already friends
        const [existingFriend] = await conexionOrbet.query(`
            SELECT * FROM user_friends 
            WHERE (sender_id = ? AND receiver_id = ? AND status = 'accepted') 
               OR (sender_id = ? AND receiver_id = ? AND status = 'accepted')
        `, [sender_id, receiver_id, receiver_id, sender_id]);

        if (existingFriend.length > 0) {
            return res.status(400).json({ message: 'You are already friends.' });
        }

        const ignoredUsers = await executeQueryFromPoolAsync(conexionOrbet, `
            SELECT ignored_user_id 
            FROM user_ignores 
            WHERE user_id = ?
        `, [receiver_id]);

        // Desencriptar la lista de usuarios ignorados
        const decryptedIgnoredUsers = ignoredUsers.map(user => ({
            ignored_user_id: decrypt(user.ignored_user_id),
        }));

        // Verificar si el usuario ya está en la lista de ignorados
        const alreadyIgnored = decryptedIgnoredUsers.some(
            user => user.ignored_user_id.toString() === sender_id.toString()
        );

        if (alreadyIgnored) {
            return res.status(403).json({ message: 'You cannot send a friend request to this user.' });
        }

        // Check if a request already exists
        const [existingRequest] = await conexionOrbet.query(`
            SELECT * FROM user_friends 
            WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
        `, [sender_id, receiver_id]);

        if (existingRequest.length > 0) {
            return res.status(400).json({ message: 'Friend request already sent.' });
        }

        // Insert the new request
        await conexionOrbet.query(`
            INSERT INTO user_friends (sender_id, receiver_id, status) 
            VALUES (?, ?, 'pending')
        `, [sender_id, receiver_id]);

        // Notify receiver about a friend request
        await notificationsService.notify(sender_id,
            receiver_id,
            'friend_request',
            `User ${sender_id} sent you a friend request.`
        );


        res.status(201).json({ message: 'Friend request sent successfully.' });
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {post} /api/friends/accept_request Accept Friend Request
 * @description Accepts a pending friend request.
 *
 * @body {number} request_id - The ID of the friend request to accept.
 *
 * @success {200} { message: "Friend request accepted successfully." }
 * @error {400} request_id is required.
 * @error {404} Friend request not found or already processed.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Accept-Friend-Request-18c7ea735ace819397ced9d47a786203?pvs=4
 */
app.post('/api/friends/accept_request', async (req, res) => {
    const { request_id } = req.body;

    if (!request_id) {
        return res.status(400).json({ message: 'request_id is required.' });
    }

    try {
        // Update the status to 'accepted'
        const [updateResult] = await conexionOrbet.query(`
            UPDATE user_friends
            SET status = 'accepted', updated_at = NOW()
            WHERE request_id = ? AND status = 'pending'
        `, [request_id]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Friend request not found or already processed.' });
        }

        // Notify the sender
        const [friendRequest] = await conexionOrbet.query(`
            SELECT sender_id, receiver_id 
            FROM user_friends WHERE request_id = ?
        `, [request_id]);

        // Notify sender about the accepted friend request
        await notificationsService.notify(friendRequest[0].receiver_id,
            friendRequest[0].sender_id,
            'friend_request_accepted',
            `User ${friendRequest[0].receiver_id} accepted your friend request.`
        );

        res.status(200).json({ message: 'Friend request accepted successfully.' });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {post} /api/friends/decline_request Decline Friend Request
 * @description Declines a pending friend request.
 *
 * @body {number} request_id - The ID of the friend request to decline.
 *
 * @success {200} { message: "Friend request declined successfully." }
 * @error {400} request_id is required.
 * @error {404} Friend request not found or already processed.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Decline-Friend-Request-18c7ea735ace811896e5d7cf81670a3c?pvs=4
 */
app.post('/api/friends/decline_request', async (req, res) => {
    const { request_id } = req.body;

    if (!request_id) {
        return res.status(400).json({ message: 'request_id is required.' });
    }

    try {
        // Update the status to 'declined'
        const [updateResult] = await conexionOrbet.query(`
            UPDATE user_friends
            SET status = 'declined', updated_at = NOW()
            WHERE request_id = ? AND status = 'pending'
        `, [request_id]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Friend request not found or already processed.' });
        }

        res.status(200).json({ message: 'Friend request declined successfully.' });
    } catch (error) {
        console.error('Error declining friend request:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {get} /api/user/friends/presence/:userId Retrieve Friends' Presence
 * @description Retrieves the online/offline presence status of a user's friends.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { friends: [{ friend_id, name, username, status, last_active }] }
 * @error {404} No friends found.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Friends-Presence-18c7ea735ace8197b0e4ff6582d1b5dc?pvs=4
 */
app.get('/api/user/friends/presence/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Retrieve the list of friends
        const [friends] = await conexionOrbet.query(`
            SELECT f.friend_id, u.name, u.username
            FROM user_friends f
            JOIN users u ON f.friend_id = u.user_id
            WHERE f.user_id = ?
        `, [userId]);

        if (friends.length === 0) {
            return res.status(404).json({ message: 'No friends found.' });
        }

        // Retrieve the presence states of the friends
        const friendIds = friends.map(friend => friend.friend_id);
        const [presenceStates] = await conexionOrbet.query(`
            SELECT user_id, status, last_active
            FROM user_presence
            WHERE user_id IN (?)
        `, [friendIds]);

        // Map friends and their presence states
        const response = friends.map(friend => {
            const presence = presenceStates.find(p => p.user_id === friend.friend_id) || { status: 'offline', last_active: null };
            return {
                friend_id: friend.friend_id,
                name: friend.name,
                username: friend.username,
                status: presence.status,
                last_active: presence.last_active,
            };
        });

        res.status(200).json({ friends: response });
    } catch (error) {
        console.error('Error fetching friends’ presence states:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region notifications API

/**
 * @api {get} /api/notifications/:userId Retrieve User Notifications
 * @description Fetches notifications for a specific user.
 *
 * @param {string} userId - The ID of the user (required).
 *
 * @success {200} { notifications: [{ notification_id, type, message, status, created_at }] }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-User-Notifications-18c7ea735ace818398b6c924ebc3ec60?pvs=4
 */
app.get('/api/notifications/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [notifications] = await conexionOrbet.query(`
            SELECT notification_id, type, message, status, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);

        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {put} /api/notifications/read/:notificationId Mark Notification as Read
 * @description Marks a notification as read.
 *
 * @param {string} notificationId - The ID of the notification to mark as read.
 *
 * @success {200} { message: "Notification marked as read." }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Mark-Notification-as-Read-18c7ea735ace8176b8fcc543965af173?pvs=4
 */
app.put('/api/notifications/read/:notificationId', async (req, res) => {
    const { notificationId } = req.params;

    try {
        await notificationsService.markAsRead(notificationId);
        res.status(200).json({ message: 'Notification marked as read.' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region Invite to game

app.post('/api/friends/invite_to_game', async (req, res) => {
    const { inviter_id, friend_id, game_id } = req.body;

    // Input validation
    if (!inviter_id || !friend_id || !game_id) {
        return res.status(400).json({ message: 'inviter_id, friend_id, and game_id are required.' });
    }

    if (inviter_id === friend_id) {
        return res.status(400).json({ message: 'You cannot invite yourself.' });
    }

    try {

        // // Check if the game session can accommodate extra players
        // const [gameSession] = await conexionOrbet.query(`
        //     SELECT max_players, current_players
        //     FROM game_sessions
        //     WHERE game_id = ?
        // `, [game_id]);

        // if (gameSession.length === 0) {
        //     return res.status(404).json({ message: 'Game session not found.' });
        // }

        // if (gameSession[0].current_players >= gameSession[0].max_players) {
        //     return res.status(403).json({ message: 'The game session is full.' });
        // }

        // Notify receiver about a friend request
        await notificationsService.notify(inviter_id,
            friend_id,
            'game_invitation',
            `User ${inviter_id} has invited you to join game ${game_id}.`,
            { game_id }
        );

        res.status(200).json({
            message: 'Game invitation sent successfully.', notification: {
                inviter_id,
                friend_id,
                type: 'game_invitation',
                message: `User ${inviter_id} has invited you to join game ${game_id}.`,
                info: { game_id }
            }
        });
    } catch (error) {
        console.error('Error sending game invitation:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.post('/api/friends/respond_invitation', async (req, res) => {
    const { inviter_id, friend_id, game_id, response } = req.body;

    // Input validation
    if (!inviter_id || !friend_id || !game_id || !['accepted', 'declined'].includes(response)) {
        return res.status(400).json({ message: 'Invalid input. Please provide inviter_id, friend_id, game_id, and a valid response.' });
    }

    try {
        if (response === 'accepted') {
            // // Join the game session
            // const [gameSession] = await conexionOrbet.query(`
            //     SELECT current_players, max_players
            //     FROM game_sessions
            //     WHERE game_id = ?
            // `, [game_id]);

            // if (gameSession.length === 0 || gameSession[0].current_players >= gameSession[0].max_players) {
            //     return res.status(403).json({ message: 'The game session is full or does not exist.' });
            // }

            // await conexionOrbet.query(`
            //     UPDATE game_sessions
            //     SET current_players = current_players + 1
            //     WHERE game_id = ?
            // `, [game_id]);

            // Notify receiver about a friend request
            await notificationsService.notify(inviter_id,
                friend_id,
                'game_invitation_response',
                `User ${friend_id} accepted your invitation to join game ${game_id}.`,
                { game_id, response }
            );

            return res.status(200).json({ message: 'Invitation accepted. You have joined the game.' });
        }

        // Notify receiver about a friend request
        await notificationsService.notify(inviter_id,
            friend_id,
            'game_invitation_response',
            `User ${friend_id} declined your invitation to join game ${game_id}.`,
            { game_id, response }
        );

        res.status(200).json({ message: 'Invitation declined.' });
    } catch (error) {
        console.error('Error responding to game invitation:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion

//#region Bills affilates

/**
 * @api {post} /api/admin/bills/generate_from_unbilled Generate Bills from Unbilled Balances
 * @description Generates billing records for affiliates with unbilled balances.
 *
 * @body {array} [affiliate_ids] - Optional array of affiliate IDs to generate bills for specific affiliates.
 *
 * @success {201} { message: "Bills generated successfully.", generatedBills: [...] }
 * @error {404} No unbilled affiliates found.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Generate-Bills-from-Unbilled-Balances-18c7ea735ace8187b786cf7c4ec07033?pvs=4
 */
app.post('/api/admin/bills/generate_from_unbilled', async (req, res) => {
    const { affiliate_ids } = req.body; // IDs de afiliados opcionales
    let connection;

    try {
        connection = await conexionOrbet.getConnection();
        await connection.beginTransaction();

        // Filtrar afiliados si se especifican `affiliate_ids`
        const affiliateFilter = affiliate_ids && affiliate_ids.length > 0
            ? `WHERE al.affiliate_id IN (${affiliate_ids.map(() => '?').join(',')})`
            : '';

        // Obtener afiliados con saldo no facturado
        const [affiliates] = await connection.query(
            `
            SELECT al.affiliate_id, al.user_id, 
                   COALESCE(SUM(ab.amount), 0) AS total_billed, 
                   COUNT(ab.bill_id) AS bill_count
            FROM affiliate_links al
            LEFT JOIN affiliate_bills ab ON al.affiliate_id = ab.affiliate_id
            ${affiliateFilter}
            GROUP BY al.affiliate_id, al.user_id
            HAVING total_billed < 1000
            `,
            affiliate_ids || []
        );

        if (affiliates.length === 0) {
            return res.status(404).json({ message: 'No unbilled affiliates found.' });
        }

        // Crear facturas para los afiliados seleccionados
        const generatedBills = [];
        for (const affiliate of affiliates) {
            const billAmount = 1000 - affiliate.total_billed;

            await connection.query(
                `INSERT INTO affiliate_bills (affiliate_id, user_id, amount, generated_at, status)
                 VALUES (?, ?, ?, NOW(), 'pending')`,
                [affiliate.affiliate_id, affiliate.user_id, billAmount]
            );

            generatedBills.push({
                affiliate_id: affiliate.affiliate_id,
                user_id: affiliate.user_id,
                amount: billAmount,
            });

            // Registrar la acción en `billing_audit`
            await connection.query(
                `INSERT INTO billing_audit (affiliate_id, user_id, action, timestamp, details)
                 VALUES (?, ?, 'generated', NOW(), ?)`,
                [
                    affiliate.affiliate_id,
                    affiliate.user_id,
                    `Generated bill for $${billAmount.toFixed(2)}.`,
                ]
            );
        }

        await connection.commit();
        res.status(201).json({
            message: 'Bills generated successfully.',
            generatedBills,
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error generating bills:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * @api {post} /api/admin/bills/generate_from_unbilled_affiliate Generate Bill for Specific Affiliate
 * @description Generates a billing record for a single affiliate based on their unbilled balance.
 *
 * @body {number} affiliate_id - The ID of the affiliate to generate the bill for.
 *
 * @success {201} { message: "Bill generated successfully.", amount: unbilledBalance }
 * @error {400} No unbilled balance available.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Generate-Bill-for-Specific-Affiliate-18c7ea735ace814cac23dac9c11e7051?pvs=4
 */
app.post('/api/admin/bills/generate_from_unbilled_affiliate', async (req, res) => {
    const { affiliate_id } = req.body;

    try {
        const [result] = await conexionOrbet.query(`
            SELECT unbilled_balance FROM affiliate_links WHERE affiliate_id = ?
        `, [affiliate_id]);

        const unbilledBalance = result[0]?.unbilled_balance || 0;

        if (unbilledBalance <= 0) {
            return res.status(400).json({ message: 'No unbilled balance available.' });
        }

        // Crear factura
        await conexionOrbet.query(`
            INSERT INTO affiliate_bills (affiliate_id, amount, generated_at, status)
            VALUES (?, ?, NOW(), 'pending')
        `, [affiliate_id, unbilledBalance]);

        // Resetear el balance no facturado
        await conexionOrbet.query(`
            UPDATE affiliate_links SET unbilled_balance = 0 WHERE affiliate_id = ?
        `, [affiliate_id]);

        return res.status(201).json({ message: 'Bill generated successfully.', amount: unbilledBalance });
    } catch (error) {
        console.error('Error generating manual bill:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {get} /api/admin/bills/:affiliate_id Retrieve Affiliate Bills
 * @description Fetches all bills for a specific affiliate.
 *
 * @param {number} affiliate_id - The ID of the affiliate.
 *
 * @success {200} { bills: [...] }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Affiliate-Bills-18c7ea735ace81e4b1d4fd57abdf4463?pvs=4
 */
app.get('/api/admin/bills/:affiliate_id', async (req, res) => {
    const { affiliate_id } = req.params;

    try {
        const [bills] = await conexionOrbet.query(`
            SELECT * FROM affiliate_bills
            WHERE affiliate_id = ?
        `, [affiliate_id]);

        res.status(200).json({ bills });
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @api {get} /api/admin/affiliates/not_billed Retrieve Affiliates with Unbilled Balances
 * @description Fetches affiliates with remaining unbilled balances.
 *
 * @query {string} [start_date] - Optional start date filter.
 * @query {string} [end_date] - Optional end date filter.
 * @query {number} [affiliate_id] - Optional affiliate ID filter.
 *
 * @success {200} { message: "Affiliates with unbilled balance retrieved successfully.", affiliates: [...] }
 * @error {404} No affiliates with unbilled balance found.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Affiliates-with-Unbilled-Balances-18c7ea735ace8154bd17d62139487773?pvs=4
 */
app.get('/api/admin/affiliates/not_billed', async (req, res) => {
    const { start_date, end_date, affiliate_id } = req.query;

    try {
        // Construir el filtro opcional para fechas y afiliados
        let filters = '';
        const params = [];

        if (start_date) {
            filters += ' AND ab.generated_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            filters += ' AND ab.generated_at <= ?';
            params.push(end_date);
        }

        if (affiliate_id) {
            filters += ' AND al.affiliate_id = ?';
            params.push(affiliate_id);
        }

        // Consulta para obtener afiliados con saldo no facturado
        const [results] = await conexionOrbet.query(
            `
            SELECT 
                al.affiliate_id,
                al.user_id,
                COALESCE(SUM(ab.amount), 0) AS total_billed,
                COUNT(ab.bill_id) AS bill_count,
                (1000 - COALESCE(SUM(ab.amount), 0)) AS unbilled_balance
            FROM affiliate_links al
            LEFT JOIN affiliate_bills ab ON al.affiliate_id = ab.affiliate_id
            WHERE al.status = 'active' ${filters}
            GROUP BY al.affiliate_id, al.user_id
            HAVING unbilled_balance > 0
            `
            , params
        );

        if (results.length === 0) {
            return res.status(404).json({ message: 'No affiliates with unbilled balance found.' });
        }

        // Devolver la respuesta en formato JSON
        res.status(200).json({
            message: 'Affiliates with unbilled balance retrieved successfully.',
            affiliates: results.map((row) => ({
                affiliate_id: row.affiliate_id,
                user_id: row.user_id,
                total_billed: row.total_billed,
                unbilled_balance: row.unbilled_balance,
                bill_count: row.bill_count,
            })),
        });
    } catch (error) {
        console.error('Error fetching unbilled affiliates:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

async function calculateUnbilledBalances() {
    try {
        // Obtener estadísticas de afiliados y facturas generadas
        const [results] = await conexionOrbet.query(`
            SELECT 
                af.affiliate_id,
                af.user_id,
                COALESCE(SUM(ab.amount), 0) AS total_billed,
                COALESCE(asub.total_earnings, 0) AS total_earned
            FROM affiliate_links af
            LEFT JOIN affiliate_bills ab 
                ON af.affiliate_id = ab.affiliate_id
            LEFT JOIN (
                SELECT user_id, SUM(total_earnings) AS total_earnings
                FROM affiliate_statistics
                GROUP BY user_id
            ) as asub ON asub.user_id = af.user_id
            WHERE af.status = 'active'
            GROUP BY af.affiliate_id, af.user_id, asub.total_earnings
        `);

        // Actualizar `unbilled_balance` en `affiliate_links`
        for (const affiliate of results) {
            const unbilledBalance = affiliate.total_earned - affiliate.total_billed;

            await conexionOrbet.query(`
                UPDATE affiliate_links
                SET unbilled_balance = ?
                WHERE affiliate_id = ?
            `, [unbilledBalance, affiliate.affiliate_id]);
        }

        console.log('Unbilled balances updated successfully.');
    } catch (error) {
        console.error('Error updating unbilled balances:', error);
    }
}

async function updateUnbilledBalance(affiliate_id, amount) {
    try {
        await conexionOrbet.query(`
            UPDATE affiliate_links
            SET unbilled_balance = unbilled_balance + ?
            WHERE affiliate_id = ?
        `, [amount, affiliate_id]);

        console.log(`Updated unbilled balance for affiliate ${affiliate_id}`);
    } catch (error) {
        console.error('Error updating unbilled balance:', error);
    }
}

const BILL_THRESHOLD = 500; // Facturar automáticamente si supera $500

async function checkAndGenerateBill(affiliate_id) {
    try {
        const [result] = await conexionOrbet.query(`
            SELECT unbilled_balance FROM affiliate_links WHERE affiliate_id = ?
        `, [affiliate_id]);

        const unbilledBalance = result[0]?.unbilled_balance || 0;

        if (unbilledBalance >= BILL_THRESHOLD) {
            console.log(`Generating auto-bill for affiliate ${affiliate_id}`);

            await conexionOrbet.query(`
                INSERT INTO affiliate_bills (affiliate_id, amount, generated_at, status)
                VALUES (?, ?, NOW(), 'pending')
            `, [affiliate_id, unbilledBalance]);

            // Resetear balance no facturado
            await conexionOrbet.query(`
                UPDATE affiliate_links SET unbilled_balance = 0 WHERE affiliate_id = ?
            `, [affiliate_id]);

            console.log(`Auto-bill created for ${affiliate_id} with amount ${unbilledBalance}`);
        }
    } catch (error) {
        console.error('Error generating auto-bill:', error);
    }
}

//#region Test functions

//await updateUnbilledBalance(affiliate_id, commission_amount);
//await checkAndGenerateBill(affiliate_id);

//updateUnbilledBalance(14, 250.00); // Suma $250 al afiliado 14
//updateUnbilledBalance(15, 100.00); // Suma $100 al afiliado 15
//updateUnbilledBalance(16, 50.00);  // Suma $50 al afiliado 16

//checkAndGenerateBill(14);
//checkAndGenerateBill(15);
//checkAndGenerateBill(16);

//#endregion

/**
 * @api {post} /api/admin/affiliates/calculate_unbilled Calculate Unbilled Balances
 * @description Calculates and updates the unbilled balances for affiliates.
 *
 * @success {200} { message: "Unbilled balances updated successfully." }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Calculate-Unbilled-Balances-ONLY-TEST-18c7ea735ace8179827dcd9e723cf97d?pvs=4
 */
app.post('/api/admin/affiliates/calculate_unbilled', async (req, res) => {
    try {
        await calculateUnbilledBalances();
        res.status(200).json({ message: 'Unbilled balances updated successfully.' });
    } catch (error) {
        console.error('Error calculating unbilled balances:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * @api {get} /api/admin/affiliate_commissions Retrieve Affiliate Commissions
 * @description Fetches affiliate commission records with optional filters.
 *
 * @query {number} [affiliate_id] - Optional affiliate ID filter.
 * @query {string} [start_date] - Optional start date filter.
 * @query {string} [end_date] - Optional end date filter.
 *
 * @success {200} { success: true, commissions: [...] }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Affiliate-Commissions-ONLY-TEST-18c7ea735ace816d8cb0c0165472de62?pvs=4
 */
app.get('/api/admin/affiliate_commissions', async (req, res) => {
    const { affiliate_id, start_date, end_date } = req.query;

    let query = `SELECT * FROM affiliate_commissions WHERE 1=1`; // where is for adding conditions or filters
    const params = [];

    if (affiliate_id) {
        query += ` AND affiliate_id = ?`;
        params.push(affiliate_id);
    }

    if (start_date) {
        query += ` AND created_at >= ?`;
        params.push(start_date);
    }

    if (end_date) {
        query += ` AND created_at <= ?`;
        params.push(end_date);
    }

    try {
        const [results] = await conexionOrbet.query(query, params);
        res.status(200).json({ success: true, commissions: results });
    } catch (error) {
        console.error('Error fetching commissions:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * @api {put} /api/admin/affiliate_commissions/:commission_id Update Affiliate Commission
 * @description Updates the status or amount of an affiliate commission.
 *
 * @param {number} commission_id - The ID of the commission to update.
 * @body {string} status - New status ('pending', 'approved', 'adjusted').
 * @body {number} [amount] - Optional new commission amount.
 *
 * @success {200} { message: "Commission updated successfully." }
 * @error {400} Invalid status value.
 * @error {404} Commission not found.
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Update-Affiliate-Commission-18c7ea735ace81bd8444d6435a47521a?pvs=4
 */
app.put('/api/admin/affiliate_commissions/:commission_id', async (req, res) => {
    const { commission_id } = req.params;
    const { status, amount } = req.body;

    if (!['pending', 'approved', 'adjusted'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        const [existingCommission] = await conexionOrbet.query(
            `SELECT * FROM affiliate_commissions WHERE commission_id = ?`,
            [commission_id]
        );

        if (existingCommission.length === 0) {
            return res.status(404).json({ message: 'Commission not found' });
        }

        await conexionOrbet.query(
            `UPDATE affiliate_commissions SET status = ?, amount = ?, updated_at = NOW() WHERE commission_id = ?`,
            [status, amount || existingCommission[0].amount, commission_id]
        );

        res.status(200).json({ message: 'Commission updated successfully' });
    } catch (error) {
        console.error('Error updating commission:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

async function calculateAffiliateCommissions(period = 'daily') {
    try {
        console.log(`Calculating ${period} affiliate commissions...`);

        // Obtener la lista de afiliados con sus referidos y apuestas
        const [affiliates] = await conexionOrbet.query(`
            SELECT 
                af.affiliate_id,
                af.user_id,
                stats.total_wagered,
                stats.total_earnings,
                stats.last_commissioned_at,
                COALESCE(ac.commission_type, 'rev_share') AS commission_type
            FROM affiliate_links af
            JOIN affiliate_statistics stats ON af.user_id = stats.user_id
            LEFT JOIN affiliate_commissions ac ON af.affiliate_id = ac.affiliate_id
            WHERE af.status = 'active'
        `);

        if (affiliates.length === 0) {
            console.log(`No affiliates found for ${period} period.`);
            return;
        }

        const commissionRecords = [];

        for (const affiliate of affiliates) {
            let commissionAmount = 0;

            // Prevenir cálculo repetido: Solo calcular si no se ha hecho en este periodo
            const lastCommissioned = affiliate.last_commissioned_at ? new Date(affiliate.last_commissioned_at) : null;
            const today = new Date();

            if (lastCommissioned && lastCommissioned.toDateString() === today.toDateString()) {
                console.log(`Skipping user ${affiliate.user_id}, already commissioned today.`);
                continue; // Saltar este usuario si ya se calculó hoy
            }

            if (affiliate.commission_type === 'rev_share') {
                // Rev Share: Aplicar el 20% de las ganancias generadas como ejemplo
                const revenueSharePercentage = 20;
                commissionAmount = (affiliate.total_earnings * revenueSharePercentage) / 100;
            } else if (affiliate.commission_type === 'cpa') {
                // CPA: Contar referidos que aún no han sido contabilizados
                const [referredUsers] = await conexionOrbet.query(`
                    SELECT COUNT(*) AS referred_count
                    FROM referrals
                    WHERE user_id = ? AND created_at > COALESCE(?, '2000-01-01');
                `, [affiliate.user_id, lastCommissioned]);

                const cpaFixedAmount = 100; // Ejemplo de CPA fijo por usuario referido
                commissionAmount = referredUsers[0].referred_count * cpaFixedAmount;
            }

            // Agregar comisión solo si es mayor a 0
            if (commissionAmount > 0) {
                commissionRecords.push([
                    affiliate.affiliate_id,
                    affiliate.user_id,
                    commissionAmount,
                    affiliate.commission_type,
                    'pending',  // Estado inicial
                    new Date(), // created_at
                    new Date()  // updated_at
                ]);
            }
        }

        // Insertar las comisiones en la base de datos
        if (commissionRecords.length > 0) {
            await conexionOrbet.query(`
                INSERT INTO affiliate_commissions (affiliate_id, user_id, amount, commission_type, status, created_at, updated_at)
                VALUES ?
            `, [commissionRecords]);

            console.log(`Inserted ${commissionRecords.length} new affiliate commissions.`);

            // **Actualizar la fecha de la última comisión para cada afiliado**
            await conexionOrbet.query(`
                UPDATE affiliate_statistics 
                SET last_commissioned_at = NOW()
                WHERE user_id IN (${commissionRecords.map(c => c[1]).join(",")});
            `);
        } else {
            console.log("No commissions to insert.");
        }
    } catch (error) {
        console.error("Error calculating affiliate commissions:", error);
    }
}

/**
 * @api {post} /api/admin/affiliate_commissions/calculate Calculate Affiliate Commissions
 * @description Triggers commission calculation for affiliates.
 *
 * @success {200} { message: "Commissions calculated successfully." }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Calculate-Affiliate-Commissions-18c7ea735ace817498fac7d3372a2a4d?pvs=4
 */
app.post('/api/admin/affiliate_commissions/calculate', async (req, res) => {
    try {
        await calculateAffiliateCommissions('daily');
        res.status(200).json({ message: 'Commissions calculated successfully' });
    } catch (error) {
        console.error('Error calculating commissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//#endregion

//#region user Dormant

async function reactivateUser(userId, reason) {
    try {
        // Verificar si el usuario está inactivo o marcado como dormido
        const [user] = await conexionOrbet.query(`
            SELECT status FROM users WHERE user_id = ? LIMIT 1
        `, [userId]);

        if (!user || user.length === 0) {
            console.log(`User ${userId} not found.`);
            return;
        }

        if (user[0].status !== 'inactive') {
            console.log(`User ${userId} is already active.`);
            return;
        }

        // Actualizar el estado del usuario a activo
        await conexionOrbet.query(`
            UPDATE users SET status = 'active', updated_at = NOW() WHERE user_id = ?
        `, [userId]);

        // Registrar la reactivación en la base de datos
        await conexionOrbet.query(`
            INSERT INTO user_reactivations (user_id, reactivated_at, reason)
            VALUES (?, NOW(), ?)
        `, [userId, reason]);

        console.log(`User ${userId} reactivated due to ${reason}.`);
    } catch (error) {
        console.error("Error reactivating user:", error);
    }
}

async function markDormantUsers(inactiveMonths = 12) {
    try {
        const thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - inactiveMonths);

        await conexionOrbet.query(`
            UPDATE users 
            SET status = 'inactive', dormant_since = NOW()
            WHERE last_login < ? AND status != 'inactive'
        `, [thresholdDate]);

        console.log(`Marked users inactive for ${inactiveMonths} months as dormant.`);
    } catch (error) {
        console.error("Error marking dormant users:", error);
    }
}

/**
 * @api {get} /api/admin/dormant_players Retrieve Dormant Players
 * @description Fetches users flagged as inactive.
 *
 * @query {number} [inactive_for] - Optional inactivity period in months.
 * @query {string} [country] - Optional country filter.
 *
 * @success {200} { success: true, count: number, dormant_players: [...] }
 * @error {500} Internal server error.
 *
 * @status Documented ✅
 * @notion https://www.notion.so/Retrieve-Dormant-Players-18c7ea735ace8132997fe2e6517d6774?pvs=4
 */
app.get('/api/admin/dormant_players', async (req, res) => {
    const { inactive_for, country } = req.query;

    let query = `
        SELECT user_id, name, email, country, last_login, status
        FROM users
        WHERE status = 'inactive'
    `;
    const params = [];

    if (inactive_for) {
        const thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - parseInt(inactive_for));
        query += ` AND last_login < ?`;
        params.push(thresholdDate);
    }

    if (country) {
        query += ` AND country = ?`;
        params.push(country);
    }

    try {
        const [results] = await conexionOrbet.query(query, params);

        res.status(200).json({
            success: true,
            count: results.length,
            dormant_players: results
        });
    } catch (error) {
        console.error("Error fetching dormant players:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

//#endregion

// CRUD de Tareas
app.post('/tasks', authenticate, (req, res) => {
    const { title, description } = req.body;
    db.query('INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)', [req.user.id, title, description], (err) => {
      if (err) return res.status(500).send(err);
      res.send({ message: 'Task created' });
    });
  });
  
  app.get('/tasks', authenticate, (req, res) => {
    db.query('SELECT * FROM tasks WHERE user_id = ?', [req.user.id], (err, results) => {
      if (err) return res.status(500).send(err);
      res.send(results);
    });
  });
  
  app.put('/tasks/:id', authenticate, (req, res) => {
    const { title, description } = req.body;
    db.query('UPDATE tasks SET title = ?, description = ? WHERE id = ? AND user_id = ?', [title, description, req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).send(err);
      res.send({ message: 'Task updated' });
    });
  });
  
  app.delete('/tasks/:id', authenticate, (req, res) => {
    db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).send(err);
      res.send({ message: 'Task deleted' });
    });
  });
  
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });

app.post('/api/friends/decline_request', async (req, res) => {
    const { request_id } = req.body;

    if (!request_id) {
        return res.status(400).json({ message: 'request_id is required.' });
    }

    try {
        // Update the status to 'declined'
        const [updateResult] = await conexionOrbet.query(`
            UPDATE user_friends
            SET status = 'declined', updated_at = NOW()
            WHERE request_id = ? AND status = 'pending'
        `, [request_id]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Friend request not found or already processed.' });
        }

        res.status(200).json({ message: 'Friend request declined successfully.' });
    } catch (error) {
        console.error('Error declining friend request:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

//#endregion API

//#region cron jobs

cron.schedule('0 0 * * *', async () => {
    console.log('Running daily dormant user check...');
    await markDormantUsers(1);
});

// Ejecutar cálculo de comisiones todos los días a la medianoche
cron.schedule('0 0 * * *', async () => {
    console.log('Daily affiliate commissions calculated.');
    await calculateAffiliateCommissions('daily');
});

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily unbilled balance update...');
    await calculateUnbilledBalances();
});

//#endregion

//#region Security Documentation

/**
 * @security {middleware} authenticateToken
 * @description Validates JWT tokens to authenticate user access.
 *
 * @security {middleware} authorizeRole
 * @description Restricts API access based on user roles (admin, affiliate, user).
 *
 * @encryption AES-256-CBC Encryption
 * @description Encrypts sensitive affiliate data (e.g., referral codes).
 *
 * @database Limited Access Roles
 * @description Separate DB users for read-only and admin operations.
 *
 * @logging Admin Action Logging
 * @description Logs sensitive actions in the admin_logs table for auditing.
 *
 * @status Documented ✅
 * @notion [Add Notion link here]
 */

//#endregion