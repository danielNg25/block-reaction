import { BlockchainServiceHTTP } from './services/BlockchainServiceHTTP';
import { ConfigLoader } from './config/ConfigLoader';

async function main() {
    try {
        console.log('🚀 Blockchain Block Reaction System (HTTP RPC)');
        console.log('============================================');

        // Load and validate configuration
        const config = ConfigLoader.load();
        ConfigLoader.printConfig(config);

        // Create and start blockchain service
        const blockchainService = new BlockchainServiceHTTP(config);

        let shutdownRequested = false;

        // Handle graceful shutdown
        const handleShutdown = (signal: string) => {
            if (shutdownRequested) {
                console.log('\n🛑 Force exit...');
                process.exit(0);
            }

            console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
            shutdownRequested = true;
            blockchainService.stop();

            // Check if we should exit immediately
            if (!blockchainService.shouldContinue()) {
                console.log('✅ All transactions completed, exiting...');
                process.exit(0);
            }
        };

        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));

        // Start the service
        await blockchainService.start();

        // Keep the process alive and check for completion
        console.log('🔄 Service is running. Press Ctrl+C to stop gracefully.');

        // Check for completion every 5 seconds
        const completionCheck = setInterval(() => {
            if (blockchainService.isCompleted()) {
                console.log('🎉 All transactions completed! Auto-exiting...');
                clearInterval(completionCheck);
                process.exit(0);
            }
        }, 5000);
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the application
main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
