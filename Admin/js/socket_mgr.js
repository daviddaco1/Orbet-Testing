//Global vars
let socketMain;
let config;

// Ejecutar esta función solo una vez al cargar la página
function initializeSocket() {
  console.log("try connect to socket");

  const socket = io(config.socketUrl, { transports: ['websocket'], autoConnect: false }); // Reemplaza con la dirección y puerto de tu servidor Node.js
  socketMain = socket;

  socket.on('connect', () => {
    console.log('Conectado al servidor');
  });

  socket.on('disconnect', () => {
    console.log('Descontectado del servidor');
  });

  socket.on('Setsuspicious', function (data) {
    console.log("data " + JSON.stringify(data));
    hideLoading();
    alert('Suspicion Successfully Submitted');
  });

  socket.on('onGetUserList', function (data) {
    console.log("data " + JSON.stringify(data));
    // Guardar el objeto data.users en localStorage
    localStorage.setItem('users', JSON.stringify(data.users));
    loadUsers();
  });

  socket.on('onGetUserData', function (data) {
    console.log("data " + JSON.stringify(data, null, 2));
    // Guardar el objeto data.users en localStorage
    localStorage.setItem('user', data.user);
    loadUser();
  });

  socket.on('onGetTagsNGroups', function (data) {
    //console.log("data received: ", JSON.stringify(data)); // Verifica que data tiene la estructura esperada
    if (data.tags && data.groups) {
      availableTags = data.tags;
      availableGroups = data.groups;
      loadAllTagsNGroups();  // Llamada a la función para cargar los datos
    } else {
      console.error('Invalid data structure received:', data);
    }
  });

  socket.on('onGetResultSaveUser', function (data) {
    console.log("data " + JSON.stringify(data));
    hideLoading();
    alert('Updated User Data');
  });

  socket.on('commentSaved', function (data) {
    console.log("data " + JSON.stringify(data));
    if (!data.status) {
      addAlert(data.message);
    }
    else {
      const newComment = { date: data.created_at, comment: data.comment_text, adminEmail: data.admin_email };
      user.comments.push(newComment); // Agregar el nuevo comentario al JSON del usuario
      document.getElementById('new-comment').value = ''; // Limpiar el campo de texto
      populateCommentsList(); // Actualizar la lista de comentarios
    }
    hideLoading();
  });

  socket.on('onChangeUserStatusResult', function (data) {
    console.log("data " + JSON.stringify(data));
    hideLoading();
    user.userInfo.status = data.userStatus || user.userInfo.status;
    setStatus();
  });

  socket.on('setDuplicationsResponse', function (data) {
    console.log("data " + JSON.stringify(data));
    hideLoading();
  });

  socket.on('changeBalanceResponse', function (data) {
    console.log("data " + JSON.stringify(data));
    if (!data.status) {
      addAlert(data.message);
    } else {
      // Obtener la currency y el nuevo balance del objeto recibido
      const { currency, balance, gift_sum, cashouts_sum, deposit_sum } = data;

      // Obtener el objeto user desde localStorage
      console.log(localStorage.getItem('user'));
      let user = JSON.parse(localStorage.getItem('user'));

      if (!user || !user.accounts) {
        console.error('User data not found or invalid.');
        return;
      }

      if (user.accounts.find(acc => acc.currency === currency)) {
        // Si la cuenta ya existe, actualiza el balance
        user.accounts.find(acc => acc.currency === currency).balance = balance;
        user.accounts.find(acc => acc.currency === currency).depositSum += deposit_sum || 0.00;
        user.accounts.find(acc => acc.currency === currency).cashoutsSum += cashouts_sum || 0.00;
        user.accounts.find(acc => acc.currency === currency).giftsSum += gift_sum || 0.00;
      } else {
        // Si no existe, crea una nueva cuenta con la currency y el balance
        user.accounts.push({
          id: user.accounts.length + 1, // Asigna un ID único, basado en la longitud actual
          currency: currency,
          balance: balance,
          depositSum: deposit_sum || 0.00,
          cashoutsSum: cashouts_sum || 0.00,
          pendingCashoutsSum: 0.00,
          chargebacksSum: 0.00,
          unreceivedDepositsSum: 0.00,
          refundsSum: 0.00,
          reversalsSum: 0.00,
          affiliatePaymentsSum: 0.00,
          avgBet: 0.00,
          giftsSum: gift_sum || 0.00,
          spentInCasino: 0.00,
          bonuses: 0.00,
          bonusRatio: 0.00
        });
      }

      // Guardar los cambios en localStorage
      localStorage.setItem('user', JSON.stringify(user));
      console.log(localStorage.getItem('user'));
      // Llamar a la función para recargar la información de la cuenta
      loadAccount();
    }
    hideLoading();
  });

  socket.on('assignAffiliateResponse', (response) => {
    if (response.success) {
      assignResponse.textContent = response.message;
      assignResponse.style.color = 'green';
    } else {
      assignResponse.textContent = response.message;
      assignResponse.style.color = 'red';
    }
  });

  socket.connect();
};

if (!window.socketInitialized) {
  window.socketInitialized = true;
  // Cargar la configuración desde config.json
  fetch('./config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('No se pudo cargar la configuración');
      }
      return response.json();
    })
    .then(_config => {
      config = _config;
      initializeSocket();
    })
    .catch(error => {
      console.error('Error cargando configuración:', error);
    });
}

function addAlert(message, type = 'danger') {
  // Crear un nuevo div de alerta
  const alertDiv = document.createElement('div');

  // Añadir las clases de Bootstrap para el estilo de la alerta
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';

  // Añadir el contenido de la alerta
  alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Añadir la alerta al contenedor de alertas
  const alertContainer = document.getElementById('alertContainer');
  alertContainer.appendChild(alertDiv);

  // Opción para ocultar la alerta automáticamente después de un tiempo
  setTimeout(() => {
    alertDiv.classList.remove('show');
    alertDiv.classList.add('d-none'); // Oculta la alerta
  }, 5000); // 5000 ms = 5 segundos
}