import requests
import json
from datetime import datetime


class CoinGeckoAPI:
    def __init__(self):
        self.base_url = 'https://api.coingecko.com/api/v3'
    
    def get_simple_price(self, coins, vs_currencies):
        coins_str = ','.join(coins)
        currencies_str = ','.join(vs_currencies)
        
        url = f"{self.base_url}/simple/price"
        params = {
            'ids': coins_str,
            'vs_currencies': currencies_str,
            'include_24hr_change': 'true',
            'include_24hr_vol': 'true',
            'include_market_cap': 'true'
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            return None
    
    def get_coin_info(self, coin_id):
        url = f"{self.base_url}/coins/{coin_id}"
        
        response = requests.get(url)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            return None
    
    def get_trending_coins(self):
        url = f"{self.base_url}/search/trending"
        
        response = requests.get(url)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            return None
    
    def get_market_data(self, vs_currency='usd', per_page=10):
        url = f"{self.base_url}/coins/markets"
        params = {
            'vs_currency': vs_currency,
            'order': 'market_cap_desc',
            'per_page': per_page,
            'page': 1,
            'sparkline': 'false'
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            return None

    def monitor_specific_tokens(self, token_ids, token_names):
        print(f"\n{'='*60}")
        print(f"MONITORING TOKENS - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        prices = self.get_simple_price(token_ids, ['usd'])
        
        if prices:
            for token_id in token_ids:
                if token_id in prices:
                    data = prices[token_id]
                    name = token_names.get(token_id, token_id.upper())
                    
                    print(f"\n{name} ({token_id})")
                    print("-" * 30)
                    
                    # Current price
                    if 'usd' in data:
                        price = data['usd']
                        print(f"Prix: ${price:,.8f}")
                    
                    # 24-hour change
                    if 'usd_24h_change' in data:
                        change = data['usd_24h_change']
                        trend = "↗" if change > 0 else "↘" if change < 0 else "→"
                        print(f"24h: {trend} {change:+.2f}%")
                    
                    # Volume and Market Cap
                    if 'usd_24h_vol' in data:
                        volume = data['usd_24h_vol']
                        print(f"Volume 24h: ${volume:,.0f}")
                    
                    if 'usd_market_cap' in data:
                        market_cap = data['usd_market_cap']
                        print(f"Market Cap: ${market_cap:,.0f}")
                else:
                    name = token_names.get(token_id, token_id.upper())
                    print(f"\n{name} ({token_id})")
                    print("-" * 30)
                    print("Token not available or error")
        else:
            print("Error retrieving data")


# Using the API
if __name__ == "__main__":
    api = CoinGeckoAPI()
    
    # Configuring tokens to monitor
    watched_tokens = ['berachain-bera', 'hyperliquid']
    token_names = {
        'berachain-bera': 'BERA',
        'hyperliquid': 'HYPE'
    }
    
    # KEY MONITORING - BERA and HYPE
    api.monitor_specific_tokens(watched_tokens, token_names)
    
    # Prices of major cryptocurrencies + BERA and HYPE
    print(f"\n{'='*60}")
    print("MAJOR CRYPTO + TOKENS BEING MONITORED")
    print(f"{'='*60}")
    
    all_coins = ['bitcoin', 'ethereum'] + watched_tokens
    prices = api.get_simple_price(all_coins, ['usd'])
    if prices:
        for coin, data in prices.items():
            display_name = token_names.get(coin, coin.upper())
            print(f"\n{display_name}:")
            for key, value in data.items():
                if 'usd_24h_change' in key:
                    trend = "↗" if value > 0 else "↘" if value < 0 else "→"
                    print(f"  24h change: {trend} {value:.2f}%")
                elif key == 'usd':
                    print(f"  USD: ${value:,.8f}")
        print()
    
    # Top 5 cryptocurrencies by market capitalization
    print(f"{'='*60}")
    print("TOP 5 CRYPTOCURRENCIES")
    print(f"{'='*60}")
    market_data = api.get_market_data(per_page=5)
    if market_data:
        for i, coin in enumerate(market_data, 1):
            print(f"{i}. {coin['name']} ({coin['symbol'].upper()}): ${coin['current_price']:,.2f}")
        print()
    
    # Cryptocurrencies on trend
    print(f"{'='*60}")
    print("TRENDING CRYPTOCURRENCIES")
    print(f"{'='*60}")
    trending = api.get_trending_coins()
    if trending:
        for i, coin in enumerate(trending['coins'][:5], 1):
            print(f"{i}. {coin['item']['name']} ({coin['item']['symbol']})")
        print()
    
    # RÃ‰SUMÃ‰ RAPIDE des tokens surveillÃ©s
    print(f"{'='*60}")
    print("END OF MONITORING")
    print(f"{'='*60}")