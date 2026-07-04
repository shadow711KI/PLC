# Ubuntu Deployment (ohne Datei-Kopieren)

Diese Anleitung deployt das Projekt per Git + Docker Compose.

## Schnellstart (automatisch)

Auf dem Ubuntu-Server kannst du alles in einem Schritt vorbereiten:

```bash
bash scripts/setup-ubuntu.sh <DEIN_GIT_REPO_URL> /opt/rjapp main
```

Beispiel:

```bash
bash scripts/setup-ubuntu.sh git@github.com:owner/repo.git /opt/rjapp main
```

Das Skript installiert Docker und Basis-Pakete, setzt UFW, klont/aktualisiert das Repo und startet den ersten Deploy.

## 1. Server vorbereiten

```bash
sudo apt update
sudo apt install -y git curl ufw ca-certificates

# Docker installieren
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 2. Repository auf Server klonen

```bash
sudo mkdir -p /opt/rjapp
sudo chown -R $USER:$USER /opt/rjapp
git clone <DEIN_GIT_REPO_URL> /opt/rjapp
cd /opt/rjapp
```

## 3. Erstes Deployment

```bash
chmod +x deploy.sh
./deploy.sh
```

Danach ist die App auf Port 80 erreichbar.

## 4. Optional: API-URL beim Frontend-Build überschreiben

Standard ist Same-Origin (empfohlen). Falls du explizit setzen willst:

```bash
echo 'VITE_API_URL=https://deine-domain.tld' > .env
./deploy.sh
```

## 5. Automatisches Deploy per GitHub Actions

Lege in GitHub unter Repository Secrets an:

- `DEPLOY_HOST` (Server-IP oder Domain)
- `DEPLOY_USER` (z. B. deploy)
- `DEPLOY_SSH_KEY` (privater SSH-Key)
- `DEPLOY_PATH` (`/opt/rjapp`)
- `DEPLOY_PORT` (optional, Standard 22)

Workflow-Datei ist vorhanden in `.github/workflows/deploy.yml`.

## 6. Nützliche Befehle

```bash
cd /opt/rjapp
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose up -d --build
```
