{
	/**
	 * Implementation
	 */
	class ScheduleIndexController {
		constructor($scope, $uibModal, $timeout, $state, scheduleModel, transactionModel, ogTableNavigableService, schedules) {
			const self = this;

			this.$uibModal = $uibModal;
			this.$timeout = $timeout;
			this.$state = $state;
			this.scheduleModel = scheduleModel;
			this.transactionModel = transactionModel;
			this.ogTableNavigableService = ogTableNavigableService;
			this.schedules = schedules;
			this.tableActions = {
				selectAction(index) {
					self.editSchedule(index);
				},
				editAction(index) {
					self.editSchedule(index);
				},
				insertAction() {
					// Same as select action, but don't pass any arguments
					self.editSchedule();
				},
				deleteAction(index) {
					self.deleteSchedule(index);
				},
				focusAction(index) {
					$state.go(`${$state.includes("**.schedule") ? "^" : ""}.schedule`, {id: self.schedules[index].id});
				}
			};

			// Today's date (for checking if a schedule is overdue
			this.today = moment().startOf("day").toDate();

			// Handler is wrapped in a function to aid with unit testing
			$scope.$on("$stateChangeSuccess", (event, toState, toParams, fromState, fromParams) => this.stateChangeSuccessHandler(event, toState, toParams, fromState, fromParams));
		}

		editSchedule(index) {
			// Helper function to sort by next due date, then by transaction id
			function byNextDueDateAndId(a, b) {
				let x, y;

				if (moment(a.next_due_date).isSame(b.next_due_date)) {
					x = a.id;
					y = b.id;
				} else {
					x = a.next_due_date;
					y = b.next_due_date;
				}

				return x < y ? -1 : x > y ? 1 : 0;
			}

			// Disable navigation on the table
			this.ogTableNavigableService.enabled = false;

			// Show the modal
			this.$uibModal.open({
				templateUrl: "schedules/views/edit.html",
				controller: "ScheduleEditController",
				controllerAs: "vm",
				backdrop: "static",
				size: "lg",
				resolve: {
					schedule: () => {
						// If we didn't get an index, we're adding a new schedule so just return null
						if (isNaN(index)) {
							return null;
						}

						// If the selected schedule is a Split/Loan Repayment/Payslip; fetch the subtransactions first
						switch (this.schedules[index].transaction_type) {
							case "Split":
							case "LoanRepayment":
							case "Payslip":
								this.schedules[index].subtransactions = [];

								return this.transactionModel.findSubtransactions(this.schedules[index].id).then(subtransactions => {
									this.schedules[index].subtransactions = subtransactions;

									return this.schedules[index];
								});
							default:
								return this.schedules[index];
						}
					}
				}
			}).result.then(schedule => {
				if (isNaN(index)) {
					// Add new schedule to the end of the array
					this.schedules.push(schedule.data);
				} else {
					// Update the existing schedule in the array
					this.schedules[index] = schedule.data;
				}

				// Resort the array
				this.schedules.sort(byNextDueDateAndId);

				// If we entered or skipped a transaction, refocus the schedule now at the original index,
				// otherwise refocus the schedule that was edited
				this.focusSchedule(schedule.skipped ? this.schedules[index].id : schedule.data.id);
			}).finally(() => (this.ogTableNavigableService.enabled = true));
		}

		deleteSchedule(index) {
			// Disable navigation on the table
			this.ogTableNavigableService.enabled = false;

			// Show the modal
			this.$uibModal.open({
				templateUrl: "schedules/views/delete.html",
				controller: "ScheduleDeleteController",
				controllerAs: "vm",
				backdrop: "static",
				resolve: {
					schedule: () => this.schedules[index]
				}
			}).result.then(() => {
				this.schedules.splice(index, 1);
				this.$state.go("root.schedules");
			}).finally(() => (this.ogTableNavigableService.enabled = true));
		}

		// Finds a specific schedule and focusses that row in the table
		focusSchedule(scheduleIdToFocus) {
			const delay = 50;
			let targetIndex;

			// Find the schedule by it's id
			angular.forEach(this.schedules, (schedule, index) => {
				if (isNaN(targetIndex) && schedule.id === scheduleIdToFocus) {
					targetIndex = index;
				}
			});

			// If found, focus the row
			if (!isNaN(targetIndex)) {
				this.$timeout(() => this.tableActions.focusRow(targetIndex), delay);
			}

			return targetIndex;
		}

		// Shows/hides subtransactions
		toggleSubtransactions($event, schedule) {
			// Toggle the show flag
			schedule.showSubtransactions = !schedule.showSubtransactions;

			// If we're showing
			if (schedule.showSubtransactions) {
				// Show the loading indicator
				schedule.loadingSubtransactions = true;

				// Clear the array?
				schedule.subtransactions = [];

				// Resolve the subtransactions
				this.transactionModel.findSubtransactions(schedule.id).then(subtransactions => {
					schedule.subtransactions = subtransactions;

					// Hide the loading indicator
					schedule.loadingSubtransactions = false;
				});
			}

			$event.cancelBubble = true;
		}

		// Listen for state change events, and when the schedule id changes, ensure the row is focussed
		stateChangeSuccessHandler(event, toState, toParams, fromState, fromParams) {
			if (toParams.id && (toState.name !== fromState.name || toParams.id !== fromParams.id)) {
				this.focusSchedule(Number(toParams.id));
			}
		}
	}

	/**
	 * Registration
	 */
	angular
		.module("lootSchedules")
		.controller("ScheduleIndexController", ScheduleIndexController);

	/**
	 * Dependencies
	 */
	ScheduleIndexController.$inject = ["$scope", "$uibModal", "$timeout", "$state", "scheduleModel", "transactionModel", "ogTableNavigableService", "schedules"];
}
