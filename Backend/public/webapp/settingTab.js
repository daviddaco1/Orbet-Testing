let providerLinking = "";
let popupWindow  = null;

function makeCallbacks() {

    $("#googleLink").on("click", function (e) {
        if (popupWindow && !popupWindow.closed) {
            alert("Ya hay una ventana de inicio de sesión abierta.");
            return;
        }

        if ($("#Google").is(':checked')) {
            return;
        }

        const token = localStorage.getItem("authToken");

        let hostName = window.location.protocol + '//' + window.location.hostname;
        if (hostName.includes("127.0.0")) hostName += ":3004";
        if (hostName.includes("localhost")) hostName += ":3004";

        const linkApi = hostName + "/link/google/" + token + "/";
        popupWindow = popup(linkApi, "Login Popup", 360, 637);
        providerLinking = "Google";

        alert("you are triying add google link!");
        checkStatusPopUp();
    });

    $("#fbLink").on("click", function (e) {

        if (popupWindow && !popupWindow.closed) {
            alert("Ya hay una ventana de inicio de sesión abierta.");
            return;
        }

        if ($("#Facebook").is(':checked')) {
            return;
        }

        const token = localStorage.getItem("authToken");

        let hostName = window.location.protocol + '//' + window.location.hostname;
        if (hostName.includes("127.0.0")) hostName += ":3004";
        if (hostName.includes("localhost")) hostName += ":3004";

        const linkApi = hostName + "/link/facebook/" + token + "/";

        alert("going to: " + linkApi);

        popupWindow = popup(linkApi, "Login Popup", 360, 637);
        providerLinking = "Facebook";

        //alert("you are triying add google link!");
        checkStatusPopUp();
    });

    $("#twitchLink").on("click", function (e) {

        if (popupWindow && !popupWindow.closed) {
            alert("Ya hay una ventana de inicio de sesión abierta.");
            return;
        }

        if ($("#Twitch").is(':checked')) {
            return;
        }

        const token = localStorage.getItem("authToken");

        let hostName = window.location.protocol + '//' + window.location.hostname;
        if (hostName.includes("127.0.0")) hostName += ":3004";
        if (hostName.includes("localhost")) hostName += ":3004";

        const linkApi = hostName + "/link/twitch/" + token + "/";
        popupWindow = popup(linkApi, "Login Popup", 360, 637);

        providerLinking = "Twitch";

        alert("you are triying add google link!");
        checkStatusPopUp();
    });

}

function checkStatusPopUp(){
    // Comprobar periódicamente si la ventana está cerrada
    const interval = setInterval(() => {
        if (popupWindow.closed) {
            clearInterval(interval);
            popupWindow = null; // Resetear la variable para permitir otra ventana
            alert("La ventana de inicio de sesión se cerró.");
        }
    }, 500);  // Revisa cada medio segundo
}

function getLinkedData() {
    const token = localStorage.getItem("authToken");

    let hostName = window.location.protocol + '//' + window.location.hostname;
    if (hostName.includes("127.0.0")) hostName += ":3004";
    if (hostName.includes("localhost")) hostName += ":3004";

    const linkApi = `${hostName}/settings/getlinkeds/${token}/`;

    // Realiza la consulta GET usando jQuery
    $.get(linkApi, function(response) {
        //console.log("Linked accounts data:", response);
        if (response.status) {
            // Si es exitoso, puedes renderizar los datos como sea necesario
            renderLinkedAccounts(response.elementos);
        } else {
            console.error("Error retrieving linked accounts:", response.message);
        }
    }).fail(function(error) {
        console.error("Failed to fetch linked accounts:", error);

        if(error.responseText.includes("session expired")){
            gotoLogout();
        }
    });
}

function getStatusVerification(){
    const token = localStorage.getItem("authToken");

    let hostName = window.location.protocol + '//' + window.location.hostname;
    if (hostName.includes("127.0.0")) hostName += ":3004";
    if (hostName.includes("localhost")) hostName += ":3004";

    const linkApi = `${hostName}/api/settings/verifyStatus/${token}/`;

    // Realiza la consulta GET usando jQuery
    $.get(linkApi, function(response) {
        //console.log("Linked accounts data:", response);
        if (response.status) {
            // Si es exitoso, puedes renderizar los datos como sea necesario
            isVerifyData(response.emailStatus, response.kycStatus, response.kycleveltwo);

            console.log("status getted!");

        } else {
            console.log("status getted! without verification!");

            console.error("Error retrieving linked accounts:", response.message);
        }

        if(response.email)  $("#emailVerification").val(response.email);
        else $("#emailVerification").val("");

        console.log("Email: " , response.email);
    }).fail(function(error) {
        console.error("Failed to fetch status verification:", error);
        if(error.responseText.includes("session expired")){
            gotoLogout();
        }
    });
}

function RequestVerifyEmail(){
    if($("#emailVerificationCheck").prop('checked')){
        alert("your account is already verified");
        return;
    }

    alert("requesting a verification for your email");

    const token = localStorage.getItem("authToken");

    let hostName = window.location.protocol + '//' + window.location.hostname;
    if (hostName.includes("127.0.0")) hostName += ":3004";
    if (hostName.includes("localhost")) hostName += ":3004";

    const linkApi = `${hostName}/api/settings/verifyEmail/${token}/`;
    
    // Realiza la consulta GET usando jQuery
    $.get(linkApi, function(response) {
        //console.log("Linked accounts data:", response);
        if (response.status) {
            //mostrar el modal de solicitud creada!
            alert("request maked success");
        } else {
            alert("Fail when trying request a code");
            console.log("status getted! without verification!");
            console.error("Error retrieving linked accounts:", response.message);
        }
    }).fail(function(error) {
        console.error("Failed to fetch status verification:", error);
        if(error.responseText.includes("session expired")){
            gotoLogout();
        }
    });
}

function gotoLogout(){
    alert("your session has expired");
    window.location.href = "../logout";
}

function requestListSessions(){
    const token = localStorage.getItem("authToken");

    let hostName = window.location.protocol + '//' + window.location.hostname;
    if (hostName.includes("127.0.0")) hostName += ":3004";
    if (hostName.includes("localhost")) hostName += ":3004";

    const linkApi = `${hostName}/api/sessions/user/${token}/`;

    // Realiza la consulta GET usando jQuery
    $.get(linkApi, function(response) {
        //console.log("Linked accounts data:", response);
        if (response.status) {
            // Si es exitoso, puedes renderizar los datos como sea necesario
            fillSessionList(response.sessions);
            console.log("status getted!");
        } else {
            console.log("the session cannot getted");
            fillSessionList([]);
            console.error("Error retrieving session list:", response.message);
        }
    }).fail(function(error) {
        console.error("Failed to fetch sessions list:", error);

        if(error.responseText.includes("session expired")){
            gotoLogout();
        }
    });
}

// Función para llenar la lista de sesiones
function fillSessionList(sesiones) {
    // Ordenar las sesiones por la última actividad (last_activity) en orden descendente
    sesiones.sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));

    // Crear el HTML para las filas de la tabla
    const rowsHtml = sesiones.map((session) => {
        // Determinar el estado de la sesión
        const sessionStatus = session.expired ? "Offline" : "Online";
        const isCurrentSession = session.isCurrent ? "Current Session" : "";

        // Crear el contenido del agente y plataforma
        const agentInfo = `<em class="icon-${session.agent.toLowerCase()}"></em> ${session.agent}`;

        return `
            <tr>
                <td><span>${agentInfo}</span></td>
                <td>${session.location || "Unknown"}</td>
                <td>${session.ip}</td>
                <td>${sessionStatus}</td>
                <td>${isCurrentSession}</td>
            </tr>
        `;
    }).join("");

    // Insertar las filas en la tabla
    $("#sessionsList").html(rowsHtml);
}


//funcion temporal para mostrar si ha sido verificada o no
function isVerifyData(emailStatus, dataUser, kycStatus){
    console.log("verify status: ", {
        email: emailStatus,
        kyc1: dataUser,
        kyc2: kycStatus
    });

    $("#emailVerificationCheck").prop('checked', emailStatus);
    $("#KYC-Checkbox").prop('checked', dataUser);
    $("#kyc-2-checkbox").prop('checked', kycStatus);

    $("#emailVerificationCheck").prop('disabled', emailStatus);
    $("#emailVerificationCheck").prop('KYC-Checkbox', dataUser);
    $("#emailVerificationCheck").prop('kyc-2-checkbox', kycStatus);
    
    if(emailStatus){
        $("#verifyEmailBtn").addClass('disableClick');
        $("#email_status").attr("class", "completeTag");
        $("#email_status").text("Completed");
    }
        
    if(kycStatus){
        $("#verifykycBtn").addClass('disableClick');
        $("#kyc2lvl_status").attr("class", "completeTag");
        $("#kyc2lvl_status").text("Completed");
    }
}

// Función de ejemplo para renderizar las cuentas vinculadas
function renderLinkedAccounts(accounts) {
    accounts.forEach(linked => {
        let provider = linked.name;
        
        // Capitalizar la primera letra de provider
        provider = provider.charAt(0).toUpperCase() + provider.slice(1);

        // Buscar el checkbox correspondiente y marcarlo
        $(`input#${provider}`).prop('checked', true);
    });
}

function requestTokenForKYC(){

    if($("#kyc-2-checkbox").prop('checked')){
        alert("your account is already verified");
        return;
    }

    const token = localStorage.getItem("authToken");

    let hostName = window.location.protocol + '//' + window.location.hostname;
    if (hostName.includes("127.0.0")) hostName += ":3004";
    if (hostName.includes("localhost")) hostName += ":3004";

    const linkApi = `${hostName}/api/kyc/create/${token}/`;

    // Realiza la consulta GET usando jQuery
    $.get(linkApi, function(response) {
        //console.log("Linked accounts data:", response);
        if (response.status) {
            popup(response.urlKyc, "KYC verification", 360, 637);
        } else {
           alert("something fail on verification KYC");
        }
    }).fail(function(error) {
        console.error("Failed to fetch sessions list:", error);

        if(error.responseText.includes("session expired")){
            gotoLogout();
        }
    });
}

getLinkedData();
getStatusVerification();
requestListSessions();
makeCallbacks();

function onFinishLink(status, data) {
    $(`input#${providerLinking}`).prop('checked', status);
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