import "../css/index.less";
import OgModalAlertView from "og-components/og-modal-alert/views/alert.html";
import SecurityDeleteView from "securities/views/delete.html";
import SecurityEditView from "securities/views/edit.html";
import angular from "angular";

export default class SecurityIndexController {
	constructor($scope, $transitions, $uibModal, $timeout, $state, securityModel, ogTableNavigableService, securities) {
		const	self = this,
					decimalPlaces = 2;

		this.$uibModal = $uibModal;
		this.$timeout = $timeout;
		this.$state = $state;
		this.securityModel = securityModel;
		this.ogTableNavigableService = ogTableNavigableService;
		this.securities = securities;
		this.totalValue = securities.reduce((memo, security) => memo + Number(Number(security.closing_balance).toFixed(decimalPlaces)), 0);
		this.tableActions = {
			selectAction() {
				$state.go(".transactions");
			},
			editAction(index) {
				self.editSecurity(index);
			},
			insertAction() {
				// Same as select action, but don't pass any arguments
				self.editSecurity();
			},
			deleteAction(index) {
				self.deleteSecurity(index);
			},
			focusAction(index) {
				$state.go(`${$state.includes("**.security") ? "^" : ""}.security`, {id: self.securities[index].id});
			}
		};

		// If we have a security id, focus the specified row
		if (Number($state.params.id)) {
			this.focusSecurity(Number($state.params.id));
		}

		// When the id state parameter changes, focus the specified row
		$scope.$on("$destroy", $transitions.onSuccess({to: "root.securities.security"}, transition => this.focusSecurity(Number(transition.params("to").id))));
	}

	editSecurity(index) {
		// Helper function to sort by security current holding and name
		function byHoldingAndName(a, b) {
			let x, y;

			if (a.unused === b.unused) {
				if ((a.current_holding > 0) === (b.current_holding > 0)) {
					return a.name.localeCompare(b.name);
				}

				x = a.current_holding <= 0;
				y = b.current_holding <= 0;
			} else {
				x = a.unused;
				y = b.unused;
			}

			return x - y;
		}

		// Disable navigation on the table
		this.ogTableNavigableService.enabled = false;

		// Show the modal
		this.$uibModal.open({
			templateUrl: SecurityEditView,
			controller: "SecurityEditController",
			controllerAs: "vm",
			backdrop: "static",
			resolve: {
				security: () => {
					let security;

					// If we didn't get an index, we're adding a new security so just return null
					if (!isNaN(index)) {
						security = this.securities[index];

						// Add the security to the LRU cache
						this.securityModel.addRecent(security);
					}

					return security;
				}
			}
		}).result.then(security => {
			if (isNaN(index)) {
				// Add new security to the end of the array
				this.securities.push(security);

				// Add the security to the LRU cache
				this.securityModel.addRecent(security);
			} else {
				// Update the existing security in the array
				this.securities[index] = security;
			}

			// Resort the array
			this.securities.sort(byHoldingAndName);

			// Refocus the security
			this.focusSecurity(security.id);
		}).finally(() => (this.ogTableNavigableService.enabled = true));
	}

	deleteSecurity(index) {
		// Check if the security can be deleted
		this.securityModel.find(this.securities[index].id).then(security => {
			// Disable navigation on the table
			this.ogTableNavigableService.enabled = false;

			let modalOptions = {
				backdrop: "static"
			};

			// Check if the security has any transactions
			if (security.num_transactions > 0) {
				// Show an alert modal
				modalOptions = angular.extend({
					templateUrl: OgModalAlertView,
					controller: "OgModalAlertController",
					controllerAs: "vm",
					resolve: {
						alert: () => ({
							header: "Security has existing transactions",
							message: "You must first delete these transactions, or reassign to another security before attempting to delete this security."
						})
					}
				}, modalOptions);
			} else {
				// Show the delete security modal
				modalOptions = angular.extend({
					templateUrl: SecurityDeleteView,
					controller: "SecurityDeleteController",
					controllerAs: "vm",
					resolve: {
						security: () => this.securities[index]
					}
				}, modalOptions);
			}

			// Show the modal
			this.$uibModal.open(modalOptions).result.then(() => {
				this.securities.splice(index, 1);
				this.$state.go("root.securities");
			}).finally(() => (this.ogTableNavigableService.enabled = true));
		});
	}

	toggleFavourite(index) {
		this.securityModel.toggleFavourite(this.securities[index]).then(favourite => (this.securities[index].favourite = favourite));
	}

	// Finds a specific security and focusses that row in the table
	focusSecurity(securityIdToFocus) {
		const delay = 50;
		let targetIndex;

		// Find the security by it's id
		angular.forEach(this.securities, (security, index) => {
			if (isNaN(targetIndex) && security.id === securityIdToFocus) {
				targetIndex = index;
			}
		});

		// If found, focus the row
		if (!isNaN(targetIndex)) {
			this.$timeout(() => this.tableActions.focusRow(targetIndex), delay);
		}

		return targetIndex;
	}
}

SecurityIndexController.$inject = ["$scope", "$transitions", "$uibModal", "$timeout", "$state", "securityModel", "ogTableNavigableService", "securities"];