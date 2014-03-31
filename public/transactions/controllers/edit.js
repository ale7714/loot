(function() {
	"use strict";

	// Reopen the module
	var mod = angular.module('transactions');

	// Declare the Transaction Edit controller
	mod.controller('transactionEditController', ['$scope', '$modalInstance', 'filterFilter', 'limitToFilter', 'payeeModel', 'securityModel', 'categoryModel', 'accountModel', 'transactionModel', 'account', 'transaction',
		function($scope, $modalInstance, filterFilter, limitToFilter, payeeModel, securityModel, categoryModel, accountModel, transactionModel, account, transaction) {
			var now = new Date(),
					timeZoneOffsetMS = now.getTimezoneOffset() * 60 * 1000;

			// Make the passed transaction available on the scope
			$scope.transaction = angular.extend({
				transaction_type: 'Basic',
				transaction_date: new Date(now - timeZoneOffsetMS).toISOString().substring(0,10),
				subtransactions: [{},{},{},{}]
			}, transaction);

			$scope.account = account;
			$scope.mode = (transaction ? "Edit" : "Add");

			// Give the transaction date field initial focus
			$("#transactionDate").focus();

			// List of payees for the typeahead
			$scope.payees = function(filter, limit) {
				return payeeModel.all().then(function(payees) {
					return limitToFilter(filterFilter(payees, filter), limit);
				});
			};

			// List of securities for the typeahead
			$scope.securities = function(filter, limit) {
				return securityModel.all().then(function(securities) {
					return limitToFilter(filterFilter(securities, filter), limit);
				});
			};

			// List of categories for the typeahead
			$scope.categories = function(filter, limit, parent, includeSplits) {
				// If the parent was specified, pass the parent's id (or -1 if no id)
				var parentId = parent ? parent.id || -1 : null;

				return categoryModel.all(parentId).then(function(categories) {
					// For the category dropdown, include psuedo-categories that change the transaction type
					if (!parent) {
						if (includeSplits) {
							categories = [
								{ id: "SplitTo", name: "Split To" },
								{ id: "SplitFrom", name: "Split From" },
								{ id: "Payslip", name: "Payslip" },
								{ id: "LoanRepayment", name: "Loan Repayment" }
							].concat(categories);
						}

						categories = [
							{ id: "TransferTo", name: "Transfer To" },
							{ id: "TransferFrom", name: "Transfer From" }
						].concat(categories);
					}

					return limitToFilter(filterFilter(categories, filter), limit);
				});
			};

			// List of investment categories for the typeahead
			$scope.investmentCategories = function(filter, limit) {
				var categories = [
					{ id: "Buy", name: "Buy" },
					{ id: "Sell", name: "Sell" },
					{ id: "DividendTo", name: "Dividend To" },
					{ id: "AddShares", name: "Add Shares" },
					{ id: "RemoveShares", name: "Remove Shares" },
					{ id: "TransferTo", name: "Transfer To" },
					{ id: "TransferFrom", name: "Transfer From" }
				];

				return limitToFilter(filterFilter(categories, filter), limit);
			};

			// Returns true if the passed value is typeof string (and is not empty)
			$scope.isString = function(object) {
				return (typeof object === 'string') && object.length > 0;
			};

			// Handler for category changes
			// (index) is the subtransaction index, or null for the main transaction
			$scope.categorySelected = function(index) {
				var	transaction = isNaN(index) ? $scope.transaction : $scope.transaction.subtransactions[index],
						type,
						direction,
						parentId;

				// Check the category selection
				if (typeof transaction.category == 'object') {
					if (isNaN(index)) {
						switch (transaction.category.id) {
							case "TransferTo":
								type = "Transfer";
								direction = "outflow";
								break;

							case "TransferFrom":
								type = "Transfer";
								direction = "inflow";
								break;

							case "SplitTo":
								type = "Split";
								direction = "outflow";
								break;

							case "SplitFrom":
								type = "Split";
								direction = "inflow";
								break;

							case "Payslip":
								type = "Payslip";
								direction = "inflow";
								break;

							case "LoanRepayment":
								type = "LoanRepayment";
								direction = "outflow";
								break;

							default:
								type = "Basic";
								direction = transaction.category.direction;
								break;
						}
					} else {
						switch (transaction.category.id) {
							case "TransferTo":
								type = "Transfer";
								direction = "outflow";
								break;

							case "TransferFrom":
								type = "Transfer";
								direction = "inflow";
								break;

							default:
								type = "Basic";
								direction = transaction.category.direction;
								break;
						}
					}

					parentId = transaction.category.id;
				}

				// Update the transaction type & direction
				transaction.transaction_type = type || 'Basic';
				transaction.direction = direction || 'outflow';

				// Make sure the subcategory is still valid
				if (transaction.subcategory && transaction.subcategory.parent_id !== parentId) {
					transaction.subcategory = null;
				}
			};

			// Handler for investment category changes
			$scope.investmentCategorySelected = function() {
				var	type,
						direction;

				// Check the category selection
				switch ($scope.transaction.category.id) {
					case "TransferTo":
						type = "SecurityTransfer";
						direction = "outflow";
						break;

					case "TransferFrom":
						type = "SecurityTransfer";
						direction = "inflow";
						break;

					case "RemoveShares":
						type = "SecurityHolding";
						direction = "outflow";
						break;

					case "AddShares":
						type = "SecurityHolding";
						direction = "inflow";
						break;

					case "Sell":
						type = "SecurityInvestment";
						direction = "outflow";
						break;

					case "Buy":
						type = "SecurityInvestment";
						direction = "inflow";
						break;

					case "DividendTo":
						type = "Dividend";
						direction = "outflow";
						break;
				}

				// Update the transaction type & direction
				$scope.transaction.transaction_type = type;
				$scope.transaction.direction = direction;
			};

			// Watch the subtransactions array and recalculate the total allocated
			$scope.$watch('transaction.subtransactions', function() {
				$scope.totalAllocated = $scope.transaction.subtransactions.reduce(function(total, subtransaction) {
					return total + (Number(subtransaction.amount * (subtransaction.direction == $scope.transaction.direction ? 1 : -1)) || 0);
				}, 0);
			}, true);

			// List of accounts for the typeahead
			$scope.accounts = function(filter, limit) {
				return accountModel.all().then(function(accounts) {
					return limitToFilter(filterFilter(accounts, filter), limit);
				});
			};

			// Add a new subtransaction
			$scope.addSubtransaction = function() {
				$scope.transaction.subtransactions.push({});
			};

			// Deletes a subtransaction
			$scope.deleteSubtransaction = function(index) {
				$scope.transaction.subtransactions.splice(index, 1);
			};

			// Save and close the modal
			$scope.save = function() {
				// For SecurityInvestment transactions, recalculate the amount before saving
				if ('SecurityInvestment' === $scope.transaction.transaction_type) {
					$scope.transaction.amount = $scope.transaction.quantity * $scope.transaction.price - $scope.transaction.commission;
				}

				$scope.errorMessage = null;
				transactionModel.save($scope.account.id, $scope.transaction).then(function(transaction) {
					$modalInstance.close(transaction.data);
				}, function(error) {
					$scope.errorMessage = error.data;
				});
			};

			// Dismiss the modal without saving
			$scope.cancel = function() {
				$modalInstance.dismiss();
			};
		}
	]);
})();
