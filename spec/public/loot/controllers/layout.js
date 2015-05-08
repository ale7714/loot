(function() {
	"use strict";

	/*jshint expr: true */

	describe("LayoutController", function() {
		// The object under test
		var layoutController;

		// Dependencies
		var $state,
				$modal,
				authenticationModel,
				accountModel,
				payeeModel,
				categoryModel,
				securityModel,
				ogTableNavigableService,
				authenticated,
				mockJQueryInstance,
				realJQueryInstance;

		// Load the modules
		beforeEach(module("lootMocks", "lootApp", function(mockDependenciesProvider) {
			mockDependenciesProvider.load(["$state", "$modal", "authenticationModel", "accountModel", "payeeModel", "categoryModel", "securityModel", "authenticated"]);
		}));

		// Configure & compile the object under test
		beforeEach(inject(function(controllerTest, _$state_, _$modal_, _authenticationModel_, _accountModel_, _payeeModel_, _categoryModel_, _securityModel_, _ogTableNavigableService_, _authenticated_) {
			$state = _$state_;
			$modal = _$modal_;
			authenticationModel = _authenticationModel_;
			accountModel = _accountModel_;
			payeeModel = _payeeModel_;
			categoryModel = _categoryModel_;
			securityModel = _securityModel_;
			ogTableNavigableService = _ogTableNavigableService_;
			authenticated = _authenticated_;

			mockJQueryInstance = {
				events: {},
				on: function(event, handler) {
					this.events[event] = handler;
				}
			};

			realJQueryInstance = window.$;
			window.$ = sinon.stub();
			window.$.withArgs("#transactionSearch").returns(mockJQueryInstance);

			layoutController = controllerTest("LayoutController");
		}));

		afterEach(function() {
			window.$ = realJQueryInstance;
		});

		it("should make the authentication status available to the view", function() {
			layoutController.authenticated.should.equal(authenticated);
		});

		it("should make the scrollTo function available to the view", function() {
			layoutController.scrollTo.should.be.a.function;
		});

		it("should hide the state loading spinner by default", function() {
			layoutController.loadingState.should.be.false;
		});

		describe("login", function() {
			beforeEach(function() {
				layoutController.login();
			});

			it("should show the login modal", function() {
				$modal.open.should.have.been.calledWith(sinon.match({
					controller: "AuthenticationEditController"
				}));
			});

			it("should reload the current state when the login modal is closed", function() {
				$modal.close();
				$state.reload.should.have.been.called;
			});

			it("should not reload the current state when the login modal is dismissed", function() {
				$modal.dismiss();
				$state.reload.should.not.have.been.called;
			});
		});

		describe("logout", function() {
			beforeEach(function() {
				layoutController.logout();
			});

			it("should logout the user", function() {
				authenticationModel.logout.should.have.been.called;
			});

			it("should reload the current state", function() {
				$state.reload.should.have.been.called;
			});
		});

		describe("search", function() {
			it("should do nothing if the search query is empty", function() {
				layoutController.queryService.query = "";
				layoutController.search();
				$state.go.should.not.have.been.called;
			});

			it("should transition to the transaction search state passing the query", function() {
				layoutController.queryService.query = "search query";
				layoutController.search();
				$state.go.should.have.been.calledWith("root.transactions", {query: "search query"});
			});
		});

		describe("toggleTableNavigationEnabled", function() {
			it("should toggle the table navigable enabled flag", function() {
				ogTableNavigableService.enabled = true;
				layoutController.toggleTableNavigationEnabled(false);
				ogTableNavigableService.enabled.should.be.false;
			});
		});

		describe("recentlyAccessedAccounts", function() {
			it("should return the list of recent accounts", function() {
				layoutController.recentlyAccessedAccounts().should.equal("recent accounts list");
			});
		});

		describe("recentlyAccessedPayees", function() {
			it("should return the list of recent payees", function() {
				layoutController.recentlyAccessedPayees().should.equal("recent payees list");
			});
		});

		describe("recentlyAccessedCategories", function() {
			it("should return the list of recent categories", function() {
				layoutController.recentlyAccessedCategories().should.equal("recent categories list");
			});
		});

		describe("recentlyAccessedSecurities", function() {
			it("should return the list of recent securities", function() {
				layoutController.recentlyAccessedSecurities().should.equal("recent securities list");
			});
		});

		describe("toggleLoadingState", function() {
			it("should set a flag to indicate whether a state is loading", function() {
				layoutController.loadingState = false;
				layoutController.toggleLoadingState(true);
				layoutController.loadingState.should.be.true;
			});
		});

		describe("checkIfSearchCleared", function() {
			it("should do nothing if the search query is not empty", function() {
				layoutController.queryService.query = "search query";
				layoutController.queryService.previouState = "previous state";
				layoutController.checkIfSearchCleared();
				$state.go.should.not.have.been.called;
			});

			it("should do nothing if a previous state is not set", function() {
				layoutController.queryService.query = "";
				layoutController.queryService.previouState = undefined;
				layoutController.checkIfSearchCleared();
				$state.go.should.not.have.been.called;
			});

			describe("(search field cleared)", function() {
				var previousStateName,
						previousStateParams;

				beforeEach(function() {
					previousStateName = "previous state";
					previousStateParams = "previous params";
					layoutController.queryService.query = "";
					layoutController.queryService.previousState = {name: previousStateName, params: previousStateParams};
					layoutController.checkIfSearchCleared();
				});

				it("should transition to the previous state when the search field is cleared", function() {
					$state.go.should.have.been.calledWith(previousStateName, previousStateParams);
				});

				it("should clear the stored previous state", function() {
					(layoutController.queryService.previousState === undefined).should.be.true;
				});
			});
		});

		describe("state change handlers", function() {
			beforeEach(function() {
				sinon.stub(layoutController, "toggleLoadingState");
			});
			
			var scenarios = [
				{event: "$stateChangeStart", loading: true},
				{event: "$stateChangeSuccess", loading: false},
				{event: "$stateChangeError", loading: false},
			];

			scenarios.forEach(function(scenario) {
				it("should attach a " + scenario.event + " handler", function() {
					layoutController.$scope.$emit(scenario.event);
					layoutController.toggleLoadingState.should.have.been.calledWith(scenario.loading);
				});
			});
		});

		describe("on search", function() {
			beforeEach(function() {
				sinon.stub(layoutController, "checkIfSearchCleared");
			});

			it("should check if the search field was cleared", function() {
				mockJQueryInstance.events.search();
				layoutController.checkIfSearchCleared.should.have.been.called;
			});
		});
	});
})();
