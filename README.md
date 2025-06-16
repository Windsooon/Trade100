


<div align="center">
  <h3 align="center">Trade100 Dashboard</h3>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#demo">Demo</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#deploy">Deployment</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#development-with-proxy">Development with Proxy</a></li>
      </ul>
    </li>
    <li><a href="#deployment">Deployment</a></li>
    <li><a href="#api-reference">API Reference</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project


Trade100 is a professional open-source trading interface for Polymarket prediction markets, built with Next.js and designed for both individual traders and institutional users.

### Demo

[https://trade100.vercel.app/](https://trade100.vercel.app/)

### Features

- **Professional Trading Interface**: Browse, filter, and analyze thousands of prediction markets with an intuitive, responsive design
- **Flexible Deployment**: Deploy locally for development or on cloud platforms like Vercel for production use
- **Advanced Charts**: Interactive price history charts with multiple timeframes and technical indicators
- **Proxy Support**: Built-in proxy configuration for development and restricted network environments

### Coming Soon

- **Dashboard Customization**: Personalize your trading workspace with custom layouts and widgets
- **AI-Powered Analysis**: Intelligent position analysis and risk management recommendations
- **Portfolio Tracking**: Comprehensive portfolio management and P&L tracking
- **Smart Alerts**: Customizable notifications for price movements and market events

<!-- DEPLOYMENT -->
## Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Windsooon/Trade100)

1. Click the deploy button above
2. Configure environment variables in Vercel (optional for basic usage)
3. Your dashboard will be live!


<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* Node.js 18 or higher
  ```sh
  node --version
  ```
* npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Clone the repository
   ```sh
   git clone https://github.com/Windsooon/Trade100
   ```
2. Navigate to the project directory
   ```sh
   cd Trade100
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Copy the environment file
   ```sh
   cp env.example .env.local
   ```
5. Configure your environment variables in `.env.local`
   ```env
   # For local development with proxy (if needed)
   ALL_PROXY=http://127.0.0.1:9988
   
   # Polymarket API URLs (defaults, usually don't need to change)
   NEXT_PUBLIC_POLYMARKET_API_URL=https://gamma-api.polymarket.com
   NEXT_PUBLIC_POLYMARKET_WS_URL=wss://ws-subscriptions-clob.polymarket.com
   
   # Trading Configuration (optional)
   POLYMARKET_PRIVATE_KEY=your_ethereum_private_key_for_trading
   ```
6. Start the development server
   ```sh
   npm run dev
   ```
7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Development with Proxy

If you're behind a firewall or need to route traffic through a proxy:

1. Set the proxy environment variable:
   ```sh
   export ALL_PROXY=http://127.0.0.1:9988
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```

The application will automatically detect and use the proxy for all API requests.


### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ALL_PROXY` | Proxy URL for development | No | - |
| `NEXT_PUBLIC_POLYMARKET_API_URL` | Polymarket API endpoint | No | `https://gamma-api.polymarket.com` |
| `NEXT_PUBLIC_POLYMARKET_WS_URL` | WebSocket endpoint | No | `wss://ws-subscriptions-clob.polymarket.com` |
| `POLYMARKET_PRIVATE_KEY` | Ethereum private key for trading | No* | - |

*Required only for trading functionality


<!-- ROADMAP -->
## Roadmap

- [x] Basic market browsing and filtering
- [x] Real-time price updates
- [x] Dark mode support
- [x] Responsive design
- [x] Order book integration
- [ ] Trading functionality
- [ ] Portfolio tracking
- [ ] Advanced charting tools
- [ ] Mobile app
- [ ] Multi-language support
    - [ ] Spanish
    - [ ] French
    - [ ] German

See the [open issues](https://github.com/Windsooon/Trade100/issues) for a full list of proposed features (and known issues).


<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.