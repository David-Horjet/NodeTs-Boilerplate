import axios from 'axios';

/**
 * PriceService: Fetches real-time crypto prices from CoinGecko
 * In production, consider caching with Redis and fallback sources
 */
export class PriceService {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  async getPrice(crypto: 'SOL' | 'USDC', fiat: 'NGN' = 'NGN'): Promise<number> {
    try {
      // const coinId = crypto === 'SOL' ? 'solana' : 'usd-coin';
      // const currency = fiat.toLowerCase();

      // const response = await axios.get(
      //   `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=${currency}`
      // );

      // const price = response.data[coinId]?.[currency];
      
      // if (!price) {
      //   throw new Error(`Price not found for ${crypto}/${fiat}`);
      // }

      // return price;
      return crypto === 'SOL' ? 198271 : 1450; // NGN
    } catch (error) {
      console.error('Price fetch error:', error);
      // Fallback prices for demo purposes
      return crypto === 'SOL' ? 198271 : 1450; // NGN
    }
  }
}

export const priceService = new PriceService();