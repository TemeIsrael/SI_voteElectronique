pragma circom 2.0.0;

// Simple vote circuit for a verifiable e‑vote (demo version)
// Public inputs: root (Merkle root placeholder), nullifier, vote (0 or 1)
// Private inputs: secret, three additive shares of the vote, and a constant electionId.

template VoteCircuit() {
    // Public signals
    signal input root;        // placeholder Merkle root
    signal input nullifier;   // nullifier = secret * electionId (simple hash)
    signal input vote;        // must be 0 or 1

    // Private signals (private by default)
    signal input secret;          // voter's secret
    signal input shares[3];       // three additive shares of the vote
    signal input electionId;      // constant identifier of the election

    // 1. Vote must be binary: vote * (vote - 1) == 0
    vote * (vote - 1) === 0;

    // 2. Re‑construct the vote from the three shares (additive secret sharing)
    signal sumShares;
    sumShares <== shares[0] + shares[1] + shares[2];
    sumShares === vote;

    // 3. Simple hash for nullifier: nullifier = secret * electionId
    // (In a real system you would use Poseidon or another SNARK‑friendly hash.)
    signal hash;
    hash <== secret * electionId;
    hash === nullifier;

    // 4. Placeholder Merkle root check – for the demo we simply enforce root == secret.
    // Real implementation would verify the Merkle path.
    root === secret;
}

component main {public [root, nullifier, vote]} = VoteCircuit();
