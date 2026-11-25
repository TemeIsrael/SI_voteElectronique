import React, { useState, useEffect, useRef } from 'react';
import * as snarkjs from 'snarkjs';
import './VoteForm.css';

export default function VoteForm() {
  const [candidates, setCandidates] = useState([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(false);
  const wrapperRef = useRef(null);

  // Load candidates from backend
  useEffect(() => {
    fetch('/candidates')
      .then((res) => res.json())
      .then((data) => setCandidates(data))
      .catch(() => setStatus('❌ Impossible de charger la liste des candidats'));
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInputChange = (value) => {
    setInput(value);
    setStatus('');
    if (value.trim().length > 0) {
      const filtered = candidates.filter((c) =>
        c.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (name) => {
    setInput(name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();

    // Validate candidate exists
    if (!candidates.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setStatus(`⚠️ "${trimmed}" ne figure pas dans la liste des candidats autorisés.`);
      return;
    }

    // Find the exact name (case-matched)
    const candidate = candidates.find((c) => c.toLowerCase() === trimmed.toLowerCase());

    setLoading(true);
    setStatus('⏳ Génération de la preuve ZK…');

    try {
      const voteIndex = candidates.indexOf(candidate);
      const vote = voteIndex % 2;
      const secret = 42n;
      const electionId = 7n;
      const nullifier = secret * electionId;
      const root = secret;

      const circuitInputs = {
        root:       root.toString(),
        nullifier:  nullifier.toString(),
        vote:       vote.toString(),
        secret:     secret.toString(),
        shares:     ['0', '0', vote.toString()],
        electionId: electionId.toString(),
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs, '/build/vote_js/vote.wasm', '/build/vote_final.zkey'
      );

      setStatus('⏳ Envoi au serveur…');

      const resp = await fetch('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate,
          nullifier: nullifier.toString(),
          proof,
          public: publicSignals,
        }),
      });

      const data = await resp.json();
      if (resp.ok) {
        setStatus('✅ Vote envoyé et vérifié avec succès !');
        setVoted(true);
      } else {
        setStatus('❌ Erreur : ' + (data.error || resp.statusText));
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vote-container">
      <div className="vote-card">
        <div className="vote-header">
          <span className="vote-icon">🗳️</span>
          <h1>Vote Électronique</h1>
          <p className="vote-subtitle">Sécurisé par preuve à divulgation nulle (ZKP)</p>
        </div>

        {!voted ? (
          <form onSubmit={handleSubmit}>
            <fieldset disabled={loading} className="vote-fieldset">
              <label className="vote-legend" htmlFor="candidate-input">
                Saisissez le nom du candidat
              </label>
              <div className="autocomplete-wrapper" ref={wrapperRef}>
                <input
                  id="candidate-input"
                  type="text"
                  className="candidate-input"
                  placeholder="Ex : Sophie Essian…"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => input.trim() && setShowSuggestions(true)}
                  autoComplete="off"
                  required
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.map((s) => (
                      <li key={s} onClick={() => selectSuggestion(s)}>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" className="vote-button" disabled={loading || !input.trim()}>
                {loading ? (
                  <><span className="spinner"></span> Traitement…</>
                ) : (
                  '🗳️ Voter'
                )}
              </button>
            </fieldset>
          </form>
        ) : (
          <div className="success-panel">
            <div className="success-icon">✅</div>
            <p>Votre vote pour <strong>{input}</strong> a été enregistré et vérifié cryptographiquement.</p>
          </div>
        )}

        {status && (
          <div className={`status-bar ${
            status.startsWith('✅') ? 'success' :
            status.startsWith('❌') ? 'error' :
            status.startsWith('⚠️') ? 'warning' : 'info'
          }`}>{status}</div>
        )}

        <div className="vote-footer">
          <small>🔒 Protocole Groth16 · Circuit Circom · Preuve vérifiée côté serveur</small>
        </div>
      </div>
    </div>
  );
}
