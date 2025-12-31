# NodeTs-Boilerplate

A minimal and extensible Node.js backend boilerplate built with TypeScript. Provides a structured starting point for REST API development using modern patterns, type safety, and scalable project organization.

## Features

* Node.js with TypeScript for type-safe backend development
* Express (or similar) routing structure
* Centralized error handling
* Environment configuration support
* Modular folder layout to scale services and routes
* Preconfigured scripts for development and production

## Getting Started

### Prerequisites

Install the following before running this project:

* Node.js (v16+ recommended)
* npm or yarn

### Setup

1. Clone the repository

   ```bash
   git clone https://github.com/David-Horjet/NodeTs-Boilerplate.git
   cd NodeTs-Boilerplate
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env` file based on the provided `.env.example` and set your environment variables.

### Running Locally

* Start in development mode (with TypeScript compilation on the fly)

  ```bash
  npm run dev
  ```

* Build for production

  ```bash
  npm run build
  npm start
  ```

## Project Structure

A typical structure:

```
src/
├── controllers/         # Request handlers
├── services/            # Business logic
├── routes/              # API route definitions
├── middleware/          # Custom middleware (auth, errors, etc.)
├── utils/               # Helpers / utilities
├── config/              # Environment and app config
├── index.ts             # Application entry point
```

This layout promotes separation of concerns and easier scaling as your backend grows.

## Scripts

* `npm run dev` – start development server
* `npm run build` – compile TypeScript to JavaScript
* `npm start` – run the compiled app
* `npm run lint` – run linters

## Environment Variables

The project uses a `.env` file for configuration. Typical variables to define:

```
PORT=3000
NODE_ENV=development
DATABASE_URL=...
JWT_SECRET=...
```

Update `.env.example` with actual expected variables.

## Contributing

To add features, fix bugs, or improve documentation:

1. Fork the repository
2. Create a feature branch
3. Write code and tests
4. Submit a pull request

## License

MIT
