# Blockchain Block Reaction System

A TypeScript application that monitors blockchain blocks via WebSocket and measures transaction confirmation times. The system watches for new blocks, sends transfer transactions, and tracks how many blocks it takes for each transaction to be confirmed.

## Features

-   🔌 **WebSocket Block Monitoring**: Real-time block notifications via WebSocket
-   ⏭️ **Smart Block Skipping**: Skips initial blocks via WebSocket to establish consistent connection
-   💸 **Automatic Transactions**: Sends transfer transactions on new block detection
-   ⛽ **Gas Data Caching**: Pre-fetches and caches gas data for instant transaction sending
-   📊 **Confirmation Metrics**: Tracks blocks to confirmation and timing data
-   🔄 **Reconnection Logic**: Automatic WebSocket reconnection on disconnection
-   🛡️ **Graceful Shutdown**: Proper cleanup and shutdown handling with Ctrl+C support

## Architecture

```
src/
├── index.ts                 # Main entry point
├── types/                   # TypeScript type definitions
│   └── index.ts
├── services/                # Core business logic
│   └── BlockchainService.ts # Main blockchain service
└── config/                  # Configuration management
    └── ConfigLoader.ts      # Environment variable loader
```

## Prerequisites

-   Node.js 18+
-   npm or yarn
-   Access to Ethereum RPC endpoint (e.g., Alchemy, Infura)
-   Private key for transaction signing
-   Some ETH for gas fees

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd event-reaction-rs
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment file and configure it:

```bash
cp env.example .env
```

4. Edit `.env` with your configuration:

```env
# Blockchain RPC URLs
WEBSOCKET_URL=wss://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
HTTP_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Wallet Configuration
PRIVATE_KEY=your_private_key_here
RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6

# Transaction Configuration
GAS_LIMIT=21000
GAS_PRICE_GWEI=20

# Block Monitoring Configuration
INITIAL_BLOCKS_TO_SKIP=10
TRANSACTION_COUNT=5
```

## Configuration Options

| Variable                 | Description                                  | Default | Required |
| ------------------------ | -------------------------------------------- | ------- | -------- |
| `WEBSOCKET_URL`          | WebSocket endpoint for block notifications   | -       | ✅       |
| `HTTP_RPC_URL`           | HTTP RPC endpoint for transaction operations | -       | ✅       |
| `PRIVATE_KEY`            | Private key for transaction signing          | -       | ✅       |
| `RECIPIENT_ADDRESS`      | Destination address for transfers            | -       | ✅       |
| `GAS_LIMIT`              | Gas limit for transactions                   | 21000   | ❌       |
| `GAS_PRICE_GWEI`         | Gas price in gwei (supports decimals)        | 20      | ❌       |
| `INITIAL_BLOCKS_TO_SKIP` | Blocks to wait before starting               | 10      | ❌       |
| `TRANSACTION_COUNT`      | Number of transactions to send               | 5       | ❌       |

## Usage

### WebSocket Version (Recommended)

#### Development Mode
```bash
npm run dev
```

#### Production Build
```bash
npm run build
npm start
```

### HTTP RPC Version (Alternative)

#### Development Mode
```bash
npm run dev:http
```

#### Production Build
```bash
npm run build
npm run start:http
```

### Clean Build

```bash
npm run clean
npm run build
```

## How It Works

1. **Initialization**: The system pre-fetches gas data and starts WebSocket monitoring immediately
2. **WebSocket Connection**: Connects to the blockchain WebSocket endpoint and subscribes to new block notifications
3. **Block Skipping**: The first N blocks (configurable) are skipped to establish a consistent connection
4. **Block Detection**: When a new block is detected after the skip period, the system immediately sends a transfer transaction using cached gas data
5. **Transaction Monitoring**: Continuously monitors pending transactions for confirmation
6. **Metrics Collection**: Records confirmation times, block counts, and gas usage
7. **Summary Report**: Provides detailed analysis of all transaction confirmations

### Gas Data & Nonce Caching

The system implements intelligent caching to minimize transaction latency:

-   **Pre-fetching**: Gas data and nonce are fetched when the service starts
-   **Gas Caching**: Gas prices are cached for 30 seconds to avoid repeated API calls
-   **Nonce Caching**: Nonce values are cached for 1 minute with local incrementation
-   **Background Refresh**: Both gas data and nonce are automatically refreshed every 20 seconds
-   **Instant Transactions**: New blocks trigger immediate transactions using cached data

### Smart Block Skipping

Instead of waiting for blocks to arrive, the system:

-   **Immediate Start**: Begins WebSocket monitoring right away
-   **Skip Logic**: Counts and skips the first N blocks (configurable via `INITIAL_BLOCKS_TO_SKIP`)
-   **Efficient Processing**: Only processes blocks after the skip period
-   **Real-time Monitoring**: No delays or polling - pure WebSocket-based monitoring

### Transaction Management

The system ensures precise transaction control:

-   **Pre-send Validation**: Checks transaction count before sending (not after confirmation)
-   **Immediate Counting**: Increments counter as soon as transaction is sent
-   **No Over-sending**: Stops sending when limit is reached, regardless of confirmation status
-   **Status Tracking**: Provides real-time counts of sent vs. confirmed transactions

### Graceful Shutdown

The system handles shutdown signals properly:

-   **First Ctrl+C**: Gracefully stops the service and waits for pending transactions
-   **Second Ctrl+C**: Force exits the application
-   **Automatic Exit**: Exits automatically when all transactions are completed
-   **Auto-completion**: Process terminates automatically after showing final summary

### WebSocket vs HTTP RPC Versions

The system provides two implementations for different use cases:

#### WebSocket Version (`npm run dev` / `npm start`)
-   **Real-time**: Instant block notifications via WebSocket
-   **Efficient**: No polling, pure event-driven
-   **Low Latency**: Minimal delay between block detection and transaction
-   **Network**: Requires WebSocket support from RPC provider

#### HTTP RPC Version (`npm run dev:http` / `npm run start:http`)
-   **Universal**: Works with any HTTP RPC endpoint
-   **Polling**: Checks for new blocks every 1 second
-   **Compatible**: Works with networks that don't support WebSocket
-   **Configurable**: Adjustable polling interval and block confirmation delay

### Auto-Exit Behavior

The system automatically exits when all transactions are completed:

-   **Immediate Detection**: Recognizes completion as soon as last transaction is confirmed
-   **Summary Display**: Shows final transaction confirmation summary
-   **Graceful Exit**: Automatically terminates process after 3 seconds
-   **No Manual Intervention**: Runs completely hands-free from start to finish

## Example Output

```
🚀 Blockchain Block Reaction System
==================================

🔧 Configuration Loaded:
========================
WebSocket URL: wss://eth-mainnet.g.alchemy.com/v2/...
HTTP RPC URL: https://eth-mainnet.g.alchemy.com/v2/...
Recipient Address: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
Gas Limit: 21000
Gas Price: 20 gwei
Initial Blocks to Skip: 10
Transaction Count: 5

🚀 Starting blockchain block reaction system...
⏳ Starting WebSocket monitoring. Will skip first 10 blocks...
🔌 Connecting to WebSocket: wss://...
✅ WebSocket connected
📡 Subscribed to new block notifications

⏭️  Skipping block #12345679 (1/10 skipped)
   Block timestamp: 2024-01-15T10:30:00.000Z
   Current time: 2024-01-15T10:30:00.123Z
⏭️  Skipping block #12345680 (2/10 skipped)
   Block timestamp: 2024-01-15T10:32:00.000Z
   Current time: 2024-01-15T10:32:00.456Z
...
⏭️  Skipping block #12345688 (10/10 skipped)
   Block timestamp: 2024-01-15T10:48:00.000Z
   Current time: 2024-01-15T10:48:00.789Z

🆕 New block detected: #12345689 (11 total, 1 processed)
   Hash: 0x1234...
   Timestamp: 2024-01-15T10:30:00.000Z
   Current time: 2024-01-15T10:30:00.000Z
   Transactions: 150
📤 Sending transaction 1/5...
💸 Sending transaction from block #12345689...
📤 Transaction sent: 0xabcd...
   Gas Price: 20.5 gwei
   Nonce: 42
   Gas data: cached
📊 Transaction count: 1/5

✅ Transaction confirmed: 0xabcd...
   Sent in block: #12345689
   Confirmed in block: #12345691
   Blocks to confirm: 2
   Confirmation time: 12000ms
   Gas used: 21000
   Effective gas price: 20.5 gwei

📊 FINAL TRANSACTION CONFIRMATION SUMMARY
==========================================
Total transactions sent: 5
Total transactions confirmed: 5
Average blocks to confirm: 2.4
Average confirmation time: 11500ms
Total gas used: 105000

Detailed results:

1. 0xabcd...
   Sent in block: #12345689
   Confirmed in block: #12345691
   Blocks to confirm: 2
   Sent block timestamp: 2024-01-15T10:30:00.000Z
   Sent timestamp: 2024-01-15T10:30:00.123Z
   Confirmed block timestamp: 2024-01-15T10:32:00.000Z

2. 0xefgh...
   Sent in block: #12345692
   Confirmed in block: #12345694
   Blocks to confirm: 2
   Sent block timestamp: 2024-01-15T10:34:00.000Z
   Sent timestamp: 2024-01-15T10:34:00.456Z
   Confirmed block timestamp: 2024-01-15T10:36:00.000Z
```

## Error Handling

The system includes comprehensive error handling for:

-   WebSocket connection failures
-   Transaction sending errors
-   Configuration validation errors
-   Network timeouts and disconnections

## Security Considerations

-   **Private Key**: Never commit your private key to version control
-   **Environment Variables**: Use `.env` files for sensitive configuration
-   **Network Security**: Ensure your RPC endpoints are secure and trusted
-   **Gas Limits**: Set appropriate gas limits to prevent excessive spending

## Testing

Run tests with:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open a GitHub issue or contact the maintainers.
