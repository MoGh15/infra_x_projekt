<h1 align="center">PraxisForm</h1>

<p align="center">
  Digitale Patientenaufnahme für Arztpraxen – papierlos, sicher und in Echtzeit.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-4.0-6DB33F?logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Java-17+-ED8B00?logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/License-Proprietary-lightgrey" />
</p>

---

## 📋 Inhaltsverzeichnis

- [Über das Projekt](#-über-das-projekt)
- [Features](#-features)
- [Tech-Stack](#-tech-stack)
- [Projektstruktur](#-projektstruktur)
- [Voraussetzungen](#-voraussetzungen)
- [Installation & Start](#-installation--start)
- [Umgebungsvariablen](#-umgebungsvariablen)
- [API-Übersicht](#-api-übersicht)
- [Tests](#-tests)
- [Deployment](#-deployment)

---

## 🩺 Über das Projekt

**PraxisForm** ersetzt den klassischen Papier-Anamnesebogen in Arztpraxen durch ein vollständig digitales System. Patienten füllen ein mehrstufiges Online-Formular aus – inklusive persönlicher Daten, medizinischer Anamnese, Symptomerfassung, Dateianhängen und digitaler Unterschrift. Die Praxis-Mitarbeiter sehen eingegangene Formulare in Echtzeit auf einem Admin-Dashboard und können diese bearbeiten, filtern und als erledigt markieren.

---

## ✨ Features

| Bereich | Funktionalität |
|---------|----------------|
| **Patientenformular** | Mehrstufiger Stepper mit Validierung (Persönliche Daten → Anamnese → Symptome → Einwilligung → Unterschrift) |
| **Datei-Upload** | Bis zu 5 Dateien (PDF, JPEG, PNG, WebP), max. 10 MB pro Datei, gespeichert via MongoDB GridFS |
| **Digitale Unterschrift** | Touch-/Maus-basierte Signaturerfassung direkt im Browser |
| **Admin-Dashboard** | Tabellarische Übersicht aller Einreichungen mit Filterung, Suche und Paginierung |
| **Echtzeit-Updates** | Server-Sent Events (SSE) für Live-Benachrichtigungen bei neuen Einreichungen |
| **Status-Workflow** | Dreistufiger Workflow: `NEU` → `GESEHEN` → `ERLEDIGT` |
| **Detailansicht** | Vollständige Ansicht & Bearbeitung einzelner Einreichungen inkl. Datei-Download |
| **Authentifizierung** | JWT-basierte Admin-Authentifizierung mit automatischem Admin-Seeding |
| **Responsive UI** | Angular Material Design – optimiert für Desktop, Tablet und mobile Geräte |

---

## 🛠 Tech-Stack

### Backend
| Technologie | Version | Verwendung |
|-------------|---------|------------|
| **Java** | 17+ | Programmiersprache |
| **Spring Boot** | 4.0 | REST-API-Framework |
| **Spring Security** | – | Authentifizierung & Autorisierung |
| **Spring Data MongoDB** | – | Datenbankzugriff & GridFS |
| **JJWT** | 0.12.5 | JWT-Token-Erzeugung & -Validierung |
| **Lombok** | – | Boilerplate-Reduktion |
| **JaCoCo** | 0.8.12 | Code-Coverage-Reports |
| **Maven** | 3.9+ | Build-Tool |

### Frontend
| Technologie | Version | Verwendung |
|-------------|---------|------------|
| **Angular** | 21 | SPA-Framework |
| **Angular Material** | 21 | UI-Komponentenbibliothek |
| **TypeScript** | 5.9 | Programmiersprache |
| **RxJS** | 7.8 | Reaktive Programmierung |
| **Vitest** | 4.0 | Unit-Testing |
| **Nginx** | alpine | Produktions-Webserver |

### Infrastruktur
| Technologie | Verwendung |
|-------------|------------|
| **MongoDB** | Dokumenten-Datenbank & GridFS für Datei-Uploads |
| **Docker / Docker Compose** | Containerisierung & Orchestrierung |
| **GitLab CI/CD** | Automatisierte Builds & Deployments |

---

## 📁 Projektstruktur

```
PraxisForm/
├── docker-compose.yml              # Lokale Entwicklungsumgebung
├── docker-compose.prod.yml         # Produktions-Konfiguration
│
├── praxis/                         # 🔧 Spring Boot Backend
│   ├── Dockerfile
│   ├── pom.xml
│   ├── src/main/java/.../praxis/
│   │   ├── PraxisApplication.java          # Einstiegspunkt
│   │   ├── controllers/
│   │   │   ├── AuthController.java         # POST /api/auth/login
│   │   │   ├── PublicSubmissionController   # POST /api/submissions
│   │   │   ├── AdminSubmissionController    # CRUD /api/admin/submissions
│   │   │   └── AdminSubmissionsStreamCtrl   # GET  /api/admin/submissions/stream (SSE)
│   │   ├── modules/
│   │   │   ├── patient/                    # Submission, PatientData, MedicalData, ...
│   │   │   ├── admin/                      # Admin, JwtService, SecurityConfig, SseHub
│   │   │   └── form/                       # FormDefinition (JSON Schema)
│   │   ├── DTOs/                           # Request/Response-Objekte
│   │   └── repos/                          # Spring Data Repositories
│   └── src/test/                           # Unit- & Integrationstests
│
├── praxis-frontend/                # 🎨 Angular Frontend
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── src/app/
│   │   ├── features/
│   │   │   ├── patient-form/               # Patientenformular (Stepper)
│   │   │   ├── admin/                      # Admin-Dashboard mit SSE
│   │   │   ├── submission-details/         # Detailansicht einer Einreichung
│   │   │   ├── login/                      # Admin-Login
│   │   │   └── submission-success/         # Erfolgsseite nach Einreichung
│   │   ├── core/
│   │   │   ├── api/                        # API-Services & Models
│   │   │   ├── auth/                       # AuthService, AuthGuard
│   │   │   └── consent/                    # Einwilligungsverwaltung
│   │   └── shared/                         # Wiederverwendbare Komponenten
│   └── src/assets/
│       └── env.template.js                 # Runtime-Umgebungsvariablen
│
└── docs/
    └── class-diagram.puml          # UML-Klassendiagramm (PlantUML)
```

---

## 📦 Voraussetzungen

| Werkzeug | Mindestversion |
|----------|----------------|
| **Docker** & **Docker Compose** | 20.10+ / v2 |
| **Java JDK** *(nur lokale Backend-Entwicklung)* | 17+ |
| **Node.js** *(nur lokale Frontend-Entwicklung)* | 22+ |
| **Maven** *(optional, Wrapper enthalten)* | 3.9+ |

---

## 🚀 Installation & Start

### Option 1: Full-Stack mit Docker (empfohlen)

```bash
# Repository klonen
git clone <repository-url>
cd PraxisForm

# Alle Services starten
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:4200](http://localhost:4200) |
| Backend API | [http://localhost:8080](http://localhost:8080) |
| MongoDB | `localhost:27017` |

### Option 2: Lokale Entwicklung

**Backend starten:**

```bash
cd praxis

# MongoDB muss lokal laufen oder per Docker:
docker compose up mongodb -d

# Spring Boot starten (Windows)
mvnw.cmd spring-boot:run

# Spring Boot starten (Linux/macOS)
./mvnw spring-boot:run
```

**Frontend starten:**

```bash
cd praxis-frontend
npm install
npm start
```

Das Frontend ist unter [http://localhost:4200](http://localhost:4200) erreichbar.

---

## ⚙️ Umgebungsvariablen

| Variable | Beschreibung | Standardwert |
|----------|-------------|--------------|
| `MONGODB_URI` | MongoDB-Connection-String | `mongodb://localhost:27017/praxis` |
| `JWT_SECRET` | Geheimer Schlüssel für JWT-Signierung (min. 32 Zeichen) | `CHANGE_ME_very_long_secret_at_least_32_chars` |
| `JWT_EXP_MINUTES` | JWT-Token-Gültigkeitsdauer in Minuten | `120` |
| `ADMIN_DEFAULT_PASSWORD` | Initiales Admin-Passwort (beim ersten Start) | `changeme` |
| `API_URL` | Backend-API-URL für das Frontend | `https://dev.praxis-form.de` |

> ⚠️ **Wichtig:** Ändere `JWT_SECRET` und `ADMIN_DEFAULT_PASSWORD` in Produktionsumgebungen unbedingt!

---

## 🔌 API-Übersicht

### Öffentlich (kein Token erforderlich)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| `POST` | `/api/submissions` | Neues Patientenformular einreichen |
| `POST` | `/api/auth/login` | Admin-Login, gibt JWT zurück |

### Admin (JWT-Token erforderlich)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| `GET` | `/api/admin/submissions` | Alle Einreichungen abrufen (optional `?status=NEW`) |
| `GET` | `/api/admin/submissions/:id` | Einzelne Einreichung abrufen |
| `PATCH` | `/api/admin/submissions/:id` | Einreichung bearbeiten |
| `PATCH` | `/api/admin/submissions/:id/status` | Status aktualisieren (`NEW` → `VIEWED` → `DONE`) |
| `GET` | `/api/admin/submissions/:id/attachments/:fileId` | Dateianhang herunterladen |
| `GET` | `/api/admin/submissions/stream` | SSE-Stream für Echtzeit-Updates |

---

## 🧪 Tests

### Backend-Tests

```bash
cd praxis

# Alle Tests ausführen
mvnw.cmd test          # Windows
./mvnw test            # Linux/macOS

# Coverage-Report generieren (JaCoCo)
# Report unter: target/site/jacoco/index.html
```

---

## 🌐 Deployment

### Produktion mit Docker Compose

```bash
# Umgebungsvariablen setzen
export CI_REGISTRY_IMAGE=registry.gitlab.com/infra-x-group/<your-project>
export JWT_SECRET="ein_sicherer_geheimer_schluessel_min_32_zeichen"
export ADMIN_DEFAULT_PASSWORD="sicheres_admin_passwort"

# Produktions-Compose starten
docker compose -f docker-compose.prod.yml up -d
```

### GitLab CI/CD

Das Projekt ist für den Betrieb mit **GitLab Container Registry** vorbereitet. Die Produktions-`docker-compose.prod.yml` zieht vorgefertigte Images aus der Registry:

```yaml
image: ${CI_REGISTRY_IMAGE}/backend:latest
image: ${CI_REGISTRY_IMAGE}/frontend:latest
```

### Empfohlener Produktions-Stack

```
Client → Nginx Reverse Proxy (SSL) → Frontend (:80) → Backend (:8080) → MongoDB (:27017)
```

---

<p align="center">
  Entwickelt mit ❤️ für die digitale Arztpraxis
</p>

