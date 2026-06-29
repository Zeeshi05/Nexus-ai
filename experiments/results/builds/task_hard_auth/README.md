# Express JWT RBAC Service

A stateless, high-performance Express.js service implementing JWT-based authentication and Role-Based Access Control (RBAC) using TypeScript.

## Prerequisites
- Node.js (v18+)
- npm (v9+)

## Installation
```bash
npm install
npm run build
```

## Environment Variables
Create a `.env` file in the root directory:
- `JWT_SECRET`: A strong secret key for RS256/HS256 signing.

## Architecture Flow
```text
[Client Request]
       |
[Sanitize Inputs Middleware] -> Strips malicious payloads
       |
[Authenticate Middleware]    -> Validates JWT signature/expiry
       |
[Authorize Middleware]       -> Checks RBAC claims in payload
       |
[Business Logic Handler]     -> Executes protected operation
```

## Usage Examples

### 1. Public Endpoint
`curl -X GET http://localhost:3000/public`

### 2. Protected User Endpoint
`curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/user/profile`

### 3. Admin-Only Endpoint
`curl -H "Authorization: Bearer <TOKEN>" -X POST http://localhost:3000/admin/config`

## Role/Permission Matrix

| Role | Read | Write | Admin |
| :--- | :---: | :---: | :---: |
| Guest | Yes | No | No |
| User | Yes | Yes | No |
| Admin | Yes | Yes | Yes |

## Error Codes
- 400: Bad Input (Sanitization failure)
- 401: Missing/Invalid Token
- 403: Forbidden (Insufficient permissions)
- 498: Token Expired