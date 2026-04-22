import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenVault } from "../target/types/token_vault";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const MINT = new anchor.web3.PublicKey("2LmtPQ3X27MGhq2BB35L26WNjgqD5kdPCWgt2tLN9Qvb");
const DEPOSIT_AMOUNT = 500; // tokens (with 9 decimals)

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TokenVault as Program<TokenVault>;
  const user = (provider.wallet as anchor.Wallet).publicKey;

  const [vaultState] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("state"), user.toBuffer(), MINT.toBuffer()],
    program.programId
  );
  const vault = getAssociatedTokenAddressSync(MINT, vaultState, true);
  const userAta = getAssociatedTokenAddressSync(MINT, user);

  try {
    await program.methods.initialize()
      .accounts({ mint: MINT, vault, vaultState, tokenProgram: TOKEN_PROGRAM_ID } as any)
      .rpc();
    console.log("Vault initialized");
  } catch {
    console.log("Vault already exists, skipping initialize");
  }

  const amount = new anchor.BN(DEPOSIT_AMOUNT * 10 ** 9);
  await program.methods.deposit(amount)
    .accounts({ mint: MINT, userAta, vault, vaultState, tokenProgram: TOKEN_PROGRAM_ID } as any)
    .rpc();

  console.log(`Deposited ${DEPOSIT_AMOUNT} tokens into vault`);
  console.log("Vault:", vault.toString());
}

main().catch(console.error);
