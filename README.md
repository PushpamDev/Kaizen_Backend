# Kaizen Backend

Welcome to the **Kaizen Backend** repository. This project serves as the backend for the Kaizen application, providing essential APIs and services for managing employees, workflows, authentication, and more.

## Table of Contents

- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Docker Support](#docker-support)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Project Structure

The repository is organized as follows:

- `config/` - Configuration files for environment variables and settings.
- `controllers/` - Request handlers defining the application's business logic.
- `middleware/` - Custom middleware functions for request validation and authentication.
- `models/` - Data models representing the application's database schema.
- `routes/` - Express route definitions mapping URLs to controllers.
- `services/` - Core services handling business logic.
- `utils/` - Utility functions and helpers for various operations.
- `admin/` - AdminJS components for managing the application through an admin panel.
- `__tests__/` - Unit test cases for application functionality.
- `generated_pdfs/` and `uploads/` - Directories for generated PDFs and uploaded files.

---

## Installation

To set up the project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PushpamDev/Kaizen_Backend.git
   ```
2. **Navigate to the project directory:**
   ```bash
   cd Kaizen_Backend
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```

---

## Usage

To start the development server:
```bash
npm start
```
The server will run on the port specified in the environment variables or default to `3000`.

For development with live reload support:
```bash
npm run dev
```

---

## Environment Variables

Create a `.env` file in the root directory and define the following variables:
```env
PORT=3000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
API_KEY=your_api_key
```
Replace the placeholder values with actual configurations.

---

## Docker Support

This project includes Docker support for easy deployment. Use the following command to build and run the application in a container:
```bash
docker-compose up --build
```
The application will be available at `http://localhost:3000` (or the port specified in `.env`).

---

## Testing

To run the test suite:
```bash
npm test
```
For running tests with coverage report:
```bash
npm run test:coverage
```

---

## API Documentation

The project includes API documentation using Swagger.
To access it, start the server and visit:
```
http://localhost:3000/api-docs
```
This provides a list of available endpoints and their descriptions.

---

## Contributing

Contributions are welcome! Follow these steps:

1. **Fork the repository.**
2. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature-branch
   ```
3. **Make your changes and commit them:**
   ```bash
   git commit -m "Describe your changes"
   ```
4. **Push to your fork and submit a pull request:**
   ```bash
   git push origin feature-branch
   ```

---

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software in accordance with the license.

---

**Maintainers:** If you encounter any issues, please create an issue on GitHub or reach out to the project maintainers.

