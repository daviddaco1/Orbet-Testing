const loginBtn = document.getElementById("loginBtn");
const loginBtns = $(".btn-social-login");
let isLogging = false;

if (loginBtn) {
    loginBtn.addEventListener("click", async (event) => {
        if (isLogging) return;

        isLogging = true;

        const username = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

        if (!emailPattern.test(username)) {
            showToast("Please enter a valid email", "error");
            //$.notify("Please enter a valid email", "error");
            isLogging = false;
            return;
        }

        if (password.length == 0) {
            showToast("Please enter a password", "error");
            isLogging = false;
            return;
        }

        showToast("Starting session", "success");
        //event.preventDefault();

        setTimeout(async () => {
            // Obtener valores de los campos de usuario y contraseña


            // Generar el hash SHA-512 de la contraseña
            const hashedPassword = await hashPassword(password);
            const apiUrl = window.location.protocol + '//' + window.location.hostname + "/auth/email/";

            //send a post to apiurl

            //popup("")

            // Emitir el evento 'login' al servidor con los datos de inicio de sesión
            socket.emit("loginUser", { "email": username, "pass": hashedPassword});
            console.log("starting login");
        }, 1000);
    });
}

if(loginBtns){
    loginBtns.each(function() {
        $(this).on("click", function(e){

            e.preventDefault();

            //alert("you are trying login with social media");

            let hostName = window.location.protocol + '//' + window.location.hostname;
            if(hostName.includes("127.0.0")) hostName += ":3004";
            if(hostName.includes("localhost")) hostName += ":3004";

            const linkApi = hostName + "/auth/" + $(this).attr("data-login");
            console.log("api link: " + linkApi);

            popup(linkApi, "Login Popup", 360, 637);
        });
    });
}

function popup(url, title, width, height) {
    var left = (screen.width / 2) - (width / 2);
    var top = (screen.height / 2) - (height / 2);
    var options = '';    
    options += ',width=' + width;
    options += ',height=' + height;
    options += ',top=' + top;
    options += ',left=' + left;    
    return window.open(url, title, options);
}

function redirectToDashboard(){
    alert("success login");
    window.location.href = "/webapp/index.html"; // Redirige al dashboard por defecto
}

function showToast(msg, color){

    $.notify(msg, color);
    return;

    $("#alertData").html(msg);
    $("#alertData").attr("class", "alert alert-" + color);

    setTimeout(() => {
        $("#alertData").fadeOut("slow");
    }, 2000);
}

// Escuchar el evento de éxito de inicio de sesión
socket.on("loginSuccess", (data) => {
    const { token } = data;

    if (token) {
        localStorage.setItem("authToken", token); // Guardar el token en localStorage
        console.log("Usuario autenticado");
        window.open("dashboard", "_self");
    } else {
        $.notify("has ocurred a internal error, try again", "error");
    }

    isLogging = false;
});

// Escuchar el evento de error de inicio de sesión
socket.on("loginError", (data) => {
    $.notify(data.message, "error");
    isLogging = false;
});

// Función para generar el hash SHA-512
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}