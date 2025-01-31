const signUpbtn = document.getElementById("registerBtn");
let isLogging = false;

if (signUpbtn) {
    signUpbtn.addEventListener("click", async (event) => {
        if (isLogging) return;

        isLogging = true;
        const password = document.getElementById("password").value;
        const username = document.getElementById("usernameInput").value;
        const email = document.getElementById("InputEmail").value;

        const password2 = document.getElementById("inputPassword2").value;
        
        const InputName = document.getElementById("InputName").value;
        

        if (username.length == 0) {
            $.notify("Please enter a username", "error");
            isLogging = false;
            return;
        }

        if (InputName.length < 2) {
            $.notify("Please enter your full name", "error");
            isLogging = false;
            return;
        }

        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

        if (!emailPattern.test(email)) {
            $.notify("Please enter a valid email", "error");
            isLogging = false;
            return;
        }

        if (password.length < 2) {
            $.notify("Please enter a password", "error");
            isLogging = false;
            return;
        }

        if (password2.length < 2) {
            $.notify("Please enter again your password", "error");
            isLogging = false;
            return;
        }


        if (password != password2) {
            $.notify("password not match", "error");
            isLogging = false;
            return;
        }

        $.notify("Registering user", "success");
        //event.preventDefault();

        setTimeout(async () => {
            // Obtener valores de los campos de usuario y contraseña

            // Generar el hash SHA-512 de la contraseña
            const hashedPassword = await hashPassword(password);

            // Emitir el evento 'login' al servidor con los datos de inicio de sesión
            socket.emit("registerUser", { "email": email, "username": username, "inputName": InputName, "pass": hashedPassword });
            console.log("starting register");
        }, 1000);
    });
}

// Función para generar el hash SHA-512
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Escuchar el evento de error de registro
socket.on("registerError", (data) => {
    $.notify(data.message, "error");
    isLogging = false;
});

// Escuchar el evento de éxito de registro
socket.on("registerSuccess", (data) => {
    const { token } = data;

    if (token) {
        localStorage.setItem("authToken", token); // Guardar el token en localStorage
        console.log("Usuario autenticado, token guardado");
        window.open("dashboard", "_self");
    } else {
        $.notify("has ocurred a internal error, try again", "error");
    }

    isLogging = false;
});