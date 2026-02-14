document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const headerSearchInput = document.getElementById('headerSearchInput');
    const headerFileInfo = document.getElementById('headerFileInfo');
    const headerFileName = document.getElementById('headerFileName');
    const headerRecordCount = document.getElementById('headerRecordCount');
    const loadGoogleSheetsDataBtn = document.getElementById('loadGoogleSheetsDataBtn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const headerRecordBadge = document.getElementById('headerRecordBadge');
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
    const googleSheetsViewLink = document.getElementById('googleSheetsViewLink');
    
    // Search tags
    const searchTags = document.querySelectorAll('.search-tag');
    
    // Application state
    let uploadedData = [];
    let currentResults = [];
    let branches = new Set();
    let lastSearchTerm = '';
    let isLoading = false;
    
    // ===== YOUR CORRECT CONFIGURATION =====
    const SPREADSHEET_ID = '1p-fxYDbWxajcqmeKlTbOV7oLbRTD2z6J3ickMAnS-lg';
    const GOOGLE_API_KEY = 'AIzaSyDkJbduR9SWGEuIu7pFlng_SYJBQxOf5m0';
    const VIEW_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=0`;
    
    // Batch size - optimal for large datasets
    const BATCH_SIZE = 10000;
    
    // Initialize
    loadDataFromGoogleSheets();
    
    // Event Listeners
    searchTags.forEach(tag => {
        tag.addEventListener('click', function() {
            headerSearchInput.value = this.getAttribute('data-search');
            performSearch(headerSearchInput.value);
        });
    });
    
    loadGoogleSheetsDataBtn.addEventListener('click', loadDataFromGoogleSheets);
    
    headerSearchBtn.addEventListener('click', () => {
        if (headerSearchInput.value.trim()) performSearch(headerSearchInput.value.trim());
    });
    
    headerSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && headerSearchInput.value.trim()) {
            performSearch(headerSearchInput.value.trim());
        }
    });
    
    exportBtn.addEventListener('click', () => {
        if (currentResults.length > 0) exportToCSV(currentResults);
    });
    
    clearBtn.addEventListener('click', hideResultsSection);
    
    refreshSearchBtn.addEventListener('click', () => {
        if (lastSearchTerm) {
            headerSearchInput.value = lastSearchTerm;
            performSearch(lastSearchTerm);
        }
    });
    
    if (googleSheetsViewLink) {
        googleSheetsViewLink.href = VIEW_URL;
    }
    
    // Update header status
    function updateHeaderStatus(status, message, recordCount = null) {
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
        }
    }
    
    // Main function to load data in batches
    async function loadDataFromGoogleSheets() {
        if (isLoading) return;
        isLoading = true;
        
        headerFileName.textContent = 'Loading data...';
        headerRecordCount.textContent = 'Please wait...';
        loadGoogleSheetsDataBtn.innerHTML = '<div class="loading-spinner"></div> Loading...';
        loadGoogleSheetsDataBtn.disabled = true;
        
        updateHeaderStatus('connecting', 'Loading records...');
        showNotification('Starting to load 296,000+ records...', 'info');
        
        try {
            // First, get the total number of rows
            const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${GOOGLE_API_KEY}`;
            const metadataResponse = await fetch(metadataUrl);
            
            if (!metadataResponse.ok) {
                throw new Error('Failed to get sheet metadata');
            }
            
            const metadata = await metadataResponse.json();
            const sheetName = metadata.sheets[0].properties.title;
            const totalRows = metadata.sheets[0].properties.gridProperties.rowCount;
            
            // Update header with total count
            headerFileName.textContent = 'Google Sheets Data';
            headerRecordCount.textContent = `${(totalRows-1).toLocaleString()} records`;
            updateHeaderStatus('connecting', 'Loading...', (totalRows-1));
            
            // Load data in batches
            uploadedData = [];
            branches.clear();
            
            // Get headers first
            const headers = await getHeaders(sheetName);
            
            // Start from row 2 (assuming row 1 is headers)
            for (let startRow = 2; startRow <= totalRows; startRow += BATCH_SIZE) {
                const endRow = Math.min(startRow + BATCH_SIZE - 1, totalRows);
                
                // Use range query to fetch only the needed rows
                const range = `${sheetName}!A${startRow}:Z${endRow}`;
                const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}&majorDimension=ROWS`;
                
                const batchResponse = await fetchWithRetry(batchUrl, 3);
                
                if (batchResponse.ok) {
                    const batchData = await batchResponse.json();
                    
                    if (batchData.values) {
                        // Process this batch
                        processBatch(batchData.values, headers);
                        
                        // Update progress silently
                        headerRecordCount.textContent = `${uploadedData.length.toLocaleString()} records`;
                        totalRecords.textContent = uploadedData.length.toLocaleString();
                    }
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (uploadedData.length > 0) {
                updateHeaderStatus('connected', 'Connected', uploadedData.length);
                showNotification(`✅ Successfully loaded ${uploadedData.length.toLocaleString()} records`, 'success');
                updateStats();
            } else {
                throw new Error('No data loaded');
            }
            
        } catch (error) {
            console.error('Loading failed:', error);
            updateHeaderStatus('error', 'Connection Failed');
            loadSampleData();
            showNotification(`❌ Error: ${error.message}`, 'warning');
        }
        
        loadGoogleSheetsDataBtn.innerHTML = '<i class="fab fa-google"></i> Refresh Data';
        loadGoogleSheetsDataBtn.disabled = false;
        isLoading = false;
    }
    
    // Helper function to get headers
    async function getHeaders(sheetName) {
        try {
            const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName + '!1:1')}?key=${GOOGLE_API_KEY}`;
            const response = await fetch(headerUrl);
            const data = await response.json();
            return data.values ? data.values[0] : [];
        } catch (error) {
            return [];
        }
    }
    
    // Process a batch of data
    function processBatch(rows, headers) {
        for (const row of rows) {
            if (!row || row.length < 2) continue;
            
            // Safely get values with null checks
            let userId = '';
            let number = '';
            let branch = 'Unknown';
            let status = 'Active';
            
            if (headers.length > 0) {
                // Try to find columns by header name
                const userIdIdx = headers.findIndex(h => 
                    h && h.toString().toLowerCase().includes('user') || 
                    h && h.toString().toLowerCase().includes('id')
                );
                const numberIdx = headers.findIndex(h => 
                    h && h.toString().toLowerCase().includes('number') || 
                    h && h.toString().toLowerCase().includes('phone') || 
                    h && h.toString().toLowerCase().includes('mobile')
                );
                const branchIdx = headers.findIndex(h => 
                    h && h.toString().toLowerCase().includes('branch') || 
                    h && h.toString().toLowerCase().includes('location')
                );
                const statusIdx = headers.findIndex(h => 
                    h && h.toString().toLowerCase().includes('status')
                );
                
                userId = userIdIdx !== -1 && row[userIdIdx] ? row[userIdIdx].toString().trim() : (row[0] ? row[0].toString().trim() : '');
                number = numberIdx !== -1 && row[numberIdx] ? row[numberIdx].toString().trim() : (row[1] ? row[1].toString().trim() : '');
                branch = branchIdx !== -1 && row[branchIdx] ? row[branchIdx].toString().trim() : (row[2] ? row[2].toString().trim() : 'Unknown');
                status = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].toString().trim() : (row[3] ? row[3].toString().trim() : 'Active');
            } else {
                // Position-based mapping with null checks
                userId = row[0] ? row[0].toString().trim() : '';
                number = row[1] ? row[1].toString().trim() : '';
                branch = row[2] ? row[2].toString().trim() : 'Unknown';
                status = row[3] ? row[3].toString().trim() : 'Active';
            }
            
            // Clean phone number - remove any non-digit characters
            number = cleanPhoneNumber(number);
            
            if (userId && number) {
                uploadedData.push({
                    userId: userId,
                    number: number,
                    branch: branch,
                    status: status
                });
                
                if (branch && branch !== 'Unknown') branches.add(branch);
            }
        }
    }
    
    // Clean phone number to remove formatting
    function cleanPhoneNumber(number) {
        if (!number) return '';
        // Remove all non-digit characters
        return number.replace(/\D/g, '');
    }
    
    // Format phone number for display (without dashes, just the number)
    function formatPhoneNumber(number) {
        if (!number) return '';
        // Just return the number without any formatting
        return number;
    }
    
    // Fetch with retry logic
    async function fetchWithRetry(url, maxRetries) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url);
                if (response.status === 429) { // Rate limited
                    const waitTime = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                return response;
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('Max retries exceeded');
    }
    
    // Load sample data as fallback
    function loadSampleData() {
        uploadedData = [
            { userId: 'SAMPLE001', number: '918096475595', branch: 'Head Office', status: 'Active' },
            { userId: 'SAMPLE002', number: '918096475596', branch: 'Head Office', status: 'Active' },
            { userId: 'SAMPLE003', number: '918096475597', branch: 'Mumbai', status: 'Active' }
        ];
        branches.clear();
        uploadedData.forEach(item => {
            if (item.branch) branches.add(item.branch);
        });
        updateStats();
        updateHeaderStatus('connected', 'Sample Mode', uploadedData.length);
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
    
    // Perform search
    function performSearch(searchTerm) {
        if (!searchTerm || uploadedData.length === 0) return;
        
        lastSearchTerm = searchTerm;
        headerSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        headerSearchBtn.disabled = true;
        
        setTimeout(() => {
            const cleanSearchTerm = searchTerm.toLowerCase();
            const filteredResults = uploadedData.filter(item => {
                // Add null checks for all fields
                const userId = item.userId ? item.userId.toLowerCase() : '';
                const number = item.number ? item.number.toString() : '';
                
                return userId.includes(cleanSearchTerm) || number.includes(cleanSearchTerm);
            });
            
            currentResults = filteredResults;
            
            resultsSection.classList.remove('hidden');
            resultsSection.classList.add('visible');
            countBadge.textContent = filteredResults.length.toLocaleString();
            countText.textContent = filteredResults.length === 1 ? 'RESULT FOUND' : 'RESULTS FOUND';
            
            if (filteredResults.length > 0) {
                displayResults(filteredResults.slice(0, 100));
                resultsTableContainer.classList.remove('hidden');
                resultsActions.classList.remove('hidden');
                noResultsMessage.classList.add('hidden');
            } else {
                resultsTableBody.innerHTML = '';
                resultsTableContainer.classList.add('hidden');
                resultsActions.classList.add('hidden');
                noResultsMessage.classList.remove('hidden');
                noResultsText.textContent = `No records found for "${searchTerm}"`;
            }
            
            headerSearchBtn.innerHTML = '<i class="fas fa-search"></i>';
            headerSearchBtn.disabled = false;
            
            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
    
    // Display results
    function displayResults(results) {
        resultsTableBody.innerHTML = '';
        
        results.forEach(item => {
            const row = document.createElement('tr');
            
            // Add null checks for status
            let statusClass = 'status-active';
            if (item.status) {
                const statusLower = item.status.toLowerCase();
                if (statusLower.includes('inactive') || statusLower.includes('expired')) {
                    statusClass = 'status-inactive';
                } else if (statusLower.includes('pending') || statusLower.includes('waiting')) {
                    statusClass = 'status-pending';
                }
            }
            
            row.innerHTML = `
                <td>${escapeHtml(item.userId || '')}</td>
                <td>${formatPhoneNumber(item.number || '')}</td>
                <td>${escapeHtml(item.branch || 'Unknown')}</td>
                <td><span class="${statusClass}">${escapeHtml(item.status || 'Active')}</span></td>
            `;
            
            resultsTableBody.appendChild(row);
        });
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        countBadge.textContent = '0';
        countText.textContent = 'RESULTS FOUND';
    }
    
    // Export to CSV
    function exportToCSV(data) {
        let csv = "UserID,Number,Branch,Status\n";
        data.forEach(item => {
            csv += `"${item.userId || ''}","${item.number || ''}","${item.branch || 'Unknown'}","${item.status || 'Active'}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `search_results_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification(`Exported ${data.length} records`, 'success');
    }
    
    // Notification system
    function showNotification(message, type) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
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
        
        // Add styles if not present
        if (!document.getElementById('notif-styles')) {
            const style = document.createElement('style');
            style.id = 'notif-styles';
            style.textContent = `
                .notification {
                    position: fixed; top: 20px; right: 20px; background: white;
                    border-radius: 8px; padding: 15px 20px; display: flex;
                    align-items: center; justify-content: space-between;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.15); z-index: 1000;
                    min-width: 300px; max-width: 400px;
                    animation: slideIn 0.3s ease; border-left: 4px solid #4caf50;
                }
                .notification-warning { border-left-color: #ff9800; }
                .notification-info { border-left-color: #2196f3; }
                .notification-content { display: flex; align-items: center; gap: 10px; }
                .notification-close {
                    background: none; border: none; cursor: pointer; color: #888;
                    margin-left: 15px; width: 24px; height: 24px;
                }
                .notification-close:hover { color: #333; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0%); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0%); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Close button functionality
        notification.querySelector('.notification-close').onclick = () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 250);
        };
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 250);
            }
        }, 5000);
    }
});
