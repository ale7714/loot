import OgModalAlertView from "og-components/og-modal-alert/views/alert.html";
import PayeeDeleteView from "payees/views/delete.html";
import PayeeEditView from "payees/views/edit.html";
import angular from "angular";

export default class PayeeIndexController {
	constructor($scope, $transitions, $uibModal, $timeout, $state, payeeModel, ogTableNavigableService, payees) {
		const self = this;

		this.$uibModal = $uibModal;
		this.$timeout = $timeout;
		this.$state = $state;
		this.payeeModel = payeeModel;
		this.ogTableNavigableService = ogTableNavigableService;
		this.payees = payees;
		this.tableActions = {
			selectAction() {
				$state.go(".transactions");
			},
			editAction(index) {
				self.editPayee(index);
			},
			insertAction() {
				self.editPayee();
			},
			deleteAction(index) {
				self.deletePayee(index);
			},
			focusAction(index) {
				$state.go(`${$state.includes("**.payee") ? "^" : ""}.payee`, {id: self.payees[index].id});
			}
		};

		// If we have a payee id, focus the specified row
		if (Number($state.params.id)) {
			this.focusPayee(Number($state.params.id));
		}

		// When the id state parameter changes, focus the specified row
		$scope.$on("$destroy", $transitions.onSuccess({to: "root.payees.payee"}, transition => this.focusPayee(Number(transition.params("to").id))));
	}

	editPayee(index) {
		// Helper function to sort by payee name
		function byName(a, b) {
			return a.name.localeCompare(b.name);
		}

		// Disable navigation on the table
		this.ogTableNavigableService.enabled = false;

		// Show the modal
		this.$uibModal.open({
			templateUrl: PayeeEditView,
			controller: "PayeeEditController",
			controllerAs: "vm",
			backdrop: "static",
			resolve: {
				payee: () => {
					let payee;

					// If we didn't get an index, we're adding a new payee so just return null
					if (!isNaN(index)) {
						payee = this.payees[index];

						// Add the payee to the LRU cache
						this.payeeModel.addRecent(payee);
					}

					return payee;
				}
			}
		}).result.then(payee => {
			if (isNaN(index)) {
				// Add new payee to the end of the array
				this.payees.push(payee);

				// Add the payee to the LRU cache
				this.payeeModel.addRecent(payee);
			} else {
				// Update the existing payee in the array
				this.payees[index] = payee;
			}

			// Resort the array
			this.payees.sort(byName);

			// Refocus the payee
			this.focusPayee(payee.id);
		}).finally(() => (this.ogTableNavigableService.enabled = true));
	}

	deletePayee(index) {
		// Check if the payee can be deleted
		this.payeeModel.find(this.payees[index].id).then(payee => {
			// Disable navigation on the table
			this.ogTableNavigableService.enabled = false;

			let modalOptions = {
				backdrop: "static"
			};

			// Check if the payee has any transactions
			if (payee.num_transactions > 0) {
				// Show an alert modal
				modalOptions = angular.extend({
					templateUrl: OgModalAlertView,
					controller: "OgModalAlertController",
					controllerAs: "vm",
					resolve: {
						alert: () => ({
							header: "Payee has existing transactions",
							message: "You must first delete these transactions, or reassign to another payee before attempting to delete this payee."
						})
					}
				}, modalOptions);
			} else {
				// Show the delete payee modal
				modalOptions = angular.extend({
					templateUrl: PayeeDeleteView,
					controller: "PayeeDeleteController",
					controllerAs: "vm",
					resolve: {
						payee: () => this.payees[index]
					}
				}, modalOptions);
			}

			// Show the modal
			this.$uibModal.open(modalOptions).result.then(() => {
				this.payees.splice(index, 1);
				this.$state.go("root.payees");
			}).finally(() => (this.ogTableNavigableService.enabled = true));
		});
	}

	toggleFavourite(index) {
		this.payeeModel.toggleFavourite(this.payees[index]).then(favourite => (this.payees[index].favourite = favourite));
	}

	// Finds a specific payee and focusses that row in the table
	focusPayee(payeeIdToFocus) {
		const delay = 50;
		let targetIndex;

		// Find the payee by it's id
		angular.forEach(this.payees, (payee, index) => {
			if (isNaN(targetIndex) && payee.id === payeeIdToFocus) {
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

PayeeIndexController.$inject = ["$scope", "$transitions", "$uibModal", "$timeout", "$state", "payeeModel", "ogTableNavigableService", "payees"];