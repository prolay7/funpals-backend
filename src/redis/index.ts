import Redis, { Redis as RedisInstance } from 'ioredis';
import { getUserKey, getUserNotificationKey } from './keys';
import { userStatus } from '../lib/constants';

class RedisClient {
  private static instance: RedisClient;
  private redis: RedisInstance | null = null;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public connect(uri:string): RedisInstance {
    if (!this.redis) {
      this.redis = new Redis(uri,{
        maxRetriesPerRequest:null
      });
      this.redis.on('connect', () => console.log('Redis connected'));
      this.redis.on('error', (err) => console.error('Redis error:', err));
    }
    return this.redis;
  }

  public async set(key: string, value: string, expiryInSeconds?: number): Promise<string> {
    if (!this.redis) throw new Error('Redis not connected');
    if (expiryInSeconds) {
      return await this.redis.set(key, value, 'EX', expiryInSeconds);
    }
    return await this.redis.set(key, value);
  }

  public async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.redis) throw new Error('Redis not connected');
    await this.redis.hset(key+':hash', field, value);
  }

  public async hgetWithJson(key: string, field: string): Promise<{[key: string]:any}> {
    if (!this.redis) throw new Error('Redis not connected');
    const result = await this.redis.hget(key+':hash', field);
    return JSON.parse(result || '{}');
  }

  public async hdel(key: string, field: string): Promise<number> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.hdel(key+':hash', field);
  }

  public async hexists(key: string, field: string): Promise<boolean> {
  if (!this.redis) throw new Error('Redis not connected');
  const exists = await this.redis.hexists(key + ':hash', field);
  return exists === 1;
}


  public async get(key: string): Promise<string | null> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.get(key);
  }

  public async del(key: string): Promise<number> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.del(key);
  }
  public async multiSet(pairs: string[][]): Promise<void> {
    if (!this.redis) throw new Error('Redis not connected');

    const pipeline = this.redis.pipeline();

    for (const [key, value] of pairs) {
      pipeline.set(key, value);
    }
    await pipeline.exec();
  }
  public async multiGet(keys: string[]): Promise<[]> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.mget(keys) as [];
  }
  public async multiDel(keys: string[]): Promise<number> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.del(keys);
  }
  public getRawClient(): RedisInstance | null {
    return this.redis;
  }

  public async sadd(key: string, member: string): Promise<number> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.sadd(key, member);
  }

  public async srem(key: string, member: string): Promise<number> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.srem(key, member);
  }

  public async scard(key: string): Promise<number> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.scard(key);
  }

  public async smembers(key: string): Promise<string[]> {
    if (!this.redis) throw new Error('Redis not connected');
    return await this.redis.smembers(key);
  }

   public async sscan(key: string, cursor: string, count = 10): Promise<[string, string[]]> {
    if (!this.redis) throw new Error('Redis not connected');
    const res = await this.redis.sscan(key, cursor, "COUNT", count);
    return res as [string, string[]];
  }

  public async canNotify(userId: number, maxAttempts = 5, windowSeconds = 3600): Promise<boolean> {
    if (!this.redis) throw new Error('Redis not connected');

    const key = getUserNotificationKey(userId);
    const current = await this.redis.get(key);

    if (current === null) {
      await this.set(key, '1', windowSeconds);
      return true;
    }

    const count = parseInt(current, 10);

    if (count >= maxAttempts) {
      return false; 
    }

    await this.redis.incr(key); 
    return true;
  }

  public async getStatusOfUser(userId: number): Promise<string> {
    if (!this.redis) throw new Error('Redis not connected');

    const key = getUserKey(userId);
    return (await this.redis.get(key)) || userStatus.OFFLINE
  }


  public async addUserToOnlineList(userId: number): Promise<void> {
    if (!this.redis) throw new Error('Redis not connected');
    await this.redis.sadd("online_users", userId.toString());
  }

  public async removeUserFromOnlineList(userId: number): Promise<void> {
    if (!this.redis) throw new Error('Redis not connected');
    await this.redis.srem("online_users", userId.toString());
  }
  public async removeUsersFromOnlineList(userIds: number[]): Promise<void> {
    if (!this.redis) throw new Error('Redis not connected');
    await this.redis.srem("online_users", ...userIds.map(id => id.toString()));
  }

}

export default RedisClient;
