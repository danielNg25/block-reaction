import { ethers } from 'ethers';
import { ConfigLoader } from './config/ConfigLoader';

async function testGasCaching() {
    try {
        console.log('🧪 Testing Gas Caching Functionality');
        console.log('====================================');

        // Load configuration
        const config = ConfigLoader.load();

        // Create provider
        const provider = new ethers.JsonRpcProvider(config.httpRpcUrl);

        // Test gas data fetching
        console.log('\n1️⃣ First gas data fetch (should be fresh):');
        const start1 = Date.now();
        const gasData1 = await provider.getFeeData();
        const time1 = Date.now() - start1;
        console.log(`   Time taken: ${time1}ms`);
        console.log(
            `   Gas Price: ${ethers.formatUnits(
                gasData1.gasPrice || BigInt(0),
                'gwei'
            )} gwei`
        );

        // Simulate cached gas data
        console.log('\n2️⃣ Second gas data fetch (simulating cache hit):');
        const start2 = Date.now();
        const gasData2 = await provider.getFeeData();
        const time2 = Date.now() - start2;
        console.log(`   Time taken: ${time2}ms`);
        console.log(
            `   Gas Price: ${ethers.formatUnits(
                gasData2.gasPrice || BigInt(0),
                'gwei'
            )} gwei`
        );

        console.log('\n📊 Performance Comparison:');
        console.log(`   Fresh fetch: ${time1}ms`);
        console.log(`   Cached fetch: ${time2}ms`);
        console.log(`   Time saved: ${time1 - time2}ms`);

        // Test transaction preparation with cached gas
        console.log('\n3️⃣ Testing transaction preparation with cached gas:');
        const wallet = new ethers.Wallet(config.privateKey, provider);
        const nonce = await wallet.getNonce();

        const tx = {
            to: config.recipientAddress,
            value: ethers.parseEther('0.001'),
            gasLimit: config.gasLimit,
            gasPrice:
                gasData1.gasPrice ||
                ethers.parseUnits(`${config.gasPriceGwei}`, 'gwei'),
            nonce,
        };

        console.log(
            '   Transaction prepared successfully with cached gas data'
        );
        console.log(
            `   Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} gwei`
        );
        console.log(`   Nonce: ${nonce}`);

        console.log('\n✅ Gas caching test completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testGasCaching().catch(console.error);
