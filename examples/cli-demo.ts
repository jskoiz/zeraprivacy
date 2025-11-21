import { init, compress, transfer, decompress, getBalance, getAddress } from '../sdk/src/index';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { StealthAddressManager } from '../sdk/src/privacy/stealth-addresses';

async function main() {
    console.log('👻 GhostSol CLI Demo for Agents');
    console.log('===============================');

    // 1. Setup Agents
    const alice = Keypair.generate();
    const bob = Keypair.generate();
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    console.log(`Alice: ${alice.publicKey.toBase58()}`);
    console.log(`Bob:   ${bob.publicKey.toBase58()}`);

    // 2. Fund Alice
    console.log('\n💰 Funding Alice...');
    try {
        const sig = await connection.requestAirdrop(alice.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
        console.log('✅ Alice funded with 2 SOL');
    } catch (e) {
        console.log('⚠️ Airdrop failed (rate limit?). Ensure Alice has funds manually.');
    }

    // 3. Initialize SDK for Alice
    console.log('\n🔌 Initializing SDK for Alice...');
    await init({
        wallet: alice,
        cluster: 'devnet'
    });

    // 4. Compress (Shield) Funds
    console.log('\n🛡️  Alice shielding 0.5 SOL...');
    try {
        const sig = await compress(0.5 * LAMPORTS_PER_SOL);
        console.log(`✅ Compressed! Sig: ${sig}`);
    } catch (e) {
        console.error('❌ Compression failed:', e);
        return;
    }

    // 5. Check Balance
    const balance = await getBalance();
    console.log(`Alice Compressed Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // 6. Transfer to Bob (Standard Private Transfer)
    // Note: In a real stealth flow, we would generate a stealth address for Bob here.
    // For this demo, we'll do a direct private transfer to Bob's public key to prove ZK flow.
    console.log('\n💸 Alice transferring 0.2 SOL to Bob...');
    try {
        const sig = await transfer(bob.publicKey.toBase58(), 0.2 * LAMPORTS_PER_SOL);
        console.log(`✅ Transferred! Sig: ${sig}`);
    } catch (e) {
        console.error('❌ Transfer failed:', e);
        return;
    }

    // 7. Switch SDK to Bob
    console.log('\n🔄 Switching to Bob...');
    await init({
        wallet: bob,
        cluster: 'devnet'
    });

    const bobBalance = await getBalance();
    console.log(`Bob Compressed Balance: ${bobBalance / LAMPORTS_PER_SOL} SOL`);

    // 8. Decompress (Unshield)
    console.log('\n🔓 Bob unshielding 0.1 SOL...');
    try {
        const sig = await decompress(0.1 * LAMPORTS_PER_SOL);
        console.log(`✅ Decompressed! Sig: ${sig}`);
    } catch (e) {
        console.error('❌ Decompression failed:', e);
    }

    console.log('\n✨ Demo Complete!');
}

main().catch(console.error);
