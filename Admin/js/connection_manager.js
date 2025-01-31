(function () {
    const ConnectionManager = {
        baseUrl: "",
        config: null,

        // Initialize the ConnectionManager by loading configuration
        async initialize() {
            if (this.config) return; // Prevent reinitialization

            try {
                const response = await fetch('./config.json');
                if (!response.ok) {
                    throw new Error('Failed to load configuration');
                }

                this.config = await response.json();
                this.baseUrl = this.config.apiUrl;
                console.log("ConnectionManager initialized with baseUrl:", this.baseUrl);
            } catch (error) {
                console.error("Error loading configuration:", error);
                this.addAlert("Failed to load configuration. Please try again.", "danger");
            }
        },

        // General method to make API requests
        async request(endpoint, method = "GET", body = null) {
            try {
                const headers = {
                    "Content-Type": "application/json",
                    "x-api-key": "apikey"
                };                
                
                const options = { method, headers };

                if (body) {
                    options.body = JSON.stringify(body);
                }

                const response = await fetch(`${this.baseUrl}${endpoint}`, options);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Unknown server error");
                }

                return await response.json();
            } catch (error) {
                console.error(`Error in ${method} ${endpoint}:`, error);
                this.addAlert(`Error: ${error.message}`, "danger");
                throw error; // Rethrow for specific error handling if needed
            }
        },

        // Utility method to display alerts
        addAlert(message, type = 'danger') {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
            alertDiv.role = 'alert';
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            const alertContainer = document.getElementById('alertContainer');
            alertContainer.appendChild(alertDiv);

            setTimeout(() => {
                alertDiv.classList.remove('show');
                alertDiv.classList.add('d-none');
            }, 5000);
        },
    };

    // Attach ConnectionManager to the global window object
    window.ConnectionManager = ConnectionManager;
})();

ConnectionManager.initialize();