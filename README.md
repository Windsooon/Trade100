<div align="center">
  <h3 align="center">Trade100 Dashboard</h3>

  <p align="center">
    An open-source trading dashboard for Polymarket prediction markets
    <br />
    <a href="#about-the-project"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://trade100-dashboard.vercel.app">View Demo</a>
    ·
    <a href="https://github.com/yourusername/trade100-dashboard/issues">Report Bug</a>
    ·
    <a href="https://github.com/yourusername/trade100-dashboard/issues">Request Feature</a>
  </p>
</div>

<!-- PROJECT SHIELDS -->
<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
        <li><a href="#features">Features</a></li>
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
    <li><a href="#usage">Usage</a></li>
    <li><a href="#deployment">Deployment</a></li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#api-reference">API Reference</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

[![Trade100 Dashboard Screen Shot][product-screenshot]](https://trade100-dashboard.vercel.app)

Trade100 Dashboard is a high-performance, open-source trading interface for Polymarket prediction markets. Built with modern web technologies, it provides traders with real-time market data, advanced filtering capabilities, and a responsive user experience.

The dashboard addresses the need for a fast, reliable interface to browse and analyze thousands of prediction markets with instant filtering and sorting capabilities.

### Built With

* [![Next][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Tailwind CSS][TailwindCSS]][Tailwind-url]
* [![Vercel][Vercel]][Vercel-url]

### Features

- 🔍 **Market Discovery**: Browse and filter thousands of prediction markets
- ⭐ **Watchlist**: Track your favorite markets with real-time price updates  
- 📊 **Live Data**: Real-time price feeds directly from Polymarket API
- 💱 **Trading Interface**: Place market and limit orders directly from the dashboard
- 🎯 **Performance Focused**: In-memory data storage for instant filtering and sorting
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🌙 **Dark Mode**: Built-in theme switching with system preference detection
- 📈 **Advanced Charts**: Interactive price history and trading charts
- 🔄 **Real-time Updates**: WebSocket connections for live order book data

<p align="right">(<a href="#readme-top">back to top</a>)</p>

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
   git clone https://github.com/yourusername/trade100-dashboard.git
   ```
2. Navigate to the project directory
   ```sh
   cd trade100-dashboard
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

If you're in a region where Polymarket API is not directly accessible, the app automatically detects and uses proxy configuration:

1. **Set up your proxy** (e.g., on port 9988)
2. **Configure environment variables** in `.env.local`:
   ```env
   # Choose ONE of these options:
   ALL_PROXY=http://127.0.0.1:9988          # HTTP proxy (recommended)
   # ALL_PROXY=socks5://127.0.0.1:1080      # SOCKS5 proxy
   # HTTP_PROXY=http://127.0.0.1:9988       # Standard HTTP proxy
   ```
3. **Start development server**:
   ```sh
   npm run dev
   ```

**✨ Smart Proxy Detection**: The app automatically:
- Detects proxy configuration from environment variables
- Uses proxy only when configured (no code changes needed)
- Falls back to direct connection if proxy fails
- Works seamlessly in production without proxy

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

### Basic Usage

1. **Browse Markets**: Use the main dashboard to explore available prediction markets
2. **Filter & Search**: Apply filters by category, price range, or search terms
3. **View Details**: Click on any market to see detailed information and charts
4. **Track Favorites**: Add markets to your watchlist for quick access

### Advanced Features

- **Real-time Data**: Markets update automatically with live price feeds
- **Order Book**: View live bid/ask spreads and market depth
- **Price Charts**: Analyze historical price movements with interactive charts
- **Theme Switching**: Toggle between light and dark modes

_For more examples and detailed usage instructions, please refer to the [Documentation](https://github.com/yourusername/trade100-dashboard/wiki)_

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DEPLOYMENT -->
## Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/trade100-dashboard)

1. Click the deploy button above
2. Configure environment variables in Vercel (optional for basic usage)
3. Your dashboard will be live!

### Other Platforms

This is a standard Next.js application and can be deployed to:
- **Netlify**: Static site generation support
- **Railway**: Full-stack deployment
- **Render**: Container-based deployment
- **Any Node.js hosting platform**

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ARCHITECTURE -->
## Architecture

### Data Architecture

The dashboard uses an **in-memory caching strategy** that:

1. **Fetches all active events** from Polymarket API on first request (~1,200 events)
2. **Caches data in memory** for 5 minutes for lightning-fast filtering and sorting
3. **Auto-refreshes** cache when expired
4. **Enables instant search** across all markets without API delays

### Performance Benefits

- ⚡ **Instant filtering/sorting** - no API calls needed
- 🚀 **Fast initial load** - parallel API fetching strategy  
- 💾 **Memory efficient** - ~55MB total data size
- 🔄 **Smart caching** - balance between freshness and performance

### Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS, Radix UI
- **Data Storage**: In-memory caching with automatic refresh
- **State Management**: Zustand, React Query
- **Real-time Data**: WebSocket connections
- **Deployment**: Vercel, Docker support

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- API REFERENCE -->
## API Reference

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/markets` | GET | List events with filtering (cached) | `limit`, `offset`, `active`, `archived` |
| `/api/events/[id]` | GET | Get specific event details | `id` (event ID) |
| `/api/categories` | GET | Get market categories | None |
| `/api/price-history` | GET | Get historical price data | `market`, `interval`, `fidelity` |

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ALL_PROXY` | Proxy URL for development | No | - |
| `NEXT_PUBLIC_POLYMARKET_API_URL` | Polymarket API endpoint | No | `https://gamma-api.polymarket.com` |
| `NEXT_PUBLIC_POLYMARKET_WS_URL` | WebSocket endpoint | No | `wss://ws-subscriptions-clob.polymarket.com` |
| `POLYMARKET_PRIVATE_KEY` | Ethereum private key for trading | No* | - |

*Required only for trading functionality

<p align="right">(<a href="#readme-top">back to top</a>)</p>

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

See the [open issues](https://github.com/yourusername/trade100-dashboard/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Top contributors:

<a href="https://github.com/yourusername/trade100-dashboard/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=yourusername/trade100-dashboard" alt="contrib.rocks image" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Your Name - [@your_twitter](https://twitter.com/your_twitter) - email@example.com

Project Link: [https://github.com/yourusername/trade100-dashboard](https://github.com/yourusername/trade100-dashboard)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

Use this space to list resources you find helpful and would like to give credit to. I've included a few of my favorites to kick things off!

* [Choose an Open Source License](https://choosealicense.com)
* [GitHub Emoji Cheat Sheet](https://www.webpagefx.com/tools/emoji-cheat-sheet)
* [Malven's Flexbox Cheatsheet](https://flexbox.malven.co/)
* [Malven's Grid Cheatsheet](https://grid.malven.co/)
* [Img Shields](https://shields.io)
* [GitHub Pages](https://pages.github.com)
* [Font Awesome](https://fontawesome.com)
* [React Icons](https://react-icons.github.io/react-icons/search)
* [shadcn/ui](https://ui.shadcn.com/)
* [Polymarket API](https://docs.polymarket.com/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DISCLAIMER -->
## Disclaimer

This software is for educational and research purposes. Trading involves financial risk. Always do your own research and never trade with money you can't afford to lose.

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/yourusername/trade100-dashboard.svg?style=for-the-badge
[contributors-url]: https://github.com/yourusername/trade100-dashboard/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/yourusername/trade100-dashboard.svg?style=for-the-badge
[forks-url]: https://github.com/yourusername/trade100-dashboard/network/members
[stars-shield]: https://img.shields.io/github/stars/yourusername/trade100-dashboard.svg?style=for-the-badge
[stars-url]: https://github.com/yourusername/trade100-dashboard/stargazers
[issues-shield]: https://img.shields.io/github/issues/yourusername/trade100-dashboard.svg?style=for-the-badge
[issues-url]: https://github.com/yourusername/trade100-dashboard/issues
[license-shield]: https://img.shields.io/github/license/yourusername/trade100-dashboard.svg?style=for-the-badge
[license-url]: https://github.com/yourusername/trade100-dashboard/blob/master/LICENSE.txt
[product-screenshot]: images/screenshot.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TypeScript]: https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[TailwindCSS]: https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Vercel]: https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white
[Vercel-url]: https://vercel.com/
