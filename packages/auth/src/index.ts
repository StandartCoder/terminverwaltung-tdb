import { randomBytes } from 'crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const BCRYPT_ROUNDS = 12
const JWT_ALGORITHM = 'HS256'
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters')
  }
  return secret
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required')
  }
  if (secret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters')
  }
  return secret
}

export interface JwtPayload {
  sub: string
  email: string
  isAdmin: boolean
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  })
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getRefreshSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: REFRESH_TOKEN_EXPIRY,
  })
}

export function generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
  }) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getRefreshSecret(), {
    algorithms: [JWT_ALGORITHM],
  }) as JwtPayload
}

export function decodeToken(token: string): JwtPayload | null {
  const decoded = jwt.decode(token)
  if (!decoded || typeof decoded === 'string') {
    return null
  }
  return decoded as JwtPayload
}

export function generateCancellationCode(): string {
  return randomBytes(16).toString('hex')
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}
