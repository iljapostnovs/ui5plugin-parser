export interface ICacheable {
	setCache<Type>(cacheName: string, cacheValue: Type): void;

	getCache<Type>(cacheName: string): Type;
}