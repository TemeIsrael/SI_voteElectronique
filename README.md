# Vote Électronique Vérifiable (ZKP + MPC)

## Structure du projet
```
SI_voteElectronique/
├─ frontend/          # Application React
│   ├─ src/
│   └─ package.json
├─ backend/           # API Flask
│   ├─ app.py
│   ├─ requirements.txt
│   └─ db.sqlite   (créé à l'exécution)
├─ circuits/          # Circom circuits
│   └─ vote.circom
├─ scripts/           # Scripts d'installation et de compilation
│   └─ setup.sh
└─ README.md
```

## Prérequis
- **Node ≥ 16** (v20.20.2 déjà installé)
- **npm** (v10.x)
- **Python 3.9+** (venv recommandé)
- **circom** (compiler) – voir `scripts/setup.sh` pour l'installation automatisée
- **snarkjs** (npm package) – utilisé côté client via WebAssembly

## Installation (local)
```bash
# Clone le dépôt puis entrez dans le répertoire
git clone <repo‑url>
cd SI_voteElectronique

# Installer les dépendances Node et compiler le circuit
bash scripts/setup.sh

# Créer un environnement Python et installer le backend
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Lancer le serveur Flask
flask --app backend/app.py run

# Lancer le frontend (React) – dans un autre terminal
cd frontend && npm run dev
```

Le frontend génère les preuves ZKP dans le navigateur grâce à `snarkjs` (WebAssembly) et les envoie au backend qui les vérifie, stocke les parts et calcule le résultat.

---
*Ce README sera versionné sur GitHub. Vous pourrez le pousser après avoir créé le dépôt.*
