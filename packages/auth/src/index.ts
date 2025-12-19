import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateCancellationCode(): string {
  return randomBytes(16).toString('hex')
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}
