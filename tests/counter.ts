import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Counter } from "../target/types/counter";
import { assert } from "chai";

// Skip network-dependent tests when no validator is available
const SKIP_NETWORK_TESTS = process.env.SKIP_NETWORK_TESTS === "true" || !process.env.ANCHOR_PROVIDER_URL?.includes("127.0.0.1");

describe("counter", () => {
  // Basic program structure test (no network required)
  it("Program has expected methods", () => {
    // This test just validates the IDL was generated correctly
    const idl = require("../target/idl/counter.json");
    assert(idl.instructions, "Program should have instructions");
    assert(idl.instructions.find((i: any) => i.name === "initialize"), "Should have initialize instruction");
    assert(idl.instructions.find((i: any) => i.name === "increment"), "Should have increment instruction");
    assert(idl.accounts, "Program should have accounts");
    assert(idl.accounts.find((a: any) => a.name === "Counter"), "Should have Counter account");
  });

  // Only run network tests if we have a local validator
  if (SKIP_NETWORK_TESTS) {
    console.log("Skipping network-dependent tests - no local validator available");
    return;
  }
  // Only run network tests if we have a local validator
  if (SKIP_NETWORK_TESTS) {
    console.log("Skipping network-dependent tests - no local validator available");
    return;
  }

  // Configure the client to use the local cluster.
  // AnchorProvider.env() expects these to be set.
  process.env.ANCHOR_PROVIDER_URL = process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899";
  process.env.ANCHOR_WALLET =
    process.env.ANCHOR_WALLET || `${require("os").homedir()}/.config/solana/id.json`;

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.counter as Program<Counter>;

  let counterAccount: anchor.web3.PublicKey;

  it("Initializes counter account!", async () => {
    // Create a new keypair for the counter account
    const counter = anchor.web3.Keypair.generate();
    counterAccount = counter.publicKey;

    // Call initialize instruction
    const tx = await program.methods
      .initialize()
      .accounts({
        counter: counter.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counter])
      .rpc();

    console.log("Initialize transaction signature:", tx);

    // Fetch the counter account to verify initialization
    const counterData = await program.account.counter.fetch(counterAccount);
    console.log("Counter initialized with count:", counterData.count.toNumber());
    assert.equal(counterData.count.toNumber(), 0, "Counter should be initialized to 0");
  });

  it("Increments counter!", async () => {
    // Call increment instruction
    const tx = await program.methods
      .increment()
      .accounts({
        counter: counterAccount,
      })
      .rpc();

    console.log("Increment transaction signature:", tx);

    // Fetch the counter account to verify increment
    const counterData = await program.account.counter.fetch(counterAccount);
    console.log("Counter incremented to:", counterData.count.toNumber());
    assert.equal(counterData.count.toNumber(), 1, "Counter should be incremented to 1");
  });

  it("Increments counter multiple times!", async () => {
    // Increment 3 more times
    for (let i = 0; i < 3; i++) {
      const tx = await program.methods
        .increment()
        .accounts({
          counter: counterAccount,
        })
        .rpc();

      console.log(`Increment ${i + 1} transaction signature:`, tx);
    }

    // Fetch the counter account to verify final count
    const counterData = await program.account.counter.fetch(counterAccount);
    console.log("Counter final count:", counterData.count.toNumber());
    assert.equal(counterData.count.toNumber(), 4, "Counter should be at 4");
  });
});

