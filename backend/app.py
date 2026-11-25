# backend/app.py
import os
import json
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app)

# Path to the build directory where circuit files are stored
BASE_DIR = Path(__file__).parent.parent / "circuits" / "build"
VERIF_KEY = BASE_DIR / "verification_key.json"
VOTES_FILE = BASE_DIR / "votes.json"
CANDIDATES_FILE = Path(__file__).parent.parent / "candidates.json"

# Resolve the npx binary from the frontend node_modules
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


def verify_proof(public_signals, proof):
    """Verify a Groth16 proof using snarkjs via npx.
    Returns True if verification succeeds, False otherwise.
    """
    proof_path = BASE_DIR / "tmp_proof.json"
    pub_path = BASE_DIR / "tmp_public.json"
    try:
        with open(proof_path, "w") as f:
            json.dump(proof, f)
        with open(pub_path, "w") as f:
            json.dump(public_signals, f)

        cmd = [
            "npx", "snarkjs", "groth16", "verify",
            str(VERIF_KEY), str(pub_path), str(proof_path),
        ]
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            cwd=str(FRONTEND_DIR),
        )
        print("snarkjs stdout:", result.stdout)
        print("snarkjs stderr:", result.stderr)
        return "OK" in result.stdout
    finally:
        proof_path.unlink(missing_ok=True)
        pub_path.unlink(missing_ok=True)


@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "API du vote électronique – utilisez /candidates, /submit ou /results"})


@app.route("/candidates", methods=["GET"])
def get_candidates():
    """Return the list of candidates from candidates.json."""
    try:
        candidates = json.loads(CANDIDATES_FILE.read_text())
    except Exception:
        candidates = []
    return jsonify(candidates)


@app.route("/submit", methods=["POST"])
def submit_vote():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Payload manquant"}), 400

    # Accept { candidate, nullifier, proof, public }
    required = {"nullifier", "proof", "public"}
    if not required.issubset(data):
        missing = required - set(data.keys())
        return jsonify({"error": f"Champs manquants : {missing}"}), 400

    # Verify the ZK proof
    if not verify_proof(data["public"], data["proof"]):
        return jsonify({"error": "Preuve ZK invalide"}), 400

    # Store the vote
    votes = {}
    if VOTES_FILE.exists():
        votes = json.loads(VOTES_FILE.read_text())
    votes[data["nullifier"]] = {
        "candidate": data.get("candidate", "?"),
        "public": data["public"],
    }
    VOTES_FILE.write_text(json.dumps(votes, indent=2))
    return jsonify({"status": "ok"}), 200


@app.route("/results", methods=["GET"])
def results():
    if not VOTES_FILE.exists():
        return jsonify({"votes": []})
    votes = json.loads(VOTES_FILE.read_text())
    return jsonify({"votes": votes})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
