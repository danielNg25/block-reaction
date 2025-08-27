import dotenv from 'dotenv';
import { BlockReactionConfig } from '../types';

export class ConfigLoader {
    public static load(): BlockReactionConfig {
        // Load environment variables
        dotenv.config();

        const config: BlockReactionConfig = {
            websocketUrl: this.getRequiredEnvVar('WEBSOCKET_URL'),
            httpRpcUrl: this.getRequiredEnvVar('HTTP_RPC_URL'),
            privateKey: this.getRequiredEnvVar('PRIVATE_KEY'),
            recipientAddress: this.getRequiredEnvVar('RECIPIENT_ADDRESS'),
            gasLimit: this.getEnvVarAsNumber('GAS_LIMIT', 21000),
            gasPriceGwei: this.getEnvVarAsNumber('GAS_PRICE_GWEI', 20),
            initialBlocksToSkip: this.getEnvVarAsNumber(
                'INITIAL_BLOCKS_TO_SKIP',
                10
            ),
            transactionCount: this.getEnvVarAsNumber('TRANSACTION_COUNT', 5),
        };

        this.validateConfig(config);

        return config;
    }

    private static getRequiredEnvVar(key: string): string {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
        return value;
    }

    private static getEnvVarAsNumber(
        key: string,
        defaultValue: number
    ): number {
        const value = process.env[key];
        if (!value) {
            return defaultValue;
        }

        const num = parseFloat(value);
        if (isNaN(num)) {
            console.warn(
                `Warning: Invalid value for ${key}: "${value}", using default: ${defaultValue}`
            );
            return defaultValue;
        }

        return num;
    }

    private static validateConfig(config: BlockReactionConfig): void {
        // Validate WebSocket URL
        if (
            !config.websocketUrl.startsWith('wss://') &&
            !config.websocketUrl.startsWith('ws://')
        ) {
            throw new Error('WEBSOCKET_URL must start with wss:// or ws://');
        }

        // Validate HTTP RPC URL
        if (
            !config.httpRpcUrl.startsWith('http://') &&
            !config.httpRpcUrl.startsWith('https://')
        ) {
            throw new Error('HTTP_RPC_URL must start with http:// or https://');
        }

        // Validate private key
        if (
            !config.privateKey.startsWith('0x') ||
            config.privateKey.length !== 66
        ) {
            throw new Error(
                'PRIVATE_KEY must be a valid 32-byte hex string starting with 0x'
            );
        }

        // Validate recipient address
        if (
            !config.recipientAddress.startsWith('0x') ||
            config.recipientAddress.length !== 42
        ) {
            throw new Error(
                'RECIPIENT_ADDRESS must be a valid Ethereum address'
            );
        }

        // Validate numeric values
        if (config.gasLimit <= 0) {
            throw new Error('GAS_LIMIT must be greater than 0');
        }

        if (config.gasPriceGwei <= 0) {
            throw new Error(
                `GAS_PRICE_GWEI must be greater than 0, got: ${config.gasPriceGwei}`
            );
        }

        // Handle very small gas prices (e.g., for testnets or low-fee networks)
        if (config.gasPriceGwei < 0.000001) {
            console.warn(
                `Warning: Very low gas price detected: ${config.gasPriceGwei} gwei. This might cause transaction failures.`
            );
        }

        if (config.initialBlocksToSkip < 0) {
            throw new Error('INITIAL_BLOCKS_TO_SKIP must be non-negative');
        }

        if (config.transactionCount <= 0 || config.transactionCount > 10) {
            throw new Error('TRANSACTION_COUNT must be between 1 and 10');
        }
    }

    public static printConfig(config: BlockReactionConfig): void {
        console.log('\n🔧 Configuration Loaded:');
        console.log('========================');
        console.log(`WebSocket URL: ${config.websocketUrl}`);
        console.log(`HTTP RPC URL: ${config.httpRpcUrl}`);
        console.log(`Recipient Address: ${config.recipientAddress}`);
        console.log(`Gas Limit: ${config.gasLimit}`);
        console.log(`Gas Price: ${config.gasPriceGwei} gwei`);
        console.log(`Initial Blocks to Skip: ${config.initialBlocksToSkip}`);
        console.log(`Transaction Count: ${config.transactionCount}`);
        console.log('');
    }
}
