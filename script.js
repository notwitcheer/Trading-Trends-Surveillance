class CryptoTracker {
    constructor() {
        this.baseUrl = 'https://api.coingecko.com/api/v3';
        this.watchedTokens = ['berachain-bera', 'hyperliquid'];
        this.tokenNames = {
            'berachain-bera': 'BERA',
            'hyperliquid': 'HYPE'
        };
        this.autoRefresh = true;
        this.refreshInterval = 30000; // 30 seconds
        this.refreshTimer = null;
        
        this.init();
    }

    async init() {
        this.updateTimestamp();
        this.startTimestampUpdater();
        this.setupEventListeners();
        await this.loadAllData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refresh-btn');
        const toggleAutoBtn = document.getElementById('toggle-auto');

        refreshBtn.addEventListener('click', () => this.manualRefresh());
        toggleAutoBtn.addEventListener('click', () => this.toggleAutoRefresh());
    }

    updateTimestamp() {
        const now = new Date();
        const timestamp = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        document.getElementById('current-time').textContent = `[${timestamp}]`;
    }

    startTimestampUpdater() {
        setInterval(() => this.updateTimestamp(), 1000);
    }

    async makeRequest(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getSimplePrice(coins, vsCurrencies) {
        const params = {
            ids: coins.join(','),
            vs_currencies: vsCurrencies.join(','),
            include_24hr_change: 'true',
            include_24hr_vol: 'true',
            include_market_cap: 'true'
        };

        return await this.makeRequest('/simple/price', params);
    }

    async getTrendingCoins() {
        return await this.makeRequest('/search/trending');
    }

    async getMarketData(vsCurrency = 'usd', perPage = 5) {
        const params = {
            vs_currency: vsCurrency,
            order: 'market_cap_desc',
            per_page: perPage,
            page: 1,
            sparkline: 'false'
        };

        return await this.makeRequest('/coins/markets', params);
    }

    formatPrice(price) {
        if (price < 0.01) {
            return `$${price.toFixed(8)}`;
        } else if (price < 1) {
            return `$${price.toFixed(6)}`;
        } else {
            return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }

    formatLargeNumber(num) {
        if (num >= 1e12) {
            return `$${(num / 1e12).toFixed(1)}T`;
        } else if (num >= 1e9) {
            return `$${(num / 1e9).toFixed(1)}B`;
        } else if (num >= 1e6) {
            return `$${(num / 1e6).toFixed(1)}M`;
        } else if (num >= 1e3) {
            return `$${(num / 1e3).toFixed(1)}K`;
        } else {
            return `$${num.toLocaleString()}`;
        }
    }

    getChangeClass(change) {
        if (change > 0) return 'change-positive';
        if (change < 0) return 'change-negative';
        return 'change-neutral';
    }

    getTrendArrow(change) {
        if (change > 0) return '↗';
        if (change < 0) return '↘';
        return '→';
    }

    async loadMonitoredTokens() {
        const container = document.getElementById('monitored-tokens');
        
        try {
            const data = await this.getSimplePrice(this.watchedTokens, ['usd']);
            
            if (!data || Object.keys(data).length === 0) {
                container.innerHTML = '<div class="error-message">NO TARGET DATA AVAILABLE</div>';
                return;
            }

            let html = '';
            
            this.watchedTokens.forEach(tokenId => {
                if (data[tokenId]) {
                    const tokenData = data[tokenId];
                    const name = this.tokenNames[tokenId] || tokenId.toUpperCase();
                    const price = tokenData.usd;
                    const change = tokenData.usd_24h_change || 0;
                    const volume = tokenData.usd_24h_vol || 0;
                    const marketCap = tokenData.usd_market_cap || 0;

                    html += `
                        <div class="token-card">
                            <div class="token-header">
                                <div class="token-name">${name}</div>
                                <div class="token-symbol">${tokenId}</div>
                            </div>
                            <div class="token-price">${this.formatPrice(price)}</div>
                            <div class="token-stats">
                                <div class="stat-item">
                                    <span class="stat-label">24h Change</span>
                                    <span class="stat-value ${this.getChangeClass(change)}">
                                        ${this.getTrendArrow(change)} ${change.toFixed(2)}%
                                    </span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">24h Volume</span>
                                    <span class="stat-value">${this.formatLargeNumber(volume)}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Market Cap</span>
                                    <span class="stat-value">${this.formatLargeNumber(marketCap)}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Status</span>
                                    <span class="stat-value change-positive">ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    const name = this.tokenNames[tokenId] || tokenId.toUpperCase();
                    html += `
                        <div class="token-card">
                            <div class="token-header">
                                <div class="token-name">${name}</div>
                                <div class="token-symbol">${tokenId}</div>
                            </div>
                            <div class="error-message">TARGET NOT AVAILABLE</div>
                        </div>
                    `;
                }
            });

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading monitored tokens:', error);
            container.innerHTML = '<div class="error-message">SURVEILLANCE SYSTEM ERROR</div>';
        }
    }

    async loadMajorCryptos() {
        const container = document.getElementById('major-cryptos');
        
        try {
            const allCoins = ['bitcoin', 'ethereum', ...this.watchedTokens];
            const data = await this.getSimplePrice(allCoins, ['usd']);
            
            if (!data || Object.keys(data).length === 0) {
                container.innerHTML = '<div class="error-message">MAJOR ASSETS DATA UNAVAILABLE</div>';
                return;
            }

            let html = '';
            
            allCoins.forEach(coinId => {
                if (data[coinId]) {
                    const coinData = data[coinId];
                    const displayName = this.tokenNames[coinId] || coinId.toUpperCase();
                    const price = coinData.usd;
                    const change = coinData.usd_24h_change || 0;

                    html += `
                        <div class="crypto-item">
                            <div class="item-info">
                                <div class="item-name">${displayName}</div>
                                <div class="item-symbol">${coinId}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="item-price">${this.formatPrice(price)}</div>
                                <div class="item-change ${this.getChangeClass(change)}">
                                    ${this.getTrendArrow(change)} ${change.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading major cryptos:', error);
            container.innerHTML = '<div class="error-message">MAJOR ASSETS SCAN FAILED</div>';
        }
    }

    async loadTopCryptos() {
        const container = document.getElementById('top-cryptos');
        
        try {
            const data = await this.getMarketData('usd', 5);
            
            if (!data || data.length === 0) {
                container.innerHTML = '<div class="error-message">TOP ASSETS DATA UNAVAILABLE</div>';
                return;
            }

            let html = '';
            
            data.forEach((coin, index) => {
                html += `
                    <div class="top-item">
                        <div class="item-info">
                            <div class="item-name">${index + 1}. ${coin.name}</div>
                            <div class="item-symbol">${coin.symbol.toUpperCase()}</div>
                        </div>
                        <div class="item-price">${this.formatPrice(coin.current_price)}</div>
                    </div>
                `;
            });

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading top cryptos:', error);
            container.innerHTML = '<div class="error-message">TOP ASSETS SCAN FAILED</div>';
        }
    }

    async loadTrendingCryptos() {
        const container = document.getElementById('trending-cryptos');
        
        try {
            const data = await this.getTrendingCoins();
            
            if (!data || !data.coins || data.coins.length === 0) {
                container.innerHTML = '<div class="error-message">TRENDING DATA UNAVAILABLE</div>';
                return;
            }

            let html = '';
            
            data.coins.slice(0, 5).forEach((coin, index) => {
                const item = coin.item;
                html += `
                    <div class="trending-item">
                        <div class="item-info">
                            <div class="item-name">${index + 1}. ${item.name}</div>
                            <div class="item-symbol">${item.symbol}</div>
                        </div>
                        <div class="change-positive">TRENDING</div>
                    </div>
                `;
            });

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading trending cryptos:', error);
            container.innerHTML = '<div class="error-message">TREND DETECTION FAILED</div>';
        }
    }

    async loadAllData() {
        console.log('Loading all cryptocurrency data...');
        
        // Update header status
        const typingText = document.querySelector('.typing-text');
        typingText.textContent = 'SYNCHRONIZING DATA STREAMS...';
        
        try {
            await Promise.all([
                this.loadMonitoredTokens(),
                this.loadMajorCryptos(),
                this.loadTopCryptos(),
                this.loadTrendingCryptos()
            ]);
            
            typingText.textContent = 'SURVEILLANCE ACTIVE - ALL SYSTEMS OPERATIONAL';
            console.log('All data loaded successfully');
            
        } catch (error) {
            console.error('Error loading data:', error);
            typingText.textContent = 'SYSTEM ERROR - PARTIAL DATA AVAILABLE';
        }
    }

    async manualRefresh() {
        const btn = document.getElementById('refresh-btn');
        const originalText = btn.textContent;
        
        btn.textContent = 'REFRESHING...';
        btn.disabled = true;
        
        try {
            await this.loadAllData();
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    toggleAutoRefresh() {
        const btn = document.getElementById('toggle-auto');
        this.autoRefresh = !this.autoRefresh;
        
        if (this.autoRefresh) {
            btn.textContent = 'DISABLE AUTO';
            this.startAutoRefresh();
        } else {
            btn.textContent = 'ENABLE AUTO';
            this.stopAutoRefresh();
        }
    }

    startAutoRefresh() {
        if (this.autoRefresh && !this.refreshTimer) {
            this.refreshTimer = setInterval(() => {
                console.log('Auto-refreshing data...');
                this.loadAllData();
            }, this.refreshInterval);
        }
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}

// Handle CORS issues with a proxy service for production
class CORSProxyTracker extends CryptoTracker {
    constructor() {
        super();
        this.proxyUrl = 'https://api.allorigins.win/raw?url=';
    }

    async makeRequest(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        try {
            // Try direct request first
            const response = await fetch(url);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('Direct request failed, trying with CORS proxy...');
        }

        try {
            // Fallback to CORS proxy
            const proxyResponse = await fetch(`${this.proxyUrl}${encodeURIComponent(url.toString())}`);
            if (!proxyResponse.ok) {
                throw new Error(`Proxy request failed! status: ${proxyResponse.status}`);
            }
            return await proxyResponse.json();
        } catch (error) {
            console.error('Both direct and proxy requests failed:', error);
            throw error;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Crypto Terminal...');
    
    // Try regular tracker first, fallback to CORS proxy if needed
    try {
        window.cryptoTracker = new CryptoTracker();
    } catch (error) {
        console.log('Switching to CORS proxy mode...');
        window.cryptoTracker = new CORSProxyTracker();
    }
});

// Handle visibility change to pause/resume when tab is not active
document.addEventListener('visibilitychange', () => {
    if (window.cryptoTracker) {
        if (document.hidden) {
            window.cryptoTracker.stopAutoRefresh();
        } else {
            window.cryptoTracker.startAutoRefresh();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.cryptoTracker) {
        window.cryptoTracker.stopAutoRefresh();
    }
});