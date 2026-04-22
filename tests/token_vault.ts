import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenVault } from "../target/types/token_vault";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("token_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TokenVault as Program<TokenVault>;
  const user = provider.wallet as anchor.Wallet;

  let mint: anchor.web3.PublicKey;
  let userAta: anchor.web3.PublicKey;
  let vaultState: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  before(async () => {
    mint = await createMint(provider.connection, user.payer, user.publicKey, null, 6);

    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection, user.payer, mint, user.publicKey
    );
    userAta = ata.address;
    await mintTo(provider.connection, user.payer, mint, userAta, user.payer, 1_000_000_000);

    // Exercise 1: seeds now include mint
    [vaultState] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("state"), user.publicKey.toBuffer(), mint.toBuffer()],
      program.programId
    );
    vault = getAssociatedTokenAddressSync(mint, vaultState, true);
  });

  it("initialize", async () => {
    await program.methods.initialize()
      .accounts({ mint, vault, vaultState, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc();
  });

  it("deposit 500 tokens", async () => {
    await program.methods.deposit(new anchor.BN(500_000_000))
      .accounts({ mint, userAta, vault, vaultState, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc();
    const acc = await getAccount(provider.connection, vault);
    assert.equal(acc.amount.toString(), "500000000");
  });

  it("withdraw 200 tokens", async () => {
    await program.methods.withdraw(new anchor.BN(200_000_000))
      .accounts({ mint, userAta, vault, vaultState, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc();
    const acc = await getAccount(provider.connection, vault);
    assert.equal(acc.amount.toString(), "300000000");
  });

  // Exercise 2: closing with a non-empty vault should fail
  it("close fails when vault is not empty", async () => {
    try {
      await program.methods.close()
        .accounts({ mint, vault, vaultState, tokenProgram: TOKEN_PROGRAM_ID })
        .rpc();
      assert.fail("Expected error but close succeeded");
    } catch (err: any) {
      assert.include(err.message, "VaultNotEmpty");
    }
  });

  it("close succeeds after draining vault", async () => {
    await program.methods.withdraw(new anchor.BN(300_000_000))
      .accounts({ mint, userAta, vault, vaultState, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc();
    await program.methods.close()
      .accounts({ mint, vault, vaultState, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc();
  });
});
