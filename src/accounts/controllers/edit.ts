import {Account, AccountStatus, AccountType} from "accounts/types";
import AccountModel from "accounts/models/account";
import {IModalInstanceService} from "angular-ui-bootstrap";
import angular from "angular";

export default class AccountEditController {
	public readonly account: Account;

	public readonly mode: "Edit" | "Add";

	public errorMessage: string | null = null;

	constructor(private readonly $uibModalInstance: IModalInstanceService, private readonly filterFilter: angular.IFilterFilter, private readonly limitToFilter: angular.IFilterLimitTo,
		private readonly accountModel: AccountModel, account: Account) {
		this.account = angular.extend({opening_balance: 0}, account);
		this.mode = account ? "Edit" : "Add";

		// Capitalise the account type and status
		if (account) {
			this.account.account_type = <AccountType> `${this.account.account_type.charAt(0).toUpperCase()}${this.account.account_type.substr(1)}`;
			this.account.status = <AccountStatus> `${this.account.status.charAt(0).toUpperCase()}${this.account.status.substr(1)}`;
		}
	}

	// List of account types for the typeahead
	accountTypes(filter: string): AccountType[] {
		const types: AccountType[] = ["Asset", "Bank", "Cash", "Credit", "Investment", "Liability", "Loan"];

		return filter ? this.filterFilter(types, filter) : types;
	}

	// Handler for account type changes
	accountTypeSelected(): void {
		if ("Investment" === this.account.account_type) {
			this.account.related_account = {
				opening_balance: 0
			};
		} else {
			this.account.related_account = null;
		}
	}

	// List of accounts for the typeahead
	accounts(filter: string, limit: number): angular.IPromise<Account[]> {
		return this.accountModel.all().then((accounts: Account[]): Account[] => this.limitToFilter(this.filterFilter(accounts, {name: filter, account_type: "asset"}), limit));
	}

	// Save and close the modal
	save(): void {
		this.errorMessage = null;

		// Convert the account type & status to lower case
		this.account.account_type = <AccountType> this.account.account_type.toLowerCase();
		this.account.status = <AccountStatus> this.account.status.toLowerCase();

		this.accountModel.save(this.account).then((account: angular.IHttpResponse<Account>): void => this.$uibModalInstance.close(account.data), (error: angular.IHttpResponse<string>): string => (this.errorMessage = error.data));
	}

	// Dismiss the modal without saving
	cancel(): void {
		this.$uibModalInstance.dismiss();
	}
}

AccountEditController.$inject = ["$uibModalInstance", "filterFilter", "limitToFilter", "accountModel", "account"];
