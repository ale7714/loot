import AccountIndexView from "accounts/views/index.html";
import AuthenticationEditView from "authentication/views/edit.html";
import CategoryIndexView from "categories/views/index.html";
import LootLayoutView from "loot/views/layout.html";
import PayeeIndexView from "payees/views/index.html";
import ScheduleIndexView from "schedules/views/index.html";
import SecurityIndexView from "securities/views/index.html";
import TransactionIndexView from "transactions/views/index.html";

export default class LootStatesProvider {
	constructor($stateProvider) {
		const transactionViews = {
			"@root": {
				templateUrl: TransactionIndexView,
				controller: "TransactionIndexController",
				controllerAs: "vm"
			}
		};

		function basicState() {
			return {
				url: "/:id"
			};
		}

		function transactionsState(parentContext) {
			return {
				url: "/transactions",
				data: {
					title: `${parentContext.charAt(0).toUpperCase() + parentContext.substring(1)} Transactions`
				},
				resolve: {
					contextModel: ["authenticated", `${parentContext}Model`, (authenticated, contextModel) => authenticated && contextModel],
					context: ["authenticated", "$stateParams", "contextModel", (authenticated, $stateParams, contextModel) => authenticated && contextModel.find($stateParams.id)],
					transactionBatch: ["authenticated", "transactionModel", "contextModel", "context", (authenticated, transactionModel, contextModel, context) => {
						const unreconciledOnly = contextModel.isUnreconciledOnly ? contextModel.isUnreconciledOnly(context.id) : false;

						return authenticated && transactionModel.all(contextModel.path(context.id), null, "prev", unreconciledOnly);
					}]
				},
				views: transactionViews
			};
		}

		function transactionState() {
			return {
				url: "/:transactionId"
			};
		}

		$stateProvider
			.state("root", {
				abstract: true,
				templateUrl: LootLayoutView,
				controller: "LayoutController",
				controllerAs: "vm",
				data: {
					title: "Welcome"
				},
				resolve: {
					authenticated: ["$uibModal", "authenticationModel",	($uibModal, authenticationModel) => {
						// Check if the user is authenticated
						if (!authenticationModel.isAuthenticated) {
							// Not authenticated, show the login modal
							return $uibModal.open({
								templateUrl: AuthenticationEditView,
								controller: "AuthenticationEditController",
								controllerAs: "vm",
								backdrop: "static",
								size: "sm"
							}).result.then(() => authenticationModel.isAuthenticated).catch(() => false);
						}

						// User is authenticated
						return true;
					}]
				}
			})
			.state("root.accounts", {
				url: "/accounts",
				templateUrl: AccountIndexView,
				controller: "AccountIndexController",
				controllerAs: "vm",
				data: {
					title: "Accounts"
				},
				resolve: {
					accounts: ["authenticated", "accountModel", (authenticated, accountModel) => authenticated && accountModel.allWithBalances()]
				}
			})
			.state("root.accounts.account", basicState())
			.state("root.accounts.account.transactions", transactionsState("account"))
			.state("root.accounts.account.transactions.transaction", transactionState())
			.state("root.schedules", {
				url: "/schedules",
				templateUrl: ScheduleIndexView,
				controller: "ScheduleIndexController",
				controllerAs: "vm",
				data: {
					title: "Schedules"
				},
				resolve: {
					schedules: ["authenticated", "scheduleModel", (authenticated, scheduleModel) => authenticated && scheduleModel.all()]
				}
			})
			.state("root.schedules.schedule", basicState())
			.state("root.payees", {
				url: "/payees",
				templateUrl: PayeeIndexView,
				controller: "PayeeIndexController",
				controllerAs: "vm",
				data: {
					title: "Payees"
				},
				resolve: {
					payees: ["authenticated", "payeeModel", (authenticated, payeeModel) => authenticated && payeeModel.allList()]
				}
			})
			.state("root.payees.payee", basicState())
			.state("root.payees.payee.transactions", transactionsState("payee"))
			.state("root.payees.payee.transactions.transaction", transactionState())
			.state("root.categories", {
				url: "/categories",
				templateUrl: CategoryIndexView,
				controller: "CategoryIndexController",
				controllerAs: "vm",
				data: {
					title: "Categories"
				},
				resolve: {
					categories: ["authenticated", "categoryModel", (authenticated, categoryModel) => authenticated && categoryModel.allWithChildren()]
				}
			})
			.state("root.categories.category", basicState())
			.state("root.categories.category.transactions", transactionsState("category"))
			.state("root.categories.category.transactions.transaction", transactionState())
			.state("root.securities", {
				url: "/securities",
				templateUrl: SecurityIndexView,
				controller: "SecurityIndexController",
				controllerAs: "vm",
				data: {
					title: "Securities"
				},
				resolve: {
					securities: ["authenticated", "securityModel", (authenticated, securityModel) => authenticated && securityModel.allWithBalances()]
				}
			})
			.state("root.securities.security", basicState())
			.state("root.securities.security.transactions", transactionsState("security"))
			.state("root.securities.security.transactions.transaction", transactionState())
			.state("root.transactions", {
				url: "/transactions?query",
				data: {
					title: "Search Transactions"
				},
				resolve: {
					previousState: ["$state", $state => {
						if (!$state.includes("root.transactions")) {
							return {
								name: $state.current.name,
								params: Object.assign({}, $state.params)
							};
						}

						return null;
					}],
					contextModel: () => null,
					context: ["$stateParams", $stateParams => $stateParams.query],
					transactionBatch: ["authenticated", "transactionModel", "context", (authenticated, transactionModel, context) => authenticated && transactionModel.query(context, null, "prev")]
				},
				views: transactionViews,
				onEnter: ["$stateParams", "queryService", "previousState", ($stateParams, queryService, previousState) => {
					queryService.previousState = previousState || queryService.previousState;
					queryService.query = $stateParams.query;
				}],
				onExit: ["queryService", queryService => {
					// Can't use concise function body because implicit return of 'false' causes route transition to cancel in ui-router@1.x
					queryService.query = null;
				}]
			})
			.state("root.transactions.transaction", transactionState());

		this.$get = () => this;
	}
}

LootStatesProvider.$inject = ["$stateProvider"];