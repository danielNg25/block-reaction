import { ethers } from 'ethers';
import {
    BlockData,
    TransactionResult,
    ConfirmationMetrics,
    BlockReactionConfig,
    CachedGasData,
} from '../types';

export class BlockchainServiceHTTP {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private config: BlockReactionConfig;
    private blockCount = 0;
    private pendingTransactions = new Map<
        string,
        {
            sentBlock: number;
            startTime: number;
            sentBlockTimestamp: string;
            sentTimestamp: number;
        }
    >();
    private confirmationMetrics: ConfirmationMetrics[] = [];
    private isPolling = false;
    private sentTransactionCount = 0; // Track how many transactions we've sent
    private lastProcessedBlock = 0; // Track the last block we processed

    // Gas data caching
    private cachedGasData: CachedGasData | null = null;
    private readonly GAS_CACHE_TTL = 30000; // 30 seconds TTL for gas data

    // Nonce caching
    private cachedNonce: { nonce: number; lastUpdated: number } | null = null;
    private readonly NONCE_CACHE_TTL = 60000; // 1 minute TTL for nonce

    // Polling configuration
    private readonly POLL_INTERVAL = 20; // Poll every 100ms
    private readonly BLOCK_CONFIRMATION_DELAY = 0; // Wait 0 block before processing

    constructor(config: BlockReactionConfig) {
        this.config = config;
        this.provider = new ethers.JsonRpcProvider(config.httpRpcUrl);
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    }

    public async start(): Promise<void> {
        console.log(
            '🚀 Starting blockchain block reaction system (HTTP RPC)...'
        );

        // Pre-fetch gas data and nonce to have them ready for instant transactions
        console.log('⛽ Pre-fetching gas data and nonce...');
        await this.getCachedGasData();
        await this.getCachedNonce();

        // Get current block number to start monitoring from
        this.lastProcessedBlock = await this.provider.getBlockNumber();
        console.log(
            `📍 Starting block monitoring from block #${this.lastProcessedBlock}`
        );
        console.log(
            `⏳ Will skip first ${this.config.initialBlocksToSkip} blocks...`
        );

        // Start polling for new blocks
        this.isPolling = true;
        this.startBlockPolling();

        // Start monitoring pending transactions
        this.startTransactionMonitoring();

        // Start periodic gas data and nonce refresh
        this.startDataRefresh();
    }

    private startBlockPolling(): void {
        const pollBlocks = async () => {
            if (!this.isPolling) return;

            try {
                const currentBlock = await this.provider.getBlockNumber();

                // Check if we have new blocks to process
                if (
                    currentBlock >
                    this.lastProcessedBlock + this.BLOCK_CONFIRMATION_DELAY
                ) {
                    // Process blocks in sequence
                    for (
                        let blockNumber = this.lastProcessedBlock + 1;
                        blockNumber <=
                        currentBlock - this.BLOCK_CONFIRMATION_DELAY;
                        blockNumber++
                    ) {
                        await this.processBlock(blockNumber);
                        this.lastProcessedBlock = blockNumber;
                    }
                }
            } catch (error) {
                console.error('❌ Error polling for blocks:', error);
            }

            // Schedule next poll
            setTimeout(pollBlocks, this.POLL_INTERVAL);
        };

        // Start polling
        pollBlocks();
    }

    private async processBlock(blockNumber: number): Promise<void> {
        try {
            // Get block data
            const block = await this.provider.getBlock(blockNumber);
            if (!block) {
                console.warn(
                    `⚠️  Block #${blockNumber} not found, skipping...`
                );
                return;
            }

            this.blockCount++;

            // Skip blocks until we've seen enough to establish consistent connection
            if (this.blockCount <= this.config.initialBlocksToSkip) {
                const blockTimestamp = new Date(
                    block.timestamp * 1000
                ).toISOString();
                const currentTimestamp = new Date().toISOString();

                console.log(
                    `⏭️  Skipping block #${blockNumber} (${this.blockCount}/${this.config.initialBlocksToSkip} skipped)`
                );
                console.log(`   Block timestamp: ${blockTimestamp}`);
                console.log(`   Current time: ${currentTimestamp}`);
                return;
            }

            // Create BlockData object for compatibility
            const blockData: BlockData = {
                number: block.number.toString(16),
                hash: block.hash || '',
                timestamp: block.timestamp.toString(16),
                transactions: [...block.transactions],
            };

            console.log(
                `\n🆕 New block detected: #${blockNumber} (${
                    this.blockCount
                } total, ${
                    this.blockCount - this.config.initialBlocksToSkip
                } processed)`
            );
            console.log(`   Hash: ${blockData.hash}`);
            console.log(
                `   Timestamp: ${new Date(
                    parseInt(blockData.timestamp, 16) * 1000
                ).toISOString()}`
            );
            console.log(`   Current time: ${new Date().toISOString()}`);
            console.log(`   Transactions: ${blockData.transactions.length}`);

            // Send transaction if we haven't reached the limit
            if (this.sentTransactionCount < this.config.transactionCount) {
                console.log(
                    `📤 Sending transaction ${this.sentTransactionCount + 1}/${
                        this.config.transactionCount
                    }...`
                );
                await this.sendTransaction(blockNumber, blockData);
            } else {
                console.log(
                    `✅ Transaction limit reached (${this.sentTransactionCount}/${this.config.transactionCount} sent), stopping new transactions`
                );
                this.stop();
            }
        } catch (error) {
            console.error(`❌ Error processing block #${blockNumber}:`, error);
        }
    }

    private async sendTransaction(
        blockNumber: number,
        blockData: BlockData
    ): Promise<void> {
        try {
            console.log(`💸 Sending transaction from block #${blockNumber}...`);

            // Get cached gas data and nonce for faster transaction sending
            const gasData = await this.getCachedGasData();
            const nonceData = await this.getCachedNonce();

            // Prepare transaction
            const tx = {
                to: this.config.recipientAddress,
                value: ethers.parseEther('0.00000000000000001'), // Small amount for testing
                gasLimit: this.config.gasLimit,
                gasPrice: gasData.gasPrice,
                nonce: nonceData.nonce,
            };

            // Send transaction
            // Increment sent transaction count
            this.sentTransactionCount++;

            // Capture timestamp right before sending
            const sendTimestamp = Date.now();
            const response = await this.wallet.sendTransaction(tx);

            // Increment cached nonce for next transaction
            if (this.cachedNonce) {
                this.cachedNonce.nonce++;
            }

            const hash = response.hash;

            console.log(`📤 Transaction sent: ${hash}`);
            console.log(
                `   Gas Price: ${ethers.formatUnits(
                    gasData.gasPrice,
                    'gwei'
                )} gwei`
            );
            console.log(`   Nonce: ${tx.nonce}`);
            console.log(`   Gas data: ${gasData.cached ? 'cached' : 'fresh'}`);
            console.log(
                `   Nonce data: ${nonceData.cached ? 'cached' : 'fresh'}`
            );

            // Track pending transaction
            this.pendingTransactions.set(hash, {
                sentBlock: blockNumber,
                startTime: Date.now(),
                sentBlockTimestamp: blockData.timestamp,
                sentTimestamp: sendTimestamp,
            });

            console.log(
                `📊 Transaction count: ${this.sentTransactionCount}/${this.config.transactionCount}`
            );
        } catch (error) {
            console.error('❌ Error sending transaction:', error);
            this.sentTransactionCount--;
        }
    }

    private async getCachedGasData(): Promise<{
        gasPrice: bigint;
        cached: boolean;
    }> {
        const now = Date.now();

        // Check if we have valid cached gas data
        if (
            this.cachedGasData &&
            now - this.cachedGasData.lastUpdated < this.GAS_CACHE_TTL
        ) {
            return { gasPrice: this.cachedGasData.gasPrice, cached: true };
        }

        // Fetch fresh gas data
        console.log('🔄 Fetching fresh gas data...');
        const feeData = await this.provider.getFeeData();
        const gasPrice =
            feeData.gasPrice ||
            ethers.parseUnits(`${this.config.gasPriceGwei}`, 'gwei');

        // Cache the gas data
        this.cachedGasData = {
            gasPrice,
            maxFeePerGas: feeData.maxFeePerGas || undefined,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
            lastUpdated: now,
        };

        return { gasPrice, cached: false };
    }

    private async getCachedNonce(): Promise<{
        nonce: number;
        cached: boolean;
    }> {
        const now = Date.now();

        // Check if we have valid cached nonce
        if (
            this.cachedNonce !== null &&
            now - this.cachedNonce.lastUpdated < this.NONCE_CACHE_TTL
        ) {
            return { nonce: this.cachedNonce.nonce, cached: true };
        }

        // Fetch fresh nonce
        console.log('🔄 Fetching fresh nonce...');
        const nonce = await this.wallet.getNonce();

        // Cache the nonce
        this.cachedNonce = { nonce, lastUpdated: now };

        return { nonce, cached: false };
    }

    private startTransactionMonitoring(): void {
        setInterval(async () => {
            if (this.pendingTransactions.size === 0) return;

            for (const [hash, info] of this.pendingTransactions.entries()) {
                try {
                    const receipt = await this.provider.getTransactionReceipt(
                        hash
                    );

                    if (receipt) {
                        await this.processConfirmedTransaction(
                            hash,
                            receipt,
                            info
                        );
                        this.pendingTransactions.delete(hash);
                    }
                } catch (error) {
                    // Transaction still pending
                }
            }
        }, 2000); // Check every 2 seconds
    }

    private startDataRefresh(): void {
        // Refresh gas data and nonce every 20 seconds to keep them current
        setInterval(async () => {
            try {
                await this.getCachedGasData();
                await this.getCachedNonce();
            } catch (error) {
                console.warn('⚠️ Failed to refresh gas data or nonce:', error);
            }
        }, 20000); // Every 20 seconds
    }

    private async processConfirmedTransaction(
        hash: string,
        receipt: ethers.TransactionReceipt,
        info: {
            sentBlock: number;
            startTime: number;
            sentBlockTimestamp: string;
            sentTimestamp: number;
        }
    ): Promise<void> {
        const blocksToConfirm = receipt.blockNumber - info.sentBlock;
        const confirmationTimeMs = Date.now() - info.startTime;

        // Get the confirmed block data to get its timestamp
        const confirmedBlock = await this.provider.getBlock(
            receipt.blockNumber!
        );

        const metrics: ConfirmationMetrics = {
            transactionHash: hash,
            sentBlockNumber: info.sentBlock,
            confirmedBlockNumber: receipt.blockNumber,
            blocksToConfirm,
            confirmationTimeMs,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.gasPrice || BigInt(0),
            sentBlockTimestamp: info.sentBlockTimestamp || '',
            confirmedBlockTimestamp:
                confirmedBlock?.timestamp?.toString() || '',
            sentTimestamp: info.sentTimestamp,
        };

        this.confirmationMetrics.push(metrics);

        console.log(`\n✅ Transaction confirmed: ${hash}`);
        console.log(`   Sent in block: #${info.sentBlock}`);
        console.log(`   Confirmed in block: #${receipt.blockNumber}`);
        console.log(`   Blocks to confirm: ${blocksToConfirm}`);
        console.log(`   Confirmation time: ${confirmationTimeMs}ms`);
        console.log(`   Gas used: ${metrics.gasUsed.toString()}`);
        console.log(
            `   Effective gas price: ${ethers.formatUnits(
                metrics.effectiveGasPrice,
                'gwei'
            )} gwei`
        );

        // Print summary if we've completed all transactions
        if (this.confirmationMetrics.length === this.config.transactionCount) {
            this.printFinalSummary();
            console.log(
                '\n🎉 All transactions completed! Exiting in 1 seconds...'
            );

            // Auto-exit after showing the summary
            setTimeout(() => {
                console.log('👋 Goodbye!');
                process.exit(0);
            }, 1000);
        }
    }

    private printFinalSummary(): void {
        console.log('\n📊 FINAL TRANSACTION CONFIRMATION SUMMARY');
        console.log('==========================================');

        const avgBlocksToConfirm =
            this.confirmationMetrics.reduce(
                (sum, m) => sum + m.blocksToConfirm,
                0
            ) / this.confirmationMetrics.length;
        const avgConfirmationTime =
            this.confirmationMetrics.reduce(
                (sum, m) => sum + m.confirmationTimeMs,
                0
            ) / this.confirmationMetrics.length;
        const totalGasUsed = this.confirmationMetrics.reduce(
            (sum, m) => sum + m.gasUsed,
            BigInt(0)
        );

        console.log(`Total transactions sent: ${this.sentTransactionCount}`);
        console.log(
            `Total transactions confirmed: ${this.confirmationMetrics.length}`
        );
        console.log(
            `Average blocks to confirm: ${avgBlocksToConfirm.toFixed(2)}`
        );
        console.log(
            `Average confirmation time: ${avgConfirmationTime.toFixed(2)}ms`
        );
        console.log(`Total gas used: ${totalGasUsed.toString()}`);

        console.log('\nDetailed results:');
        this.confirmationMetrics.forEach((metrics, index) => {
            console.log(`\n${index + 1}. ${metrics.transactionHash}`);
            console.log(`   Sent in block: #${metrics.sentBlockNumber}`);
            console.log(
                `   Confirmed in block: #${metrics.confirmedBlockNumber}`
            );
            console.log(`   Blocks to confirm: ${metrics.blocksToConfirm}`);

            // Calculate timestamps
            const sentBlockTimestamp = new Date(
                parseInt(metrics.sentBlockTimestamp || '0', 16) * 1000
            ).toISOString();
            const confirmedBlockTimestamp = new Date(
                parseInt(metrics.confirmedBlockTimestamp || '0') * 1000
            ).toISOString();
            const sentTimestamp = new Date(metrics.sentTimestamp).toISOString();

            console.log(`   Sent block timestamp: ${sentBlockTimestamp}`);
            console.log(`   Sent timestamp: ${sentTimestamp}`);
            console.log(
                `   Confirmed block timestamp: ${confirmedBlockTimestamp}`
            );
        });
    }

    public stop(): void {
        console.log('\n🛑 Stopping blockchain service (HTTP RPC)...');

        this.isPolling = false;

        if (this.confirmationMetrics.length === this.config.transactionCount) {
            console.log('✅ All transactions completed successfully!');
            console.log('🎉 Auto-exiting due to completion...');
            process.exit(0);
        }

        console.log('🔄 Service stopped. Press Ctrl+C again to exit.');
    }

    public isRunning(): boolean {
        return this.isPolling || this.pendingTransactions.size > 0;
    }

    public shouldContinue(): boolean {
        return this.sentTransactionCount < this.config.transactionCount;
    }

    public isCompleted(): boolean {
        return this.confirmationMetrics.length === this.config.transactionCount;
    }

    public getStatus(): { sent: number; confirmed: number; total: number } {
        return {
            sent: this.sentTransactionCount,
            confirmed: this.confirmationMetrics.length,
            total: this.config.transactionCount,
        };
    }
}
