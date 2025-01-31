let user;

loadAccount();
function loadAccount() {
    user = JSON.parse(localStorage.getItem('user'));
    const tableBody = document.getElementById('accounts-table-body');
    tableBody.innerHTML = ''; // Limpiar el contenido anterior

    const bgClasses = [
        'bg-primary',
        'bg-secondary',
        'bg-success',
        'bg-danger',
        'bg-warning',
        'bg-info',
        'bg-light',
        'bg-dark'
    ];

    user.accounts.forEach(account => {
        const row = document.createElement('tr');

        // Seleccionar una clase aleatoria
        const randomClass = bgClasses[Math.floor(Math.random() * bgClasses.length)];

        row.innerHTML = `
            <td>${account.id}</td>
            <td class="${randomClass} p-1" style="white-space: nowrap;">${account.currency}</td>
            <td>${account.balance.toFixed(2)}</td>
            <td>${account.depositSum.toFixed(2)}</td>
            <td>${account.cashoutsSum.toFixed(2)}</td>
            <td>${account.pendingCashoutsSum.toFixed(2)}</td>
            <td>${account.chargebacksSum.toFixed(2)}</td>
            <td>${account.unreceivedDepositsSum.toFixed(2)}</td>
            <td>${account.refundsSum.toFixed(2)}</td>
            <td>${account.reversalsSum.toFixed(2)}</td>
            <td>${account.affiliatePaymentsSum.toFixed(2)}</td>
            <td>${account.avgBet.toFixed(2)}</td>
            <td>${account.giftsSum.toFixed(2)}</td>
            <td>${account.spentInCasino.toFixed(2)}</td>
            <td>${account.bonuses.toFixed(2)}</td>
            <td>${account.bonusRatio.toFixed(2)}</td>
        `;

        tableBody.appendChild(row);
    });
}

// Función para enviar los datos del formulario de Balance Correction
function submitBalanceForm(event) {
    event.preventDefault();

    const action = document.querySelector('input[name="actionbalance"]:checked').value;
    const currency = document.getElementById('currencybalance').value;
    const amount = document.getElementById('amountbalance').value;
    const comment = document.getElementById('commentbalance').value;
    const authCode = document.getElementById('auth-codebalance').value;

    const data = {
        type: 'balanceCorrection',
        action: action,
        currency: currency,
        amount: amount,
        comment: comment,
        authCode: authCode,
        userid: localStorage.getItem('selectedUser')
    };
    console.log(data);
    // Emitir los datos al servidor
    socketMain.emit('balanceChangeBalance', data);

    document.getElementById('currencybalance').value = "";
    document.getElementById('amountbalance').value = "";
    document.getElementById('commentbalance').value = "";
    document.getElementById('auth-codebalance').value = "";
    showLoading();
}

// Función para enviar los datos del formulario de Manual Balance
function submitManualForm(event) {
    event.preventDefault();

    // Obtener los valores de los campos del formulario
    const action = document.querySelector('input[name="actionmanual"]:checked')?.value;
    const currency = document.getElementById('currencymanual').value.trim();
    const amount = parseFloat(document.getElementById('amountmanual').value);
    const paymentSystem = document.getElementById('payment-system').value;
    const comment = document.getElementById('commentmanual').value.trim();
    const authCode = document.getElementById('auth-codemanual').value.trim();

    // Validar que los datos sean correctos
    if (!action || !currency || isNaN(amount) || amount <= 0 || !paymentSystem || !authCode) {
        alert("Please fill in all required fields with valid data.");
        return;
    }

    // Crear el objeto con los datos
    const data = {
        type: action,
        currency: currency,
        amount: amount,
        paymentSystem: paymentSystem,
        comment: comment,
        authCode: authCode,
        userid: localStorage.getItem('selectedUser')
    };

    console.log(data);

    // Emitir los datos al servidor
    socketMain.emit('transactionChangeBalance', data);

    // Limpiar los campos del formulario
    document.getElementById('currencymanual').value = "";
    document.getElementById('amountmanual').value = "";
    document.getElementById('payment-system').value = "";
    document.getElementById('commentmanual').value = "";
    document.getElementById('auth-codemanual').value = "";

    // Mostrar el indicador de carga
    showLoading();
}

// Función para enviar los datos del formulario de Gift
function submitGiftForm(event) {
    event.preventDefault();

    // Obtener los valores de los campos del formulario
    const currency = document.getElementById('currencygift').value.trim();
    const amount = parseFloat(document.getElementById('amountgift').value);
    const comment = document.getElementById('commentgift').value.trim();
    const authCode = document.getElementById('auth-codegift').value.trim();
    const userid = localStorage.getItem('selectedUser');

    // Validar que los datos sean correctos
    if (!currency || isNaN(amount) || amount <= 0 || !authCode || !userid) {
        alert("Please fill in all required fields with valid data.");
        return;
    }

    // Crear el objeto con los datos
    const data = {
        type: 'gift',
        currency: currency,
        amount: amount,
        comment: comment,
        authCode: authCode,
        userid: userid
    };

    console.log(data);

    // Emitir los datos al servidor
    socketMain.emit('giftChangeBalance', data);

    // Limpiar los campos del formulario
    document.getElementById('currencygift').value = "";
    document.getElementById('amountgift').value = "";
    document.getElementById('commentgift').value = "";
    document.getElementById('auth-codegift').value = "";

    // Mostrar el indicador de carga
    showLoading();
}

// Agregar eventos de submit a los formularios
document.querySelector('.balance-form-card form').addEventListener('submit', submitBalanceForm);
document.querySelector('.manual-balance-form form').addEventListener('submit', submitManualForm);
document.querySelector('.gift-form-card form').addEventListener('submit', submitGiftForm);

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Función para ocultar la barra de carga
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}