#!/usr/bin/env bash
set -e

# -------------------------------------------------
#  Determine the directory where this script lives
#  (the project root is the parent of this file)
# -------------------------------------------------
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT="$SCRIPT_DIR"   # <-- project root (SI_voteElectronique)

echo "Project root: $PROJECT_ROOT"

# ----- Frontend : install Node dependencies -----
cd "$PROJECT_ROOT/frontend"
npm install

# ----- Install snarkjs locally (project dependency) -----
npm install snarkjs --save-dev


# ----- Install circom (compiler) ----------------
# Try to install via snap (if available). If that fails we skip the circuit compilation.
if command -v snap >/dev/null 2>&1; then
  echo "Attempting to install circom via snap…"
  sudo snap install circom || echo "snap install failed – will skip circom installation"
else
  echo "snap not available – skipping circom installation"
fi

# Verify that circom is now in PATH
if command -v circom >/dev/null 2>&1; then
  echo "circom is installed: $(circom --version)"
else
  echo "circom not found – circuit compilation will be skipped"
fi

# ----- Compile the circuit & generate keys -----
mkdir -p "$PROJECT_ROOT/circuits"
cd "$PROJECT_ROOT/circuits"

# Generate a fresh ptau file for the circuit (overwrite any existing one)
# This ensures the file format is correct for snarkjs.
# Phase 1: create a new Powers of Tau ceremony (power 12 -> 4096 constraints)
# Using npx to run the local snarkjs binary.
# Remove any existing ptau files first.
rm -f pot12_*.ptau pot12_final.ptau

echo "Generating fresh ptau file…"
# Create ceremony
npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
# Contribute entropy (demo deterministic string)
npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
  --name="Demo contribution" -v -e="demo entropy"
# Prepare Phase 2 final ptau file
npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v


mkdir -p build
circom vote.circom --r1cs --wasm --sym -o build
# Use npx to run snarkjs from local node_modules
printf "demo entropy\n" | npx snarkjs groth16 setup build/vote.r1cs pot12_final.ptau build/vote_0000.zkey
npx snarkjs zkey contribute build/vote_0000.zkey build/vote_final.zkey \
  --name="Contributor" -v
npx snarkjs zkey export verificationkey build/vote_final.zkey \
  build/verification_key.json

echo "Installation terminée. Vous pouvez maintenant lancer le backend et le frontend."
