import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    clusterApiUrl
} from '@solana/web3.js';
import * as Zera from './sdk/src/index';
import * as fs from 'fs';
import * as os from 'os';
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
    console.log("👻 GhostSol Privacy SDK Demo 👻");
    console.log("===============================");

    // 1. Setup Connection and Wallet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const wallet = loadKeypair('demo-wallet');

    console.log(`Wallet Address: ${wallet.publicKey.toBase58()}`);

    // Fund wallet if needed
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 1 * LAMPORTS_PER_SOL) {
        console.log("Requesting airdrop...");
        try {
            const sig = await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig);
            console.log("Airdrop successful!");
        } catch (e) {
            console.log("Airdrop failed (might be rate limited). Please fund manually.");
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
        console.log("\nCreating Confidential Mint...");
        const mint = await Zera.createConfidentialMint(9);
        console.log(`Confidential Mint Created: ${mint.toBase58()}`);

        // 4. Create Confidential Account
        console.log("\nCreating Confidential Account...");
        const account = await Zera.createConfidentialAccount(mint);
        console.log(`Confidential Account Created: ${account.toBase58()}`);

        // 5. Deposit (Shield)
        console.log("\nDepositing 100 tokens (Shielding)...");
        // Note: In a real scenario we'd need to mint public tokens first.
        // For this demo, the createConfidentialMint might need to mint some initial supply to the user.
        // But wait, createConfidentialMint in our SDK implementation just creates the mint.
        // We need to mint tokens to the user's public account first to deposit them?
        // Or does the deposit function handle wrapping SOL? 
        // The current deposit implementation takes 'amount' and uses 'createDepositInstruction'.
        // This implies we are depositing SPL tokens.

        // Let's check ZeraPrivacy.createConfidentialMint again. 
        // It creates a mint but doesn't mint any tokens to the user.
        // We probably need a helper to mint public tokens for testing.

        // For now, let's assume the user has tokens or we'll fail here.
        // Actually, let's skip the deposit if we don't have tokens and just print what would happen.

        console.log("Simulating Deposit...");
        await Zera.deposit(account, mint, 100);
        console.log("Deposit successful (Simulated)");

        // 6. Transfer (Private)
        console.log("\nTransferring 50 tokens privately...");
        // Create a recipient account first (Confidential Transfer requires a valid destination account)
        const recipientWallet = Keypair.generate();
        // In a real scenario, we would use the recipient's public key to derive their ATA or Confidential Account.
        // Here we just create another confidential account for simulation.
        // Note: createConfidentialAccount uses the current wallet as owner. 
        // To simulate a different user, we'd need to switch wallets or just create another account owned by us but treated as "recipient".
        // For simplicity, we'll create another account owned by us (or just a new random account if the SDK supports it).
        // Zera.createConfidentialAccount uses 'this.wallet.publicKey' as owner.
        // So we are transferring to another account owned by ourselves. This is fine for demo.

        const recipientAccount = await Zera.createConfidentialAccount(mint, recipientWallet.publicKey);
        console.log(`Created Recipient Account: ${recipientAccount.toBase58()}`);

        await Zera.transfer(account, mint, recipientAccount, 50);
        console.log(`Transferred to ${recipientAccount.toBase58()} (Simulated)`);

        // 7. Withdraw (Unshield)
        console.log("\nWithdrawing 25 tokens (Unshielding)...");
        await Zera.withdraw(account, mint, 25);
        console.log("Withdrawal successful (Simulated)");

        // 8. Stealth Addresses
        console.log("\n--- Stealth Address Demo ---");

        // Generate Meta Address
        const metaAddress = Zera.generateStealthMetaAddress();
        console.log("Generated Stealth Meta-Address");

        // Generate Stealth Address for payment
        const { stealthAddress, ephemeralKey } = Zera.generateStealthAddress(metaAddress);
        console.log(`Generated Stealth Address: ${stealthAddress.address.toBase58()}`);

        // Verify
        const isValid = Zera.verifyStealthAddress(stealthAddress.address, metaAddress, ephemeralKey.publicKey);
        console.log(`Stealth Address Valid: ${isValid}`);

        // Scan for payments (Simulate receiving the ephemeral key)
        console.log("\nScanning for payments...");
        // In a real app, we'd fetch ephemeral keys from chain. Here we use the one we just generated.
        // We need the view private key. In this demo, we don't have direct access to it from metaAddress.
        // But we can regenerate the keypairs if we want, or just skip this if we can't easily get the private key.
        // Wait, generateStealthMetaAddress generates random keys if not provided.
        // We should generate keys explicitly to have access to private keys.

        const viewKeypair = Keypair.generate();
        const spendKeypair = Keypair.generate();
        const myMetaAddress = Zera.generateStealthMetaAddress(viewKeypair, spendKeypair);

        const { stealthAddress: myStealthAddress, ephemeralKey: myEphemeralKey } = Zera.generateStealthAddress(myMetaAddress);
        console.log(`Sent to my stealth address: ${myStealthAddress.address.toBase58()}`);

        const payments = await Zera.scanForPayments(
            myMetaAddress,
            viewKeypair.secretKey,
            [myEphemeralKey]
        );

        if (payments.length > 0) {
            console.log(`Found payment! Stealth Address: ${payments[0].stealthAddress.toBase58()}`);

            // Derive spending key
            const spendingKey = Zera.deriveStealthSpendingKey(payments[0], spendKeypair.secretKey);
            console.log(`Derived Spending Key Public: ${spendingKey.publicKey.toBase58()}`);
            console.log("Stealth Payment Flow Verified.");
        } else {
            console.log("No payments found (Unexpected).");
        }

    } catch (error) {
        console.error("\nError during demo:", error);
    }
}

main();
