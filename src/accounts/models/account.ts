import {Account, Accounts} from "accounts/types";
import OgLruCacheFactory, {OgLruCache} from "og-components/og-lru-cache-factory/models/og-lru-cache-factory";
import {Flushable} from "loot/types";
import {OgCacheEntry} from "og-components/og-lru-cache-factory/types";

// Number of accunts to keep in the LRU cache
const LRU_CAPACITY = 10;

export default class AccountModel implements Flushable {
	private readonly cache: angular.ICacheObject;

	private readonly lruCache: OgLruCache;

	public recent: OgCacheEntry[];

	constructor(private readonly $http: angular.IHttpService, $cacheFactory: angular.ICacheFactoryService, private readonly $window: angular.IWindowService, ogLruCacheFactory: OgLruCacheFactory) {
		// Angular HTTP cache for accounts
		this.cache = $cacheFactory("accounts");

		// Create an LRU cache and populate with the recent account list from local storage
		this.lruCache = ogLruCacheFactory.new(LRU_CAPACITY, <OgCacheEntry[]> JSON.parse(this.$window.localStorage.getItem(this.LRU_LOCAL_STORAGE_KEY) || ""));
		this.recent = this.lruCache.list;
	}

	get UNRECONCILED_ONLY_LOCAL_STORAGE_KEY(): string {
		return "lootUnreconciledOnly-";
	}

	get LRU_LOCAL_STORAGE_KEY(): string {
		return "lootRecentAccounts";
	}

	// Returns the model type
	get type(): string {
		return "account";
	}

	// Returns the API path
	path(id?: string): string {
		return `/accounts${id ? `/${id}` : ""}`;
	}

	// Retrieves the list of accounts
	all(includeBalances?: boolean): angular.IPromise<Account[] | Accounts> {
		return this.$http.get(`${this.path()}${includeBalances ? "?include_balances" : ""}`, {
			cache: includeBalances ? false : this.cache
		}).then((response: angular.IHttpResponse<Account[] | Accounts>): Account[] | Accounts => response.data);
	}

	// Retrieves the list of accounts, including balances
	allWithBalances(): angular.IPromise<Accounts> {
		return <angular.IPromise<Accounts>> this.all(true);
	}

	// Retrieves a single account
	find(id: string): angular.IPromise<Account> {
		return this.$http.get(this.path(id), {
			cache: this.cache
		}).then((response: angular.IHttpResponse<Account>): Account => {
			this.addRecent(response.data);

			return response.data;
		});
	}

	// Saves an account
	save(account: Account): angular.IHttpPromise<Account> {
		// Flush the $http cache
		this.flush();

		return this.$http({
			method: account.id ? "PATCH" : "POST",
			url: this.path(account.id),
			data: account
		});
	}

	// Deletes an account
	destroy(account: Account): angular.IPromise<void> {
		// Flush the $http cache
		this.flush();

		return this.$http.delete(this.path(account.id)).then((): void => this.removeRecent(account.id));
	}

	// Updates all pending transactions for an account to cleared
	reconcile(id: string): angular.IHttpPromise<void> {
		return this.$http.put(`${this.path(id)}/reconcile`, null);
	}

	// Favourites/unfavourites an account
	toggleFavourite(account: Account): angular.IPromise<boolean> {
		// Flush the $http cache
		this.flush();

		return this.$http({
			method: account.favourite ? "DELETE" : "PUT",
			url: `${this.path(account.id)}/favourite`
		}).then((): boolean => !account.favourite);
	}

	// Get the unreconciled only setting for an account from local storage
	isUnreconciledOnly(id: string): boolean {
		return this.$window.localStorage.getItem(this.UNRECONCILED_ONLY_LOCAL_STORAGE_KEY + id) !== "false";
	}

	// Set the unreconciled only setting for an account in local storage
	unreconciledOnly(id: string, unreconciledOnly: string): void {
		this.$window.localStorage.setItem(this.UNRECONCILED_ONLY_LOCAL_STORAGE_KEY + id, unreconciledOnly);
	}

	// Flush the cache
	flush(id?: string): void {
		if (id) {
			this.cache.remove(this.path(id));
		} else {
			this.cache.removeAll();
		}
	}

	// Put an item into the LRU cache
	addRecent(account: Account): void {
		// Put the item into the LRU cache
		this.recent = this.lruCache.put(account);

		// Update local storage with the new list
		this.$window.localStorage.setItem(this.LRU_LOCAL_STORAGE_KEY, JSON.stringify(this.lruCache.list));
	}

	// Remove an item from the LRU cache
	removeRecent(id: string): void {
		// Remove the item from the LRU cache
		this.recent = this.lruCache.remove(id);

		// Update local storage with the new list
		this.$window.localStorage.setItem(this.LRU_LOCAL_STORAGE_KEY, JSON.stringify(this.lruCache.list));
	}
}

AccountModel.$inject = ["$http", "$cacheFactory", "$window", "ogLruCacheFactory"];
