import {Account, AccountStatus, AccountType} from "accounts/types";
import AccountModel from "accounts/models/account";
import {IModalInstanceService} from "angular-ui-bootstrap";

export default class AccountDeleteController {
	public errorMessage: string | null = null;

	constructor(private readonly $uibModalInstance: IModalInstanceService, private readonly accountModel: AccountModel, public readonly account: Account) {
		// Capitalise the account type and status
		this.account.account_type = <AccountType> `${this.account.account_type.charAt(0).toUpperCase()}${this.account.account_type.substr(1)}`;
		this.account.status = <AccountStatus> `${this.account.status.charAt(0).toUpperCase()}${this.account.status.substr(1)}`;
	}

	// Delete and close the modal
	deleteAccount(): void {
		this.errorMessage = null;
		this.accountModel.destroy(this.account).then((): void => this.$uibModalInstance.close(), (error: angular.IHttpResponse<string>): string => (this.errorMessage = error.data));
	}

	// Dismiss the modal without deleting
	cancel(): void {
		this.$uibModalInstance.dismiss();
	}
}

AccountDeleteController.$inject = ["$uibModalInstance", "accountModel", "account"];