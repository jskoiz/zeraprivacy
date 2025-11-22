import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    clusterApiUrl
} from '@solana/web3.js';
import * as Zera from './sdk/src/index';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load or create a keypair
function loadKeypair(name: string): Keypair {
    const keypairPath = path.join(process.cwd(), `${name}.json`);
    if (fs.existsSync(keypairPath)) {
        const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
        return Keypair.fromSecretKey(secretKey);
    } else {
        const keypair = Keypair.generate();
        fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
        return keypair;
    }
}

async function main() {
    console.log("👻 GhostSol Privacy SDK Demo (Confidential Transfers) 👻");
    console.log("========================================================");

    // 1. Setup Connection and Wallet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const wallet = loadKeypair('demo-wallet');

    console.log(`Wallet Address: ${wallet.publicKey.toBase58()}`);

    // Fund wallet if needed
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log("Requesting airdrop...");
        try {
            const sig = await connection.requestAirdrop(wallet.publicKey, 1 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig);
            console.log("Airdrop successful!");
        } catch (e) {
            console.log("Airdrop failed. Please fund wallet manually: " + wallet.publicKey.toBase58());
        }
    }

    // 2. Initialize SDK
    console.log("\nInitializing SDK...");
    await Zera.init({
        cluster: 'devnet',
        wallet: wallet,
        privacy: {
            mode: 'privacy',
            enableViewingKeys: true
        }
    });
    console.log("SDK Initialized.");

    try {
        // 3. Create Confidential Mint
        console.log("\nCreating Confidential Mint (Token 2022)...");
        const mint = await Zera.createConfidentialMint(9);
        console.log(`Mint Created: ${mint.toBase58()}`);

        // 4. Create Confidential Account
        console.log("\nCreating Confidential Account...");
        const account = await Zera.createConfidentialAccount(mint);
        console.log(`Confidential Account: ${account.toBase58()}`);

        // 5. Deposit (Shield)
        console.log("\nDepositing 100 tokens (Shielding)...");
        const depositSig = await Zera.deposit(account, mint, 100);
        console.log(`Deposit successful. Signature: ${depositSig}`);
        console.log(`(View on Explorer: https://explorer.solana.com/tx/${depositSig}?cluster=devnet)`);

        // 6. Transfer (Confidential)
        console.log("\nTransferring 50 tokens confidentially...");
        const recipientWallet = Keypair.generate();

        // Recipient needs an account too
        const recipientAccount = await Zera.createConfidentialAccount(mint, recipientWallet.publicKey);
        console.log(`Recipient Account: ${recipientAccount.toBase58()}`);

        const transferSig = await Zera.transfer(account, mint, recipientAccount, 50);
        console.log(`Transfer successful. Signature: ${transferSig}`);

        // 7. Withdraw (Unshield)
        console.log("\nWithdrawing 25 tokens (Unshielding)...");
        const withdrawSig = await Zera.withdraw(account, mint, 25);
        console.log(`Withdrawal successful. Signature: ${withdrawSig}`);

        // 8. Stealth Addresses (Secure)
        console.log("\n--- Stealth Address Demo (Secure) ---");
        const metaAddress = Zera.generateStealthMetaAddress();
        console.log("Generated Stealth Meta-Address");

        const { stealthAddress, ephemeralKey } = Zera.generateStealthAddress(metaAddress);
        console.log(`Generated Stealth Address: ${stealthAddress.address.toBase58()}`);

        // Verify
        console.log("Verifying Stealth Address derivation...");
        // Note: In a real app, the receiver would do this with their private key.
        // For demo, we don't have the view private key exposed easily from the meta address generator
        // unless we generated the keypair ourselves.

        // Let's manually verify to show it works
        // We need the view private key corresponding to metaAddress.viewPublicKey
        // But generateStealthMetaAddress hides it inside the function if we don't pass it.

        // Re-generate with known keys for verification demo
        const viewKey = Keypair.generate();
        const spendKey = Keypair.generate();
        const metaAddress2 = Zera.generateStealthMetaAddress(viewKey, spendKey);
        const { stealthAddress: sa2, ephemeralKey: ek2 } = Zera.generateStealthAddress(metaAddress2);

        const isValid = Zera.verifyStealthAddress(sa2.address, metaAddress2, ek2.publicKey, viewKey.secretKey);
        console.log(`Verification Result: ${isValid ? "✅ VALID" : "❌ INVALID"}`);

    } catch (error) {
        console.error("\nError during demo:", error);
    }
}

main();
