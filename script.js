document.addEventListener('DOMContentLoaded', function() {
    // ==================== LOGIN SYSTEM ====================
    const loginSection = document.getElementById('loginSection');
    const appSection = document.getElementById('appSection');
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const rememberMe = document.getElementById('rememberMe');
    const forgotPassword = document.getElementById('forgotPassword');
    const displayUsername = document.getElementById('displayUsername');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Demo credentials
    const validUsers = [
        { username: 'admin', password: '535680', name: 'BBC' },
        { username: 'sambhai', password: 'sam@login', name: 'Samfernandez User' },
        { username: 'sagar', password: 'sagar@login', name: 'Reed_little User' },
        { username: 'guru', password: 'guru@login', name: 'Guru User' }
    ];
    
    // Check for saved login
    checkSavedLogin();
    
    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performLogin();
        });
    }
    
    // Forgot password handler
    if (forgotPassword) {
        forgotPassword.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Please contact your administrator to reset your password.', 'info');
        });
    }
    
    // Logout handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            performLogout();
        });
    }
    
    // Function to perform login
    function performLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            showLoginNotification('Please enter both username and password', 'warning');
            return;
        }
        
        // Show loading state
        const originalContent = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        loginBtn.disabled = true;
        
        // Simulate API call delay
        setTimeout(() => {
            // Validate credentials
            const user = validUsers.find(u => u.username === username && u.password === password);
            
            if (user) {
                // Save login if remember me is checked
                if (rememberMe.checked) {
                    localStorage.setItem('rememberedUser', JSON.stringify({
                        username: user.username,
                        name: user.name,
                        timestamp: new Date().getTime()
                    }));
                } else {
                    sessionStorage.setItem('loggedIn', 'true');
                    sessionStorage.setItem('username', user.username);
                    sessionStorage.setItem('userName', user.name);
                }
                
                // Show success message
                showLoginNotification(`Welcome back, ${user.name}!`, 'success');
                
                // Hide login section, show app
                setTimeout(() => {
                    loginSection.style.display = 'none';
                    appSection.style.display = 'block';
                    displayUsername.textContent = user.name;
                    
                    // Initialize the main application
                    initializeMainApp();
                }, 500);
            } else {
                // Show error
                showLoginNotification('Invalid username or password', 'warning');
                
                // Reset button
                loginBtn.innerHTML = originalContent;
                loginBtn.disabled = false;
                
                // Shake animation
                loginForm.classList.add('shake');
                setTimeout(() => {
                    loginForm.classList.remove('shake');
                }, 500);
            }
        }, 1000);
    }
    
    // Check for saved login
    function checkSavedLogin() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        
        if (rememberedUser) {
            try {
                const user = JSON.parse(rememberedUser);
                // Check if saved login is less than 7 days old
                const now = new Date().getTime();
                const savedTime = user.timestamp;
                const daysDiff = (now - savedTime) / (1000 * 60 * 60 * 24);
                
                if (daysDiff <= 7) {
                    // Auto login
                    usernameInput.value = user.username;
                    passwordInput.value = '********'; // Placeholder
                    rememberMe.checked = true;
                    
                    // Auto login after short delay
                    setTimeout(() => {
                        performLogin();
                    }, 500);
                } else {
                    // Clear expired saved login
                    localStorage.removeItem('rememberedUser');
                }
            } catch (e) {
                localStorage.removeItem('rememberedUser');
            }
        }
    }
    
    // Perform logout
    function performLogout() {
        // Clear storage
        localStorage.removeItem('rememberedUser');
        sessionStorage.removeItem('loggedIn');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('userName');
        
        // Show app section, hide login
        appSection.style.display = 'none';
        loginSection.style.display = 'flex';
        
        // Clear form
        usernameInput.value = '';
        passwordInput.value = '';
        rememberMe.checked = false;
        
        // Reset button
        loginBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
        loginBtn.disabled = false;
        
        showLoginNotification('You have been logged out successfully', 'info');
        
        // Clear uploaded data
        uploadedData = [];
        branches.clear();
        headerFileUpload.value = '';
        headerFileInfo.style.display = 'none';
        headerFileName.textContent = 'No file uploaded';
        headerRecordCount.textContent = '0 records';
        hideResultsSection();
        updateStats();
    }
    
    // Login notification (separate from main app notifications)
    function showLoginNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `login-notification login-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        loginSection.appendChild(notification);
        
        // Add styles for login notification
        const style = document.createElement('style');
        style.textContent = `
            .login-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                padding: 15px 20px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
                z-index: 2000;
                min-width: 300px;
                animation: slideIn 0.3s ease;
                border-left: 4px solid #4caf50;
            }
            
            .login-notification-warning {
                border-left-color: #ff9800;
            }
            
            .login-notification-info {
                border-left-color: #2196f3;
            }
            
            .login-notification .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .login-notification-success .notification-content i {
                color: #4caf50;
            }
            
            .login-notification-warning .notification-content i {
                color: #ff9800;
            }
            
            .login-notification-info .notification-content i {
                color: #2196f3;
            }
            
            .shake {
                animation: shake 0.5s ease-in-out;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
        `;
        
        document.head.appendChild(style);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                    if (style.parentNode) {
                        style.remove();
                    }
                }, 250);
            }
        }, 3000);
    }
    
    // ==================== MAIN APPLICATION ====================
    function initializeMainApp() {
        // Elements - Header
        const headerUploadBtn = document.getElementById('headerUploadBtn');
        const headerFileUpload = document.getElementById('headerFileUpload');
        const headerSearchBtn = document.getElementById('headerSearchBtn');
        const headerSearchInput = document.getElementById('headerSearchInput');
        const headerFileInfo = document.getElementById('headerFileInfo');
        const headerFileName = document.getElementById('headerFileName');
        const headerRecordCount = document.getElementById('headerRecordCount');
        const headerClearFileBtn = document.getElementById('headerClearFileBtn');
        
        // Elements - Results Section
        const resultsSection = document.querySelector('.results-section');
        const resultsTableBody = document.getElementById('resultsTableBody');
        const resultsTableContainer = document.querySelector('.results-table-container');
        const noResultsMessage = document.getElementById('noResultsMessage');
        const noResultsText = document.getElementById('noResultsText');
        const resultsActions = document.querySelector('.results-actions');
        const exportBtn = document.querySelector('.export-btn');
        const clearBtn = document.querySelector('.clear-btn');
        const refreshSearchBtn = document.getElementById('refreshSearchBtn');
        const countBadge = document.querySelector('.count-badge');
        const countText = document.querySelector('.results-count span:last-child');
        const totalRecords = document.getElementById('totalRecords');
        const activeUsers = document.getElementById('activeUsers');
        const totalBranches = document.getElementById('totalBranches');
        
        // Search tags
        const searchTags = document.querySelectorAll('.search-tag');
        
        // Application state
        let uploadedData = [];
        let currentResults = [];
        let branches = new Set();
        let lastSearchTerm = '';
        
        // Update stats
        updateStats();
        
        // Setup search tag click handlers
        searchTags.forEach(tag => {
            tag.addEventListener('click', function() {
                const searchTerm = this.getAttribute('data-search');
                headerSearchInput.value = searchTerm;
                performSearch(searchTerm);
            });
        });
        
        // Header upload functionality
        if (headerUploadBtn) {
            headerUploadBtn.addEventListener('click', function() {
                headerFileUpload.click();
            });
        }
        
        if (headerFileUpload) {
            headerFileUpload.addEventListener('change', function(event) {
                const file = event.target.files[0];
                if (file) {
                    readUploadedFile(file);
                }
            });
        }
        
        // Header search functionality
        if (headerSearchBtn) {
            headerSearchBtn.addEventListener('click', function() {
                const searchTerm = headerSearchInput.value.trim();
                if (searchTerm) {
                    performSearch(searchTerm);
                }
            });
        }
        
        if (headerSearchInput) {
            headerSearchInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    const searchTerm = headerSearchInput.value.trim();
                    if (searchTerm) {
                        performSearch(searchTerm);
                    }
                }
            });
        }
        
        // Clear uploaded file
        if (headerClearFileBtn) {
            headerClearFileBtn.addEventListener('click', function() {
                uploadedData = [];
                branches.clear();
                headerFileUpload.value = '';
                headerFileInfo.style.display = 'none';
                headerFileName.textContent = 'No file uploaded';
                headerRecordCount.textContent = '0 records';
                hideResultsSection();
                updateStats();
                showNotification('Uploaded data cleared successfully', 'info');
            });
        }
        
        // Export functionality
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                if (currentResults.length === 0) {
                    showNotification('No results to export', 'warning');
                    return;
                }
                
                exportToCSV(currentResults);
            });
        }
        
        // Clear results functionality
        if (clearBtn) {
            clearBtn.addEventListener('click', hideResultsSection);
        }
        
        // Refresh search functionality
        if (refreshSearchBtn) {
            refreshSearchBtn.addEventListener('click', function() {
                if (lastSearchTerm) {
                    headerSearchInput.value = lastSearchTerm;
                    performSearch(lastSearchTerm);
                } else {
                    showNotification('No previous search to refresh', 'info');
                }
            });
        }
        
        // Function to read uploaded file (CSV or Excel)
        function readUploadedFile(file) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            // Show loading state
            showNotification(`Reading ${file.name}...`, 'info');
            
            if (fileExtension === 'csv') {
                readCSVFile(file);
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                readExcelFile(file);
            } else {
                showNotification('Unsupported file format. Please upload CSV or Excel file.', 'warning');
                return;
            }
        }
        
        // Read CSV file
        function readCSVFile(file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const lines = content.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim());
                    
                    // Find column indices
                    const userIdIndex = headers.findIndex(h => h.toLowerCase().includes('userid') || h.toLowerCase().includes('user'));
                    const numberIndex = headers.findIndex(h => h.toLowerCase().includes('number') || h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile'));
                    const branchIndex = headers.findIndex(h => h.toLowerCase().includes('branch') || h.toLowerCase().includes('location'));
                    const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status') || h.toLowerCase().includes('state'));
                    
                    if (userIdIndex === -1 || numberIndex === -1) {
                        showNotification('CSV must have UserID and Number columns', 'warning');
                        return;
                    }
                    
                    // Parse data
                    uploadedData = [];
                    branches.clear();
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim() === '') continue;
                        
                        const columns = parseCSVLine(lines[i]);
                        if (columns.length >= Math.max(userIdIndex, numberIndex, branchIndex, statusIndex) + 1) {
                            const userId = columns[userIdIndex]?.trim() || '';
                            const number = columns[numberIndex]?.trim() || '';
                            const branch = branchIndex !== -1 ? columns[branchIndex]?.trim() || 'Unknown' : 'Unknown';
                            const status = statusIndex !== -1 ? columns[statusIndex]?.trim() || 'Active' : 'Active';
                            
                            if (userId && number) {
                                uploadedData.push({
                                    userId: userId,
                                    number: number,
                                    branch: branch,
                                    status: status
                                });
                                
                                if (branch !== 'Unknown') {
                                    branches.add(branch);
                                }
                            }
                        }
                    }
                    
                    updateFileInfo(file.name, uploadedData.length);
                    updateStats();
                    showNotification(`Successfully loaded ${uploadedData.length} records from ${file.name}`, 'success');
                    
                    // Auto-search if there's already a search term
                    if (headerSearchInput.value.trim()) {
                        performSearch(headerSearchInput.value.trim());
                    }
                    
                } catch (error) {
                    console.error('Error reading CSV:', error);
                    showNotification('Error reading CSV file. Please check the format.', 'warning');
                }
            };
            
            reader.readAsText(file);
        }
        
        // Helper function to parse CSV line (handles quoted values)
        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            
            result.push(current);
            return result;
        }
        
        // Read Excel file using SheetJS
        function readExcelFile(file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    if (jsonData.length === 0) {
                        showNotification('Excel file is empty', 'warning');
                        return;
                    }
                    
                    // Get headers from first row
                    const firstRow = jsonData[0];
                    const headers = Object.keys(firstRow);
                    
                    // Find column names
                    const userIdKey = headers.find(h => h.toLowerCase().includes('userid') || h.toLowerCase().includes('user'));
                    const numberKey = headers.find(h => h.toLowerCase().includes('number') || h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile'));
                    const branchKey = headers.find(h => h.toLowerCase().includes('branch') || h.toLowerCase().includes('location'));
                    const statusKey = headers.find(h => h.toLowerCase().includes('status') || h.toLowerCase().includes('state'));
                    
                    if (!userIdKey || !numberKey) {
                        showNotification('Excel must have UserID and Number columns', 'warning');
                        return;
                    }
                    
                    // Parse data
                    uploadedData = [];
                    branches.clear();
                    
                    jsonData.forEach(row => {
                        const userId = row[userIdKey]?.toString().trim() || '';
                        const number = row[numberKey]?.toString().trim() || '';
                        const branch = branchKey ? row[branchKey]?.toString().trim() || 'Unknown' : 'Unknown';
                        const status = statusKey ? row[statusKey]?.toString().trim() || 'Active' : 'Active';
                        
                        if (userId && number) {
                            uploadedData.push({
                                userId: userId,
                                number: number,
                                branch: branch,
                                status: status
                            });
                            
                            if (branch !== 'Unknown') {
                                branches.add(branch);
                            }
                        }
                    });
                    
                    updateFileInfo(file.name, uploadedData.length);
                    updateStats();
                    showNotification(`Successfully loaded ${uploadedData.length} records from ${file.name}`, 'success');
                    
                    // Auto-search if there's already a search term
                    if (headerSearchInput.value.trim()) {
                        performSearch(headerSearchInput.value.trim());
                    }
                    
                } catch (error) {
                    console.error('Error reading Excel:', error);
                    showNotification('Error reading Excel file. Please check the format.', 'warning');
                }
            };
            
            reader.readAsArrayBuffer(file);
        }
        
        // Update file info display in header
        function updateFileInfo(name, count) {
            headerFileInfo.style.display = 'block';
            headerFileName.textContent = name;
            headerRecordCount.textContent = `${count.toLocaleString()} records`;
        }
        
        // Perform search with EXACT match for BOTH User IDs AND Phone Numbers
        function performSearch(searchTerm) {
            if (!searchTerm) {
                showNotification('Please enter a search term', 'warning');
                return;
            }
            
            if (uploadedData.length === 0) {
                showNotification('Please upload a CSV/Excel file first', 'warning');
                return;
            }
            
            // Store last search term
            lastSearchTerm = searchTerm;
            
            // Show loading state on header search button
            const originalContent = headerSearchBtn.innerHTML;
            headerSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            headerSearchBtn.disabled = true;
            
            // Simulate API call delay
            setTimeout(() => {
                // Filter data with EXACT match for both User IDs and Phone Numbers
                const filteredResults = uploadedData.filter(item => {
                    // Remove any spaces from the search term
                    const cleanSearchTerm = searchTerm.replace(/\s+/g, '').toLowerCase();
                    
                    // Clean the data for comparison
                    const cleanUserId = item.userId.replace(/\s+/g, '').toLowerCase();
                    const cleanNumber = item.number.replace(/\s+/g, '').toLowerCase();
                    
                    // Check for EXACT match with EITHER User ID OR Phone Number
                    return cleanUserId === cleanSearchTerm || cleanNumber === cleanSearchTerm;
                });
                
                // Store current results for export
                currentResults = filteredResults;
                
                // Show results section
                showResultsSection();
                
                // Update results count
                updateResultsCount(filteredResults.length);
                
                // Show/hide table and actions based on results
                if (filteredResults.length > 0) {
                    // Display results in table
                    displayResults(filteredResults);
                    
                    // Show table and actions, hide no results message
                    resultsTableContainer.classList.remove('hidden');
                    resultsTableContainer.classList.add('visible');
                    resultsActions.classList.remove('hidden');
                    resultsActions.classList.add('visible');
                    noResultsMessage.classList.remove('visible');
                    noResultsMessage.classList.add('hidden');
                    
                    // Determine if search was for User ID or Number
                    const firstResult = filteredResults[0];
                    const isUserIdMatch = firstResult.userId.replace(/\s+/g, '').toLowerCase() === searchTerm.replace(/\s+/g, '').toLowerCase();
                    const searchType = isUserIdMatch ? 'User ID' : 'phone number';
                    
                    showNotification(`Found ${filteredResults.length} matching records for ${searchType} "${searchTerm}"`, 'success');
                } else {
                    // Clear table
                    resultsTableBody.innerHTML = '';
                    
                    // Hide table and actions, show no results message
                    resultsTableContainer.classList.remove('visible');
                    resultsTableContainer.classList.add('hidden');
                    resultsActions.classList.remove('visible');
                    resultsActions.classList.add('hidden');
                    noResultsMessage.classList.remove('hidden');
                    noResultsMessage.classList.add('visible');
                    
                    noResultsText.textContent = `No EXACT matching records found for "${searchTerm}"`;
                    showNotification(`No EXACT matching records found for "${searchTerm}"`, 'info');
                }
                
                // Reset search button
                headerSearchBtn.innerHTML = originalContent;
                headerSearchBtn.disabled = false;
            }, 300);
        }
        
        // Show results section
        function showResultsSection() {
            resultsSection.classList.remove('hidden');
            resultsSection.classList.add('visible');
            
            // Scroll to results section smoothly
            setTimeout(() => {
                resultsSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
        
        // Hide results section
        function hideResultsSection() {
            resultsSection.classList.remove('visible');
            resultsSection.classList.add('hidden');
            
            // Clear search input
            headerSearchInput.value = '';
            lastSearchTerm = '';
            currentResults = [];
            
            // Reset all elements
            resultsTableBody.innerHTML = '';
            resultsTableContainer.classList.remove('visible');
            resultsTableContainer.classList.add('hidden');
            resultsActions.classList.remove('visible');
            resultsActions.classList.add('hidden');
            noResultsMessage.classList.remove('visible');
            noResultsMessage.classList.add('hidden');
            
            updateResultsCount(0);
            showNotification('Results cleared', 'info');
        }
        
        // Display results in table
        function displayResults(results) {
            resultsTableBody.innerHTML = '';
            
            if (results.length === 0) {
                return;
            }
            
            results.forEach(item => {
                const row = document.createElement('tr');
                
                // Determine status class
                let statusClass = 'status-active';
                const statusLower = item.status.toLowerCase();
                
                if (statusLower.includes('inactive') || statusLower.includes('expired')) {
                    statusClass = 'status-inactive';
                } else if (statusLower.includes('pending') || statusLower.includes('waiting')) {
                    statusClass = 'status-pending';
                }
                
                row.innerHTML = `
                    <td>${item.userId}</td>
                    <td>${formatPhoneNumber(item.number)}</td>
                    <td>${item.branch}</td>
                    <td><span class="${statusClass}">${item.status}</span></td>
                `;
                
                resultsTableBody.appendChild(row);
            });
        }
        
        // Format phone number for display
        function formatPhoneNumber(number) {
            // Remove any non-digit characters
            const digits = number.replace(/\D/g, '');
            
            if (digits.length === 11 && digits.startsWith('91')) {
                // Format Indian numbers: 91-60000-00000
                return `${digits.slice(0,2)}-${digits.slice(2,7)}-${digits.slice(7)}`;
            } else if (digits.length === 10) {
                // Format 10-digit numbers: 60000-00000
                return `${digits.slice(0,5)}-${digits.slice(5)}`;
            }
            
            return number;
        }
        
        // Update results count display
        function updateResultsCount(count) {
            countBadge.textContent = count;
            countText.textContent = count === 1 ? 'RESULT FOUND' : 'RESULTS FOUND';
        }
        
        // Update stats
        function updateStats() {
            totalRecords.textContent = uploadedData.length.toLocaleString();
            
            // Count active users (status contains 'active')
            const activeCount = uploadedData.filter(item => 
                item.status.toLowerCase().includes('active')
            ).length;
            activeUsers.textContent = activeCount.toLocaleString();
            
            totalBranches.textContent = branches.size.toLocaleString();
        }
        
        // Export to CSV
        function exportToCSV(data) {
            if (data.length === 0) return;
            
            // Create CSV content
            let csvContent = "UserID,Number,Branch,Status\n";
            
            data.forEach(item => {
                csvContent += `"${item.userId}","${item.number}","${item.branch}","${item.status}"\n`;
            });
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0,19).replace(/[:]/g, '-');
            a.download = `bbc_search_results_${timestamp}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification(`Exported ${data.length} records as CSV`, 'success');
        }
        
        // Notification system
        function showNotification(message, type) {
            // Remove existing notifications
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(notification => {
                notification.remove();
            });
            
            // Create new notification
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                    <span>${message}</span>
                </div>
                <button class="notification-close"><i class="fas fa-times"></i></button>
            `;
            
            // Add to page
            document.body.appendChild(notification);
            
            // Add styles for notification if not already present
            if (!document.getElementById('notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    .notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: white;
                        border-radius: 8px;
                        padding: 15px 20px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
                        z-index: 1000;
                        min-width: 300px;
                        max-width: 400px;
                        animation: slideIn 0.3s ease;
                        border-left: 4px solid #4caf50;
                    }
                    
                    .notification-warning {
                        border-left-color: #ff9800;
                    }
                    
                    .notification-info {
                        border-left-color: #2196f3;
                    }
                    
                    .notification-content {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        flex-grow: 1;
                    }
                    
                    .notification-content i {
                        font-size: 1.2rem;
                    }
                    
                    .notification-success .notification-content i {
                        color: #4caf50;
                    }
                    
                    .notification-warning .notification-content i {
                        color: #ff9800;
                    }
                    
                    .notification-info .notification-content i {
                        color: #2196f3;
                    }
                    
                    .notification-close {
                        background: none;
                        border: none;
                        cursor: pointer;
                        color: #888;
                        font-size: 1rem;
                        margin-left: 15px;
                        padding: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 24px;
                        height: 24px;
                    }
                    
                    .notification-close:hover {
                        color: #333;
                    }
                    
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Close button functionality
            notification.querySelector('.notification-close').addEventListener('click', function() {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 250);
            });
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 250);
                }
            }, 5000);
        }
    }
});


