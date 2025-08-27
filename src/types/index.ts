export interface BlockData {
    number: string;
    hash: string;
    timestamp: string;
    transactions: string[];
}

export interface TransactionResult {
    hash: string;
    blockNumber: number;
    confirmations: number;
    status: 'pending' | 'confirmed' | 'failed';
    gasUsed?: bigint;
    effectiveGasPrice?: bigint;
}

export interface ConfirmationMetrics {
    transactionHash: string;
    sentBlockNumber: number;
    confirmedBlockNumber: number;
    blocksToConfirm: number;
    confirmationTimeMs: number;
    gasUsed: bigint;
    effectiveGasPrice: bigint;
    sentBlockTimestamp: string;
    confirmedBlockTimestamp: string;
    sentTimestamp: number;
}

export interface BlockReactionConfig {
    websocketUrl: string;
    httpRpcUrl: string;
    privateKey: string;
    recipientAddress: string;
    gasLimit: number;
    gasPriceGwei: number;
    initialBlocksToSkip: number;
    transactionCount: number;
}

export interface CachedGasData {
    gasPrice: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    lastUpdated: number;
}

export interface WebSocketMessage {
    jsonrpc: string;
    method: string;
    params: {
        subscription: string;
        result: BlockData;
    };
}
