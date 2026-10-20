// Shared test environment. AUTH_SECRET must be set before src/lib/auth.js signs anything.
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-test-secret-test-secret-1234567890";
process.env.NODE_ENV = "test";
