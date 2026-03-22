# Next.js Full-Stack Boilerplate

A production-ready, convention-driven full-stack framework based on Next.js (App Router), designed to eliminate repetitive infrastructure work and let developers focus solely on business logic.

[![Node.js Version](https://img.shields.io/badge/Node.js-20.14.0+-green.svg)](https://nodejs.org/)
[![Package Manager](https://img.shields.io/badge/package%20manager-yarn-blue.svg)](https://yarnpkg.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

## ✨ What's Included (Out-of-the-box Capabilities)

This boilerplate has already done all the heavy lifting for you:

- ✅ Unified API response format with automatic `requestId`/`timestamp` injection
- ✅ Global exception handling for both frontend and backend
- ✅ Type-safe request/response with full-link TypeScript type inference
- ✅ Pre-configured request interceptors (Token management, 401 auto-redirect, error prompts)
- ✅ Standardized API wrapper functions (`withApiHandler`/`withPaginationApiHandler`)
- ✅ Convention-based directory structure (no messy file scattering)
- ✅ ESLint/Prettier code style enforcement
- ✅ Database connection pool integration (MySQL)

## 🚀 Quick Start

### Prerequisites

- Node.js `20.14.0+` (LTS version recommended)
- Yarn package manager
- MySQL database (optional, can be replaced with other databases)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/your-username/nextjs-fullstack-boilerplate.git

# Install dependencies
cd nextjs-fullstack-boilerplate
yarn install

# Start development server
yarn run dev

# Build for production
yarn run build

# Start production server
yarn run start
```

## 🛠️ Tech Stack

| Category         | Technologies                                    |
| ---------------- | ----------------------------------------------- |
| Core Framework   | Next.js (App Router)                            |
| Language         | TypeScript (strict mode)                        |
| State Management | React Hooks / ahooks                            |
| Database         | MySQL (with connection pool)                    |
| Code Quality     | ESLint / Prettier                               |
| API Handling     | Custom request interceptors / response wrappers |
| Styling          | CSS Modules / Tailwind CSS (easily extendable)  |

## 📁 Directory Convention (Mandatory)

Strict adherence to this structure eliminates confusion and ensures maintainability:

```
PROJECT_ROOT/
├── app/
│   ├── _components/       # Global shared components (NO scattered files)
│   ├── _constant/         # Global constants (enums, configs)
│   ├── _types/            # Global TypeScript types (shared by frontend/backend)
│   │   ├── common/        # Common types (ApiResponse, enums)
│   │   └── [module]/      # Module-specific types (auth, user, etc.)
│   ├── _utils/            # Global utility functions
│   │   └── response/      # Request/response core logic
│   ├── api/               # All API routes (convention-based grouping)
│   │   ├── (auth)/        # Logical group (NO URL mapping)
│   │   │   ├── login/     # Login API (URL: /api/login)
│   │   │   └── register/  # Register API (URL: /api/register)
│   │   └── [module]/      # Business module (URL-mapped)
│   └── [page]/            # Frontend pages
├── lib/                   # Third-party library wrappers (db, logger)
└── public/                # Static assets
```

### Key Directory Rules

1. **`_components`/`_utils`/`_types`/`_constant`**: Must be centralized, NO scattered files
2. **`app/api/`**: All APIs must live here
   - `(group)`: Logical grouping (no URL mapping)
   - `module`: Business grouping (maps to URL path)
3. **NO custom infrastructure**: Use the provided utilities instead of reinventing the wheel

## 📝 What You DON'T Need to Do

- ❌ No need to write `try/catch` for API error handling (global handler included)
- ❌ No need to manually create API responses (auto-wrapped by `withApiHandler`)
- ❌ No need to handle request/response formatting (standardized structure)
- ❌ No need to manage TypeScript types for APIs (shared type definitions)
- ❌ No need to implement request interceptors (Token, 401 redirect, error prompts)

## 🚀 What You ONLY Need to Do

### 1. Write API Logic

Just implement business logic and return a plain object (no boilerplate):

```typescript
// app/api/(auth)/register/route.ts
import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types/common/enum";
import pool from "@/lib/db";

// Pure business logic (NO infrastructure code)
const registerHandler = async (req: NextRequest) => {
  const { username, phone, password } = await req.json();

  // 1. Parameter validation
  if (!username || !phone || !password) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "Username/phone/password are required",
    };
  }

  // 2. Business validation
  const [exist] = await pool.query("SELECT * FROM users WHERE phone = ?", [
    phone,
  ]);
  if ((exist as Array<any>).length > 0) {
    return {
      businessCode: BusinessCodeEnum.ResourceConflict,
      httpCode: HttpCodeEnum.Conflict,
      message: "Phone number already registered",
    };
  }

  // 3. Success response
  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Created,
    message: "Registration successful",
    data: null,
  };
};

// One line to enable all infrastructure capabilities
export const POST = withApiHandler(registerHandler);
```

### 2. Write Frontend Pages

Call standardized request methods with automatic type inference:

```tsx
// app/auth/register/page.tsx
"use client";
import { useRequest } from "ahooks";
import { request } from "@/utils/response/request";
import type { RegisterRequest, RegisterResponseData } from "@/types/auth";
import { BusinessCodeEnum } from "@/types/common/enum";

export default function Register() {
  // Type-safe API call (auto-infers response type)
  const { run, loading } = useRequest(
    (params: RegisterRequest) =>
      request.post<RegisterResponseData>("/api/register", params),
    {
      manual: true,
      onSuccess: (res) => {
        if (res.businessCode === BusinessCodeEnum.Success) {
          alert("Registration successful!");
          // Navigate to login page
        }
      },
    }
  );

  // Only focus on UI rendering
  return (
    <div className="register-container">
      <h1>Create Account</h1>
      <button
        onClick={() =>
          run({ username: "demo", phone: "17600000000", password: "123456" })
        }
        disabled={loading}
      >
        Register
      </button>
    </div>
  );
}
```

## 📚 Core Utilities to Use

### API Wrappers

- `withApiHandler`: Standard API response wrapper
- `withPaginationApiHandler`: Pagination-specific API wrapper

### Request Methods

- `request.get<T>(url, options)`: GET request with type inference
- `request.post<T>(url, data, options)`: POST request with type inference
- `request.getPagination<T>(url, options)`: Pagination GET request
- `request.postPagination<T>(url, data, options)`: Pagination POST request

### Type System

- `ApiResponse<T>`: Standard API response type
- `ApiPaginationResponse<T>`: Pagination API response type
- `BusinessCodeEnum`: Semantic business status codes
- `HttpCodeEnum`: Semantic HTTP status codes

## 🎯 Response Format Standard

All APIs return a unified format (auto-generated by wrappers):

```json
{
  "httpCode": 201,
  "businessCode": 1000,
  "message": "Operation successful",
  "data": null,
  "requestId": "unique-request-id",
  "timestamp": 1713878400000
}
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/nextjs-fullstack-boilerplate&type=Date)](https://star-history.com/#your-username/nextjs-fullstack-boilerplate&Date)

---

### Why This Boilerplate?

Designed for developers who hate repetitive infrastructure work:

- **Beginners**: No need to learn complex Next.js infrastructure
- **Teams**: Enforces consistent code style and structure
- **Maintainers**: Easy to scale and maintain with convention-driven design

Contributions are welcome! Feel free to open issues and pull requests.
