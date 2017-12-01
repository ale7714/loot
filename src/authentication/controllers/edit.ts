import AuthenticationModel from "authentication/models/authentication";
import {IModalInstanceService} from "angular-ui-bootstrap";

export default class AuthenticationEditController {
	public userName: string | null = null;

	public password: string | null = null;

	public errorMessage: string | null = null;

	public loginInProgress: boolean = false;

	constructor(private readonly $uibModalInstance: IModalInstanceService, private readonly authenticationModel: AuthenticationModel) {
	}

	// Login and close the modal
	login(): void {
		this.errorMessage = null;
		this.loginInProgress = true;
		this.authenticationModel.login(this.userName, this.password).then((): void => this.$uibModalInstance.close(), (error: angular.IHttpResponse<string>): void => {
			this.errorMessage = error.data;
			this.loginInProgress = false;
		});
	}

	// Dismiss the modal without logging in
	cancel(): void {
		this.$uibModalInstance.dismiss();
	}
}

AuthenticationEditController.$inject = ["$uibModalInstance", "authenticationModel"];