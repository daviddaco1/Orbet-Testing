let users = [];
getUsers();
function getUsers() {
    socketMain.emit("getUsers");
}

function loadUsers() {
    users = JSON.parse(localStorage.getItem('users'));
    fillTable();
    populateDropdowns();
}

// Función para llenar la tabla
function fillTable(_users) {
    const tableBody = document.getElementById('user-table-body');
    let usuarios;
    // Limpiar la tabla actual
    tableBody.innerHTML = '';
    if (_users != null) {
        usuarios = _users;
    }
    else {
        usuarios = users;
    }

    // Llenar la tabla con nuevos datos
    usuarios.forEach(user => {
        const row = document.createElement('tr');

        // Transforma los balances al formato "balance currency"
        const formattedBalances = user.balances.map(balance => `${balance.balance} ${balance.currency}`).join(', ');

        row.innerHTML = `
            <th scope="row"> <a href="#" class="question_content">${user.user_id}</a></th>
            <td>${user.email}</td>
            <td>${user.name}</td>
            <td>${user.language}</td>
            <td>${user.country}</td>
            <td>${user.last_login}</td>
            <td>${user.status}</td>
            <td>${formattedBalances}</td>
            <td>
                <div class="action_btns d-flex">
                    <a href="#" class="action_btn mr_10 edit-btn" data-user-id="${user.user_id}">
                        <i class="far fa-eye"></i>
                    </a>             
                </div>
            </td>
        `;
        // Agrega la fila a la tabla
        tableBody.appendChild(row);

        // Agrega el evento de clic para redirigir con la información del usuario
        row.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.preventDefault(); // Evitar que el enlace recargue la página

            // Guarda los datos del usuario en localStorage
            localStorage.setItem('selectedUser', JSON.stringify(user.user_id));

            // Redirige a player_details.html
            window.location.href = 'player_details.html';
        });
    });
}

// Agregar la lógica para redirigir al hacer clic en el botón de editar
document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', function (event) {
        event.preventDefault(); // Prevenir que el enlace actúe como un anchor normal

        const userId = this.getAttribute('data-user-id'); // Obtener el ID del usuario
        const editPage = 'player_details.html'; // Nombre del archivo HTML que realmente cargarás

        // Construir la URL con el ID del usuario en los parámetros
        const url = `${editPage}?id=${userId}`;

        // Redirigir a la nueva URL
        window.location.href = url;
    });
});

function populateDropdowns() {
    // Inicializar set para guardar valores únicos de currency y country
    const currencySet = new Set();
    const countrySet = new Set();
    currencySet.add("Select Currency");
    countrySet.add("Select Country");
    // Recorrer la lista de usuarios para obtener valores únicos
    users.forEach(user => {
        // Comprobar si el usuario tiene balances y extraer currency
        if (user.balances && user.balances.length > 0) {
            user.balances.forEach(balance => {
                if (balance.currency) {
                    currencySet.add(balance.currency); // Agregar currency al set si existe
                }
            });
        }
        // Guardar country directamente del objeto user
        countrySet.add(user.country);
    });

    // Convertir los sets a arrays, si es necesario más adelante
    const uniqueCurrencies = Array.from(currencySet);
    const uniqueCountries = Array.from(countrySet);

    console.log(uniqueCurrencies);
    console.log(uniqueCountries);


    // Llenar el dropdown de Currency
    const currencyDropdownMenu = document.getElementById('currencyDropdownMenu');
    currencySet.forEach(currency => {
        const item = document.createElement('a');
        item.className = 'dropdown-item';
        item.href = '#';
        item.textContent = currency;
        item.onclick = function () {
            // Cambiar el texto del botón al seleccionar una opción
            document.getElementById('currencyDropdown').textContent = currency;
        };
        currencyDropdownMenu.appendChild(item);
    });

    // Llenar el dropdown de Country
    const countryDropdownMenu = document.getElementById('countryDropdownMenu');
    countrySet.forEach(country => {
        const item = document.createElement('a');
        item.className = 'dropdown-item';
        item.href = '#';
        item.textContent = country;
        item.onclick = function () {
            // Cambiar el texto del botón al seleccionar una opción
            document.getElementById('countryDropdown').textContent = country;
        };
        countryDropdownMenu.appendChild(item);
    });
}

// Manejar el evento de búsqueda
document.getElementById("searchForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevenir el comportamiento por defecto del formulario
    const searchInput = document.getElementById("searchInput").value;
    searchUsers(searchInput); // Llamar a la función de búsqueda con el término ingresado
});

// Función para buscar usuarios
function searchUsers(searchTerm) {
    // Convertimos el término de búsqueda a minúsculas para hacer la búsqueda insensible a mayúsculas
    searchTerm = searchTerm.toLowerCase();

    // Filtrar usuarios cuyo nombre o correo contenga el término de búsqueda
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );

    // Mostrar los resultados en el contenedor de resultados
    const resultContainer = document.getElementById("resultContainer");
    resultContainer.innerHTML = ""; // Limpiar resultados anteriores

    if (filteredUsers.length > 0) {
        fillTable(filteredUsers);
        // filteredUsers.forEach(user => {
        //     const userElement = document.createElement("p");
        //     userElement.textContent = `ID: ${user.user_id}, Name: ${user.name}, Email: ${user.email}`;
        //     resultContainer.appendChild(userElement);
        // });
    } else {
        fillTable();
        resultContainer.innerHTML = "<p>No users found.</p>";
    }
}

document.getElementById('filterForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Evitar el envío del formulario por defecto

    // Recoger los valores de los filtros
    const name = document.getElementById('nameFilter').value;
    const email = document.getElementById('emailFilter').value;
    const currency = document.getElementById('currencyDropdown').textContent;
    const country = document.getElementById('countryDropdown').textContent;

    // Aquí realizarías la lógica de filtrado de la lista
    // Ejemplo: realizar una llamada a la API o filtrar localmente
    filterData(name.trim(), email.trim(), currency.trim(), country.trim());
});

function filterData(name, email, currency, country) {
    console.log('Filtrando con los siguientes datos:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Currency:', currency);
    console.log('Country:', country);

    // Si todos los filtros están vacíos, pasa la lista sin filtrar
    if (name.length === 0 && email.length === 0 && (currency === 'Select Currency' || currency.length === 0 || currency === '') && (country === '' || country === 'Select Country' || country.length === 0)) {
        fillTable(); // Pasar la lista completa de usuarios
        return;
    }

    // Filtrar usuarios con base en los filtros seleccionados
    const filteredUsers = users.filter(user => {
        // Si el filtro está vacío, coincidirá automáticamente
        const matchesName = name.length > 0 ? user.name.toLowerCase().includes(name.toLowerCase()) : false;
        const matchesEmail = email.length > 0 ? user.email.toLowerCase().includes(email.toLowerCase()) : false;

        // Filtrar si alguna moneda en balances coincide con el filtro
        const matchesCurrency = currency !== 'Select Currency' && currency.length > 0
            ? user.balances.some(balance => balance.currency === currency)
            : false;

        const matchesCountry = country !== 'Select Country' && country.length > 0 ? user.country === country : false;

        // Incluir usuarios que coincidan con cualquiera de los filtros
        return matchesName || matchesEmail || matchesCurrency || matchesCountry;
    });

    // Llamar a la función fillTable con los usuarios filtrados
    fillTable(filteredUsers);
}