document.addEventListener('DOMContentLoaded', function() {
    // ===== ELEMENTS =====
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const headerSearchInput = document.getElementById('headerSearchInput');
    const headerFileName = document.getElementById('headerFileName');
    const headerRecordCount = document.getElementById('headerRecordCount');
    const loadGoogleSheetsDataBtn = document.getElementById('loadGoogleSheetsDataBtn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const headerRecordBadge = document.getElementById('headerRecordBadge');
    const lastRefreshTime = document.getElementById('lastRefreshTime');
    const refreshTimer = document.getElementById('refreshTimer');
    const refreshSpinner = document.getElementById('refreshSpinner');
    const nextRefreshNote = document.getElementById('nextRefreshNote');
    const resultsSection = document.querySelector('.results-section');
    const resultsTableBody = document.getElementById('resultsTableBody');
    const resultsTableContainer = document.querySelector('.results-table-container');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const noResultsText = document.getElementById('noResultsText');
    const resultsActions = document.querySelector('.results-actions');
    const clearBtn = document.querySelector('.clear-btn');
    const countBadge = document.querySelector('.count-badge');
    const totalRecords = document.getElementById('totalRecords');
    const activeUsers = document.getElementById('activeUsers');
    const totalBranches = document.getElementById('totalBranches');
    const googleSheetsViewLink = document.getElementById('googleSheetsViewLink');
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    
    // Search tags
    const searchTags = document.querySelectorAll('.search-tag');
    
    // ===== STATE =====
    let uploadedData = [];
    let currentResults = [];
    let branches = new Set();
    let isLoading = false;
    let autoRefreshEnabled = true;
    let countdownInterval = null;
    let secondsRemaining = 300; // 5 minutes = 300 seconds
    let dataLoaded = false; // Flag to track if data has been loaded
    
    // ===== CONFIGURATION =====
    const SPREADSHEET_ID = '1p-fxYDbWxajcqmeKlTbOV7oLbRTD2z6J3ickMAnS-lg';
    const GOOGLE_API_KEY = 'AIzaSyDkJbduR9SWGEuIu7pFlng_SYJBQxOf5m0';
    const VIEW_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=0`;
    const BATCH_SIZE = 10000;
    const REFRESH_INTERVAL = 300; // 5 minutes in seconds
    
    // ===== INITIALIZE =====
    // Only load data if not already loaded
    if (!dataLoaded) {
        loadDataFromGoogleSheets();
    }
    
    // Set view link
    if (googleSheetsViewLink) {
        googleSheetsViewLink.href = VIEW_URL;
    }
    
    // ===== EVENT LISTENERS =====
    
    // Search tags
    searchTags.forEach(tag => {
        tag.addEventListener('click', function() {
            headerSearchInput.value = this.getAttribute('data-search');
            performSearch(headerSearchInput.value);
        });
    });
    
    // Search button
    headerSearchBtn.addEventListener('click', () => {
        if (headerSearchInput.value.trim()) {
            performSearch(headerSearchInput.value.trim());
        }
    });
    
    // Enter key in search input
    headerSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && headerSearchInput.value.trim()) {
            performSearch(headerSearchInput.value.trim());
        }
    });
    
    // Refresh button - manual refresh
    loadGoogleSheetsDataBtn.addEventListener('click', () => {
        // Force reload even if data exists
        dataLoaded = false;
        uploadedData = [];
        loadDataFromGoogleSheets();
        resetCountdown();
    });
    
    // Auto refresh toggle
    autoRefreshToggle.addEventListener('change', (e) => {
        autoRefreshEnabled = e.target.checked;
        if (autoRefreshEnabled) {
            startCountdown();
            showNotification('Auto refresh enabled - updates every 5 minutes', 'success');
        } else {
            stopCountdown();
            if (refreshTimer) refreshTimer.textContent = 'OFF';
            if (nextRefreshNote) nextRefreshNote.textContent = 'Auto refresh disabled';
            showNotification('Auto refresh disabled', 'info');
        }
    });
    
    // Clear button
    clearBtn.addEventListener('click', hideResultsSection);
    
    // ===== FUNCTIONS =====
    
    // Update header status
    function updateHeaderStatus(status, message, recordCount = null) {
        statusDot.classList.remove('connected', 'connecting', 'error');
        
        switch(status) {
            case 'connecting':
                statusDot.classList.add('connecting');
                statusText.textContent = message || 'Connecting...';
                headerRecordBadge.style.display = 'none';
                if (refreshSpinner) refreshSpinner.style.display = 'inline-block';
                break;
                
            case 'connected':
                statusDot.classList.add('connected');
                statusText.textContent = message || 'Connected';
                if (recordCount !== null) {
                    headerRecordBadge.textContent = recordCount.toLocaleString();
                    headerRecordBadge.style.display = 'inline-block';
                }
                if (refreshSpinner) refreshSpinner.style.display = 'none';
                break;
                
            case 'error':
                statusDot.classList.add('error');
                statusText.textContent = message || 'Connection Failed';
                headerRecordBadge.style.display = 'none';
                if (refreshSpinner) refreshSpinner.style.display = 'none';
                break;
        }
    }
    
    // Update last refresh time
    function updateLastRefreshTime() {
        if (!lastRefreshTime) return;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastRefreshTime.innerHTML = `<i class="fas fa-clock"></i><span>Last: ${timeString}</span>`;
    }
    
    // Start countdown timer
    function startCountdown() {
        if (countdownInterval) clearInterval(countdownInterval);
        
        secondsRemaining = REFRESH_INTERVAL;
        updateTimerDisplay();
        
        countdownInterval = setInterval(() => {
            if (!autoRefreshEnabled) return;
            
            secondsRemaining--;
            
            if (secondsRemaining <= 0) {
                // Time to refresh
                if (autoRefreshEnabled && !isLoading) {
                    // Force reload on auto refresh
                    dataLoaded = false;
                    uploadedData = [];
                    loadDataFromGoogleSheets();
                }
                secondsRemaining = REFRESH_INTERVAL;
            }
            
            updateTimerDisplay();
        }, 1000);
    }
    
    // Stop countdown timer
    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }
    
    // Reset countdown timer
    function resetCountdown() {
        secondsRemaining = REFRESH_INTERVAL;
        updateTimerDisplay();
    }
    
    // Update timer display
    function updateTimerDisplay() {
        if (!refreshTimer || !nextRefreshNote) return;
        
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        refreshTimer.textContent = timeString;
        
        if (autoRefreshEnabled) {
            nextRefreshNote.textContent = `Next refresh in ${timeString}`;
        } else {
            nextRefreshNote.textContent = 'Auto refresh disabled';
        }
    }
    
    // Load data from Google Sheets
    async function loadDataFromGoogleSheets() {
        // Skip loading if data already exists (prevents reload on browser refresh)
        if (dataLoaded && uploadedData.length > 0) {
            console.log('Data already loaded, skipping reload on page refresh');
            return;
        }
        
        if (isLoading) return;
        isLoading = true;
        
        headerFileName.textContent = 'Loading...';
        headerRecordCount.textContent = 'Please wait...';
        loadGoogleSheetsDataBtn.disabled = true;
        headerSearchBtn.disabled = true;
        
        updateHeaderStatus('connecting', 'Loading...');
        showNotification('Loading data from Google Sheets...', 'info');
        
        try {
            // Get metadata
            const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${GOOGLE_API_KEY}`;
            const metadataResponse = await fetch(metadataUrl);
            
            if (!metadataResponse.ok) {
                throw new Error('Failed to connect to Google Sheets');
            }
            
            const metadata = await metadataResponse.json();
            const sheetName = metadata.sheets[0].properties.title;
            const totalRows = metadata.sheets[0].properties.gridProperties.rowCount;
            
            // Load data in batches
            uploadedData = [];
            branches.clear();
            
            for (let startRow = 2; startRow <= totalRows; startRow += BATCH_SIZE) {
                const endRow = Math.min(startRow + BATCH_SIZE - 1, totalRows);
                const range = `${sheetName}!A${startRow}:Z${endRow}`;
                const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}`;
                
                const batchResponse = await fetch(batchUrl);
                
                if (batchResponse.ok) {
                    const batchData = await batchResponse.json();
                    if (batchData.values) {
                        processBatch(batchData.values);
                    }
                }
                
                // Update progress
                headerRecordCount.textContent = `${uploadedData.length.toLocaleString()} records`;
                totalRecords.textContent = uploadedData.length.toLocaleString();
            }
            
            if (uploadedData.length > 0) {
                headerFileName.textContent = 'Google Sheets Data';
                headerRecordCount.textContent = `${uploadedData.length.toLocaleString()} records`;
                updateHeaderStatus('connected', 'Connected', uploadedData.length);
                updateStats();
                updateLastRefreshTime();
                resetCountdown();
                showNotification(`✅ Loaded ${uploadedData.length.toLocaleString()} records`, 'success');
                
                // Set flag that data has been loaded
                dataLoaded = true;
            } else {
                throw new Error('No data loaded');
            }
            
        } catch (error) {
            console.error('Error:', error);
            updateHeaderStatus('error', 'Connection Failed');
            loadSampleData();
            showNotification('❌ Failed to connect. Using sample data.', 'warning');
        }
        
        loadGoogleSheetsDataBtn.disabled = false;
        headerSearchBtn.disabled = false;
        isLoading = false;
    }
    
    // Process batch data
    function processBatch(rows) {
        for (const row of rows) {
            if (!row || row.length < 2) continue;
            
            const userId = row[0] ? row[0].toString().trim() : '';
            let number = row[1] ? row[1].toString().trim() : '';
            
            if (userId && number) {
                number = number.replace(/\D/g, '');
                const branch = row[2] ? row[2].toString().trim() : 'Unknown';
                const status = row[3] ? row[3].toString().trim() : 'Active';
                
                uploadedData.push({ userId, number, branch, status });
                
                if (branch && branch !== 'Unknown') {
                    branches.add(branch);
                }
            }
        }
    }
    
    // Load sample data
    function loadSampleData() {
        uploadedData = [
            { userId: 'ADMIN001', number: '918096475595', branch: 'Head Office', status: 'Active' },
            { userId: 'ADMIN002', number: '918096475596', branch: 'Head Office', status: 'Active' },
            { userId: 'USER1001', number: '91600000001', branch: 'Mumbai', status: 'Active' },
            { userId: 'USER1002', number: '91600000002', branch: 'Mumbai', status: 'Inactive' },
            { userId: 'USER2001', number: '91700000001', branch: 'Delhi', status: 'Active' },
            { userId: 'USER2002', number: '91700000002', branch: 'Delhi', status: 'Active' },
            { userId: 'USER3001', number: '91800000001', branch: 'Bangalore', status: 'Pending' },
            { userId: 'USER3002', number: '91800000002', branch: 'Bangalore', status: 'Active' },
            { userId: 'bbc1234', number: '91900000001', branch: 'Chennai', status: 'Active' },
            { userId: 'bbc5678', number: '91900000002', branch: 'Chennai', status: 'Active' }
        ];
        
        branches.clear();
        uploadedData.forEach(item => {
            if (item.branch && item.branch !== 'Unknown') {
                branches.add(item.branch);
            }
        });
        
        headerFileName.textContent = 'Sample Data';
        headerRecordCount.textContent = `${uploadedData.length} records`;
        updateHeaderStatus('connected', 'Sample Mode', uploadedData.length);
        updateStats();
        updateLastRefreshTime();
        resetCountdown();
        
        // Set flag that data has been loaded
        dataLoaded = true;
    }
    
    // Update stats
    function updateStats() {
        totalRecords.textContent = uploadedData.length.toLocaleString();
        
        const activeCount = uploadedData.filter(item => 
            item.status && item.status.toLowerCase().includes('active')
        ).length;
        activeUsers.textContent = activeCount.toLocaleString();
        
        totalBranches.textContent = branches.size.toLocaleString();
    }
    
    // ===== SEARCH FUNCTION - EXACT MATCH ONLY =====
    function performSearch(searchTerm) {
        if (!searchTerm || uploadedData.length === 0) return;
        
        headerSearchBtn.disabled = true;
        
        setTimeout(() => {
            // Clean the search term - remove extra spaces
            const cleanSearchTerm = searchTerm.trim();
            
            // Filter for EXACT matches only (not partial)
            const filteredResults = uploadedData.filter(item => {
                // Get clean values for comparison
                const userId = item.userId ? item.userId.trim() : '';
                const number = item.number ? item.number.trim() : '';
                
                // Check for EXACT match using ===
                return userId === cleanSearchTerm || number === cleanSearchTerm;
            });
            
            currentResults = filteredResults;
            
            resultsSection.classList.remove('hidden');
            resultsSection.classList.add('visible');
            countBadge.textContent = filteredResults.length.toLocaleString();
            
            if (filteredResults.length > 0) {
                displayResults(filteredResults);
                resultsTableContainer.classList.remove('hidden');
                resultsActions.classList.remove('hidden');
                noResultsMessage.classList.add('hidden');
                showNotification(`Found ${filteredResults.length} exact matching records`, 'success');
            } else {
                resultsTableBody.innerHTML = '';
                resultsTableContainer.classList.add('hidden');
                resultsActions.classList.add('hidden');
                noResultsMessage.classList.remove('hidden');
                noResultsText.textContent = `No exact matches found for "${searchTerm}"`;
                showNotification('No exact matches found', 'info');
            }
            
            headerSearchBtn.disabled = false;
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
    
    // Display results
    function displayResults(results) {
        resultsTableBody.innerHTML = '';
        
        results.forEach(item => {
            const row = document.createElement('tr');
            
            let statusClass = 'status-active';
            if (item.status) {
                const statusLower = item.status.toLowerCase();
                if (statusLower.includes('inactive')) statusClass = 'status-inactive';
                else if (statusLower.includes('pending')) statusClass = 'status-pending';
            }
            
            row.innerHTML = `
                <td>${escapeHtml(item.userId || '')}</td>
                <td>${item.number || ''}</td>
                <td>${escapeHtml(item.branch || 'Unknown')}</td>
                <td><span class="${statusClass}">${escapeHtml(item.status || 'Active')}</span></td>
            `;
            
            resultsTableBody.appendChild(row);
        });
    }
    
    // Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Hide results
    function hideResultsSection() {
        resultsSection.classList.remove('visible');
        resultsSection.classList.add('hidden');
        headerSearchInput.value = '';
        currentResults = [];
        resultsTableBody.innerHTML = '';
        resultsTableContainer.classList.add('hidden');
        resultsActions.classList.add('hidden');
        noResultsMessage.classList.add('hidden');
        countBadge.textContent = '0';
    }
    
    // Show notification
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Add notification styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed; top: 20px; right: 20px; background: white;
            border-radius: 8px; padding: 15px 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.15);
            z-index: 9999; min-width: 300px; animation: slideIn 0.3s ease;
            border-left: 4px solid #4caf50;
        }
        .notification-warning { border-left-color: #ff9800; }
        .notification-info { border-left-color: #2196f3; }
        .notification-content { display: flex; align-items: center; gap: 10px; }
        .notification-success i { color: #4caf50; }
        .notification-warning i { color: #ff9800; }
        .notification-info i { color: #2196f3; }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
});
