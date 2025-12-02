import { createHash, randomBytes } from 'crypto'

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

export function generateCancellationCode(): string {
  return randomBytes(16).toString('hex')
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}
