document.addEventListener('DOMContentLoaded', function() {
    // Elements - Header
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const headerSearchInput = document.getElementById('headerSearchInput');
    const headerFileInfo = document.getElementById('headerFileInfo');
    const headerFileName = document.getElementById('headerFileName');
    const headerRecordCount = document.getElementById('headerRecordCount');
    const headerClearFileBtn = document.getElementById('headerClearFileBtn');
    const loadGoogleSheetsDataBtn = document.getElementById('loadGoogleSheetsDataBtn');
    
    // Header Status Elements
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const headerRecordBadge = document.getElementById('headerRecordBadge');
    
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
    
    // Footer Links
    const googleSheetsViewLink = document.getElementById('googleSheetsViewLink');
    
    // Search tags
    const searchTags = document.querySelectorAll('.search-tag');
    
    // Application state
    let uploadedData = [];
    let currentResults = [];
    let branches = new Set();
    let lastSearchTerm = '';
    let connectionAttempts = 0;
    const MAX_CONNECTION_ATTEMPTS = 3;
    
    // Google Sheets Configuration - YOUR WORKING LINK
    const GOOGLE_SHEETS_ID = '2PACX-1vRjA6s9KQC0ULV8_DqLEivh09rmwhJpIN8-ItzIG_rObE-EAY5Ipdut_v6iIedwfDA63XFW8lx6exma';
    const GOOGLE_SHEETS_CSV_URL = `https://docs.google.com/spreadsheets/d/e/${GOOGLE_SHEETS_ID}/pub?output=csv`;
    const GOOGLE_SHEETS_VIEW_URL = `https://docs.google.com/spreadsheets/d/e/${GOOGLE_SHEETS_ID}/pubhtml?gid=0&single=true`;
    
    // CORS proxy options (trying multiple for better reliability)
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://proxy.cors.sh/'
    ];
    let currentProxyIndex = 0;
    
    // Initialize - Load data from Google Sheets automatically
    loadDataFromGoogleSheets();
    
    // Setup search tag click handlers
    searchTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const searchTerm = this.getAttribute('data-search');
            headerSearchInput.value = searchTerm;
            performSearch(searchTerm);
        });
    });
    
    // Load Google Sheets data functionality
    loadGoogleSheetsDataBtn.addEventListener('click', function() {
        loadDataFromGoogleSheets();
    });
    
    // Header search functionality
    headerSearchBtn.addEventListener('click', function() {
        const searchTerm = headerSearchInput.value.trim();
        if (searchTerm) {
            performSearch(searchTerm);
        }
    });
    
    headerSearchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const searchTerm = headerSearchInput.value.trim();
            if (searchTerm) {
                performSearch(searchTerm);
            }
        }
    });
    
    // Refresh data functionality
    headerClearFileBtn.addEventListener('click', function() {
        loadDataFromGoogleSheets();
    });
    
    // Export functionality
    exportBtn.addEventListener('click', function() {
        if (currentResults.length === 0) {
            showNotification('No results to export', 'warning');
            return;
        }
        
        exportToCSV(currentResults);
    });
    
    // Clear results functionality
    clearBtn.addEventListener('click', hideResultsSection);
    
    // Refresh search functionality
    refreshSearchBtn.addEventListener('click', function() {
        if (lastSearchTerm) {
            headerSearchInput.value = lastSearchTerm;
            performSearch(lastSearchTerm);
        } else {
            showNotification('No previous search to refresh', 'info');
        }
    });
    
    // Set the Google Sheets view link
    if (googleSheetsViewLink) {
        googleSheetsViewLink.href = GOOGLE_SHEETS_VIEW_URL;
    }
    
    // Function to update header status
    function updateHeaderStatus(status, message, recordCount = null) {
        // Remove all status classes
        statusDot.classList.remove('connected', 'connecting', 'error');
        
        switch(status) {
            case 'connecting':
                statusDot.classList.add('connecting');
                statusText.textContent = message || 'Connecting...';
                headerRecordBadge.style.display = 'none';
                break;
            case 'connected':
                statusDot.classList.add('connected');
                statusText.textContent = message || 'Connected';
                if (recordCount !== null) {
                    headerRecordBadge.textContent = recordCount.toLocaleString();
                    headerRecordBadge.style.display = 'inline-block';
                }
                break;
            case 'error':
                statusDot.classList.add('error');
                statusText.textContent = message || 'Connection Failed';
                headerRecordBadge.style.display = 'none';
                break;
            default:
                statusText.textContent = message || 'Unknown';
        }
    }
    
    // Function to try next proxy
    function getNextProxy() {
        currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
        return CORS_PROXIES[currentProxyIndex];
    }
    
    // Function to test connection with timeout
    async function fetchWithTimeout(url, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                mode: 'cors',
                headers: {
                    'Accept': 'text/csv'
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // Function to load data from Google Sheets
    async function loadDataFromGoogleSheets() {
        // Reset connection attempts
        connectionAttempts = 0;
        
        // Show loading state
        headerFileName.textContent = 'Connecting to Google Sheets...';
        headerRecordCount.textContent = 'Loading...';
        loadGoogleSheetsDataBtn.innerHTML = '<div class="loading-spinner"></div> Connecting...';
        loadGoogleSheetsDataBtn.disabled = true;
        
        // Update header status
        updateHeaderStatus('connecting', 'Connecting to Google Sheets...');
        
        showNotification('Connecting to Google Sheets...', 'info');
        
        await attemptConnection();
    }
    
    // Function to attempt connection with retry logic
    async function attemptConnection() {
        try {
            // Try multiple proxies if needed
            let lastError = null;
            
            for (let i = 0; i < CORS_PROXIES.length; i++) {
                const proxy = CORS_PROXIES[currentProxyIndex];
                const urlToFetch = proxy + encodeURIComponent(GOOGLE_SHEETS_CSV_URL);
                
                try {
                    showNotification(`Attempting connection via proxy ${currentProxyIndex + 1}...`, 'info');
                    
                    const response = await fetchWithTimeout(urlToFetch);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const csvText = await response.text();
                    
                    // Verify we got actual CSV data
                    if (csvText.length < 10 || !csvText.includes(',')) {
                        throw new Error('Invalid CSV data received');
                    }
                    
                    // Parse the CSV data
                    const parseSuccess = parseCSVData(csvText);
                    
                    if (parseSuccess && uploadedData.length > 0) {
                        // Success! Update UI
                        updateFileInfo(`Google Sheets Data Loaded`, uploadedData.length);
                        updateStats();
                        
                        // Update header status with record count
                        updateHeaderStatus('connected', 'Live', uploadedData.length);
                        
                        showNotification(`✅ Successfully connected! Loaded ${uploadedData.length} records from Google Sheets`, 'success');
                        return true;
                    } else {
                        throw new Error('No data parsed from CSV');
                    }
                    
                } catch (error) {
                    console.error(`Proxy ${currentProxyIndex + 1} failed:`, error);
                    lastError = error;
                    
                    // Try next proxy
                    currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
                    
                    // If we've tried all proxies, break and show error
                    if (i === CORS_PROXIES.length - 1) {
                        throw lastError;
                    }
                    
                    // Small delay before next attempt
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
        } catch (error) {
            console.error('All connection attempts failed:', error);
            
            // Update header status for error
            updateHeaderStatus('error', 'Connection Failed');
            
            showNotification(`❌ Failed to connect to Google Sheets. Using sample data.`, 'warning');
            headerFileName.textContent = 'Using sample data (Demo Mode)';
            headerRecordCount.textContent = 'Demo Mode';
            
            // Fallback: Use sample data
            useSampleData();
            return false;
        } finally {
            loadGoogleSheetsDataBtn.innerHTML = '<i class="fab fa-google"></i> Refresh Data';
            loadGoogleSheetsDataBtn.disabled = false;
        }
    }
    
    // Parse CSV data from text
    function parseCSVData(csvText) {
        try {
            // Clean the CSV text - remove BOM and weird characters
            const cleanCsv = csvText.replace(/^\uFEFF/, '').trim();
            const lines = cleanCsv.split('\n');
            
            if (lines.length < 2) {
                console.error('CSV has no data lines');
                return false;
            }
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
            
            console.log('Headers found:', headers);
            
            // Find column indices with flexible matching
            const userIdIndex = headers.findIndex(h => 
                h.includes('userid') || h.includes('user') || h.includes('id') || h.includes('user_id')
            );
            
            const numberIndex = headers.findIndex(h => 
                h.includes('number') || h.includes('phone') || h.includes('mobile') || h.includes('contact')
            );
            
            const branchIndex = headers.findIndex(h => 
                h.includes('branch') || h.includes('location') || h.includes('office')
            );
            
            const statusIndex = headers.findIndex(h => 
                h.includes('status') || h.includes('state') || h.includes('condition')
            );
            
            if (userIdIndex === -1 || numberIndex === -1) {
                console.error('Required columns not found. Headers:', headers);
                showNotification('CSV must have UserID and Number columns', 'warning');
                return false;
            }
            
            // Parse data
            uploadedData = [];
            branches.clear();
            
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                const columns = parseCSVLine(lines[i]);
                if (columns.length >= Math.max(userIdIndex, numberIndex) + 1) {
                    const userId = columns[userIdIndex]?.replace(/"/g, '').trim() || '';
                    const number = columns[numberIndex]?.replace(/"/g, '').trim() || '';
                    const branch = branchIndex !== -1 && columns[branchIndex] ? 
                        columns[branchIndex].replace(/"/g, '').trim() || 'Unknown' : 'Unknown';
                    const status = statusIndex !== -1 && columns[statusIndex] ? 
                        columns[statusIndex].replace(/"/g, '').trim() || 'Active' : 'Active';
                    
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
            
            console.log(`Parsed ${uploadedData.length} records`);
            
            // Auto-search if there's already a search term
            if (headerSearchInput.value.trim()) {
                performSearch(headerSearchInput.value.trim());
            }
            
            return uploadedData.length > 0;
            
        } catch (error) {
            console.error('Error parsing CSV data:', error);
            showNotification('Error parsing CSV data', 'warning');
            return false;
        }
    }
    
    // Helper function to parse CSV line
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
    
    // Fallback sample data
    function useSampleData() {
        uploadedData = [
            { userId: 'bbc1234', number: '91600000000', branch: 'Mumbai', status: 'Active' },
            { userId: 'bbc5678', number: '91777777777', branch: 'Delhi', status: 'Active' },
            { userId: 'bbc9012', number: '91888888888', branch: 'Bangalore', status: 'Inactive' },
            { userId: 'bbc3456', number: '91999999999', branch: 'Chennai', status: 'Active' },
            { userId: 'bbc7890', number: '91555555555', branch: 'Kolkata', status: 'Pending' }
        ];
        
        branches.clear();
        uploadedData.forEach(item => {
            if (item.branch !== 'Unknown') {
                branches.add(item.branch);
            }
        });
        
        updateFileInfo('Sample Data (Demo Mode)', uploadedData.length);
        updateStats();
        
        // Update header status for demo mode
        updateHeaderStatus('connected', 'Demo Mode', uploadedData.length);
        
        showNotification(`Using sample data (${uploadedData.length} records)`, 'info');
    }
    
    // Update file info display in header
    function updateFileInfo(name, count) {
        headerFileInfo.style.display = 'block';
        headerFileName.textContent = name;
        headerRecordCount.textContent = `${count.toLocaleString()} records`;
    }
    
    // Perform search
    function performSearch(searchTerm) {
        if (!searchTerm) {
            showNotification('Please enter a search term', 'warning');
            return;
        }
        
        if (uploadedData.length === 0) {
            showNotification('Data is still loading, please wait...', 'warning');
            return;
        }
        
        lastSearchTerm = searchTerm;
        
        const originalContent = headerSearchBtn.innerHTML;
        headerSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        headerSearchBtn.disabled = true;
        
        setTimeout(() => {
            const filteredResults = uploadedData.filter(item => {
                const cleanSearchTerm = searchTerm.replace(/\s+/g, '').toLowerCase();
                const cleanUserId = item.userId.replace(/\s+/g, '').toLowerCase();
                const cleanNumber = item.number.replace(/\s+/g, '').toLowerCase();
                
                return cleanUserId === cleanSearchTerm || cleanNumber === cleanSearchTerm;
            });
            
            currentResults = filteredResults;
            
            showResultsSection();
            updateResultsCount(filteredResults.length);
            
            if (filteredResults.length > 0) {
                displayResults(filteredResults);
                
                resultsTableContainer.classList.remove('hidden');
                resultsActions.classList.remove('hidden');
                noResultsMessage.classList.add('hidden');
                
                showNotification(`Found ${filteredResults.length} matching records`, 'success');
            } else {
                resultsTableBody.innerHTML = '';
                
                resultsTableContainer.classList.add('hidden');
                resultsActions.classList.add('hidden');
                noResultsMessage.classList.remove('hidden');
                
                noResultsText.textContent = `No matching records found for "${searchTerm}"`;
                showNotification(`No matching records found`, 'info');
            }
            
            headerSearchBtn.innerHTML = originalContent;
            headerSearchBtn.disabled = false;
        }, 300);
    }
    
    // Show results section
    function showResultsSection() {
        resultsSection.classList.remove('hidden');
        resultsSection.classList.add('visible');
        
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
        
        headerSearchInput.value = '';
        lastSearchTerm = '';
        currentResults = [];
        
        resultsTableBody.innerHTML = '';
        resultsTableContainer.classList.add('hidden');
        resultsActions.classList.add('hidden');
        noResultsMessage.classList.add('hidden');
        
        updateResultsCount(0);
        showNotification('Results cleared', 'info');
    }
    
    // Display results in table
    function displayResults(results) {
        resultsTableBody.innerHTML = '';
        
        results.forEach(item => {
            const row = document.createElement('tr');
            
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
        const digits = number.replace(/\D/g, '');
        
        if (digits.length === 11 && digits.startsWith('91')) {
            return `${digits.slice(0,2)}-${digits.slice(2,7)}-${digits.slice(7)}`;
        } else if (digits.length === 10) {
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
        
        const activeCount = uploadedData.filter(item => 
            item.status.toLowerCase().includes('active')
        ).length;
        activeUsers.textContent = activeCount.toLocaleString();
        
        totalBranches.textContent = branches.size.toLocaleString();
    }
    
    // Export to CSV
    function exportToCSV(data) {
        if (data.length === 0) return;
        
        let csvContent = "UserID,Number,Branch,Status\n";
        
        data.forEach(item => {
            csvContent += `"${item.userId}","${item.number}","${item.branch}","${item.status}"\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().slice(0,19).replace(/[:]/g, '-');
        a.download = `search_results_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Exported ${data.length} records as CSV`, 'success');
    }
    
    // Notification system
    function showNotification(message, type) {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        // Add notification styles if not already present
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
        
        notification.querySelector('.notification-close').addEventListener('click', function() {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 250);
        });
        
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
});
