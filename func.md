# KinesIA Project Overview: API Structure & Architecture

## Project Purpose
KinesIA is a comprehensive medical/fitness therapy management system designed to track and manage physical therapy patients, exercise routines, and session progress. It provides a complete REST API for healthcare professionals to manage patient data, therapy routines, and treatment progress with support for media files and analytics.

## Architecture Overview

### Core Components
```
KinesIA API (Azure App Service)
├── PostgreSQL Database (Azure Database for PostgreSQL)
├── Blob Storage (Azure Storage)
└── Azure Functions (Serverless)
```

### Technical Stack
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL (Azure) / SQLite (local)
- **ORM**: Sequelize
- **File Storage**: Azure Blob Storage
- **Serverless**: Azure Functions
- **Build Tools**: pnpm workspace
- **Testing**: smoke.sh integration tests

## API Endpoint Structure (19 Total)

### User Management API (6 endpoints)
1. **GET** `/api/usuarios` - List all patients/users
2. **POST** `/api/usuarios` - Register new patient
3. **GET** `/api/usuarios/:id` - Get patient details
4. **PUT** `/api/usuarios/:id` - Update patient information
5. **DELETE** `/api/usuarios/:id` - Remove patient
6. **POST** `/api/usuarios/:id/foto` - Upload patient photo

### Routine Management API (6 endpoints)
1. **GET** `/api/rutinas` - List all exercise routines
2. **POST** `/api/rutinas` - Create new therapy routine
3. **GET** `/api/rutinas/:id` - Get routine details
4. **PUT** `/api/rutinas/:id` - Update routine parameters
5. **POST** `/api/rutinas/:id/media` - Upload routine media
6. **DELETE** `/api/rutinas/:id` - Remove routine

### Therapy Session API (6 endpoints)
1. **GET** `/api/sesiones` - List all therapy sessions
2. **POST** `/api/sesiones` - Record new session with metrics
3. **GET** `/api/sesiones/:id` - Get specific session details
4. **GET** `/api/sesiones/usuario/:usuarioId` - Get patient session history
5. **PUT** `/api/sesiones/:id` - Update session data
6. **DELETE** `/api/sesiones/:id` - Remove session

### System & Analytics APIs
1. **GET** `/api/health` - System health check
2. **GET** `/api/estadisticas/:usuarioId` - Patient statistics (Azure Functions)

## Database Schema & Relationships

### Three Core Entities:
- **Usuario (User/Patient)**
  - Fields: `nombre`, `email`, `edad`
  - Constraints: `email` must be unique

- **Rutina (Therapy Routine)**
  - Fields: `nombre`, `descripcion`, `anguloObjetivo`
  - Purpose: Exercise parameters for therapy sessions

- **SesionTerapia (Therapy Session)**
  - Fields: `fecha`, `repeticiones`, `precisionPromedio`, `observaciones`
  - Relationships: 
    - `UsuarioId` → One-to-Many with Usuarios
    - `RutinaId` → One-to-Many with Rutinas

### Key Business Rules:
- **CASCADE DELETE**: Removing a user deletes all their sessions
- **CONSTRAINTS**: Cannot delete routines that have associated sessions (409 conflict)
- **JOIN QUERIES**: Session endpoints include related Usuario and Rutina data

## Azure Deployment Architecture

### 1. Web App (App Service)
- **Runtime**: Node.js 20 LTS on Linux
- **Features**: Automatic scaling, SSL termination, environment variables
- **Endpoints**: All 19 REST API routes
- **Configuration**: `DATABASE_URL`, `DB_SSL`, `AZURE_STORAGE_*` settings

### 2. Database (PostgreSQL Flexible Server)
- **Engine**: PostgreSQL 16
- **Security**: SSL enforced, public access for Azure services
- **Performance**: Burstable compute (B1ms), 32GB storage
- **Access**: Connection string with `sslmode=require`

### 3. Blob Storage
- **Account**: Publicly accessible container `kinesia-media`
- **Access**: Anonymous read access for blobs only
- **Purpose**: Store patient photos and routine media files

### 4. Azure Functions
- **Runtime**: Node.js 20
- **Deployment**: Separate Function App resource
- **Endpoint**: `/api/estadisticas/:usuarioId`
- **Database**: Direct PostgreSQL connection (no Sequelize)
- **Purpose**: Lightweight analytics and statistics

## API Testing Strategy

### smoke.sh Test Script
The comprehensive test suite validates:
1. **CRUD Operations**: All create, read, update, delete operations
2. **Error Handling**: 400, 404, 409 error responses
3. **File Upload**: Blob storage integration
4. **Relationships**: JOIN query functionality
5. **Serverless**: Azure Functions endpoint
6. **Cleanup**: Proper resource deletion

### Test Coverage
- **Success Cases**: 13 positive test scenarios
- **Error Cases**: 3 negative test scenarios
- **Integration**: Cross-service testing (users → sessions → routines)
- **Performance**: File upload and download operations

## Data Flow & Processing

### Request Flow:
```
Client → API Gateway → Express.js Router → Controller → Sequelize → PostgreSQL
                                  ↓
                          Middleware → Validation → Business Logic
```

### File Upload Process:
```
POST /api/usuarios/:id/foto
├── multer middleware (file parsing)
├── Validation (file type, size)
├── Azure Blob Storage Service
└── URL return to client
```

### Analytics Flow (Serverless):
```
GET /api/estadisticas/:usuarioId
├── Azure Functions (HTTP trigger)
├── Direct PostgreSQL query (pg)
├── Session/user metrics aggregation
└── JSON response
```

## Key Integration Points

### 1. Multi-Service Dependencies
- **Web App ↔ Database**: PostgreSQL connection pooling
- **Web App ↔ Storage**: Blob SDK for file uploads
- **Functions ↔ Database**: Independent PostgreSQL connection
- **Web App ↔ Functions**: Cross-service API calls

### 2. Data Consistency
- **Transactional Operations**: Sequelize transactions for complex operations
- **Constraint Enforcement**: Database-level constraints
- **Error Handling**: Comprehensive error middleware
- **Logging**: Structured error logging for debugging

## Deployment & Operations

### Environment Configuration
```bash
# Required Environment Variables
DATABASE_URL=postgresql://admin:password@server.postgres.database.azure.com:5432/postgres
DB_SSL=true
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https...
AZURE_STORAGE_CONTAINER=kinesia-media
DB_SYNC=true  # Only for first deployment
```

### CI/CD Pipeline
- **Source Control**: GitHub repository
- **Build**: Azure Deployment Center
- **Testing**: smoke.sh integration tests
- **Monitoring**: Azure App Service monitoring
- **Scaling**: Auto-scaling rules

## Business Use Cases

### 1. Patient Management
- Register new patients with demographic data
- Upload patient photos for identification
- Update patient information over time

### 2. Therapy Planning
- Create structured exercise routines
- Define biomechanical parameters
- Upload instructional media

### 3. Session Tracking
- Record therapy session metrics
- Track progress with repetition counts and precision
- Document observations and outcomes

### 4. Progress Analysis
- View individual session history
- Analyze patient progress over time
- Generate statistics via serverless functions

This architecture provides a robust, scalable, and fully-featured therapy management system with comprehensive API coverage, proper error handling, and enterprise-grade Azure deployment capabilities.