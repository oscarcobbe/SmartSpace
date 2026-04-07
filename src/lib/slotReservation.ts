// Slot reservation system using Upstash Redis
// Reserves time slots for 20 minutes while customer completes checkout
//
// Env vars needed: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// Get these free at https://console.upstash.com

import { Redis } from "@upstash/redis";

const RESERVATION_TTL = 20 * 60; // 20 minutes in seconds

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function slotKey(date: string, timeSlot: string): string {
  return `reservation:${date}:${timeSlot}`;
}

interface Reservation {
  date: string;
  timeSlot: string;
  cartId: string;
  customerEmail?: string;
  productTitle?: string;
  reservedAt: string;
}

/**
 * Reserve a time slot for 20 minutes.
 * Returns true if reserved, false if already taken.
 */
export async function reserveSlot(
  date: string,
  timeSlot: string,
  cartId: string,
  customerEmail?: string,
  productTitle?: string,
): Promise<{ reserved: boolean; expiresIn: number }> {
  const redis = getRedis();
  if (!redis) {
    // Redis not configured — allow all reservations (no locking)
    return { reserved: true, expiresIn: RESERVATION_TTL };
  }

  const key = slotKey(date, timeSlot);

  // Check if slot is already reserved by someone else
  const existing = await redis.get<Reservation>(key);
  if (existing && existing.cartId !== cartId) {
    return { reserved: false, expiresIn: 0 };
  }

  // Reserve the slot (or refresh if same cart)
  const reservation: Reservation = {
    date,
    timeSlot,
    cartId,
    customerEmail,
    productTitle,
    reservedAt: new Date().toISOString(),
  };

  await redis.set(key, reservation, { ex: RESERVATION_TTL });
  return { reserved: true, expiresIn: RESERVATION_TTL };
}

/**
 * Release a reservation (e.g., customer changed their mind)
 */
export async function releaseSlot(date: string, timeSlot: string, cartId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = slotKey(date, timeSlot);
  const existing = await redis.get<Reservation>(key);

  // Only release if it's our reservation
  if (existing && existing.cartId === cartId) {
    await redis.del(key);
  }
}

/**
 * Confirm a reservation (after payment) — removes from Redis
 * The confirmed booking will be in Google Calendar instead
 */
export async function confirmSlot(date: string, timeSlot: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = slotKey(date, timeSlot);
  await redis.del(key);
}

/**
 * Check which slots on a given date are currently reserved
 * Returns a set of reserved timeSlot values
 */
export async function getReservedSlots(date: string): Promise<Set<string>> {
  const redis = getRedis();
  if (!redis) return new Set();

  const slots = ["10:30-12:30", "12:30-14:30", "14:30-16:30"];
  const reserved = new Set<string>();

  // Check each possible slot
  const keys = slots.map((s) => slotKey(date, s));
  const results = await Promise.all(keys.map((k) => redis.get<Reservation>(k)));

  results.forEach((result, i) => {
    if (result) {
      reserved.add(slots[i]);
    }
  });

  return reserved;
}
