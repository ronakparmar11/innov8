import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// In-memory user store placeholder; replace with DB integration later.
type UserRecord = { id: string; email: string; passwordHash: string };
const users: UserRecord[] = [];

export async function registerUser(email: string, password: string) {
  const existing = users.find((u) => u.email === email);
  if (existing) throw new Error("User already exists");
  const passwordHash = await bcrypt.hash(password, 10);
  const user: UserRecord = { id: crypto.randomUUID(), email, passwordHash };
  users.push(user);
  return { id: user.id, email: user.email };
}

export async function authenticate(email: string, password: string) {
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("Invalid credentials");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials");
  return { id: user.id, email: user.email };
}

export function signToken(payload: object) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}

export function verifyToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.verify(token, secret);
}
