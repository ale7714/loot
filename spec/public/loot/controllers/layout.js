import angular from "angular";

describe("LayoutController", () => {
	let	layoutController,
			controllerTest,
			$window,
			$transitions,
			$state,
			$uibModal,
			authenticationModel,
			ogTableNavigableService,
			authenticated,
			mockJQueryInstance,
			realJQueryInstance;

	class MockJQueryInstance {
		constructor() {
			this.events = {};
		}

		on(event, handler) {
			this.events[event] = handler;
		}
	}

	// Load the modules
	beforeEach(angular.mock.module("lootMocks", "lootApp", mockDependenciesProvider => mockDependenciesProvider.load(["$state", "$uibModal", "ogNavigatorServiceWorkerService", "authenticationModel", "accountModel", "payeeModel", "categoryModel", "securityModel", "authenticated"])));

	// Configure & compile the object under test
	beforeEach(inject((_controllerTest_, _$window_, _$transitions_, _$state_, _$uibModal_, _authenticationModel_, _ogTableNavigableService_, _authenticated_) => {
		controllerTest = _controllerTest_;
		$window = _$window_;
		$transitions = _$transitions_;
		$state = _$state_;
		$uibModal = _$uibModal_;
		authenticationModel = _authenticationModel_;
		ogTableNavigableService = _ogTableNavigableService_;
		authenticated = _authenticated_;

		mockJQueryInstance = new MockJQueryInstance();
		realJQueryInstance = $window.$;
		$window.$ = sinon.stub();
		$window.$.withArgs("#transactionSearch").returns(mockJQueryInstance);

		layoutController = controllerTest("LayoutController");
	}));

	afterEach(() => ($window.$ = realJQueryInstance));

	it("should make the authentication status available to the view", () => layoutController.authenticated.should.equal(authenticated));

	it("should make the scrollTo function available to the view", () => layoutController.scrollTo.should.be.a.function);

	it("should hide the state loading spinner by default", () => layoutController.loadingState.should.be.false);

	describe("login", () => {
		beforeEach(() => layoutController.login());

		it("should show the login modal", () => {
			$uibModal.open.should.have.been.calledWith(sinon.match({
				controller: "AuthenticationEditController"
			}));
		});

		it("should reload the current state when the login modal is closed", () => {
			$uibModal.close();
			$state.reload.should.have.been.called;
		});

		it("should not reload the current state when the login modal is dismissed", () => {
			$uibModal.dismiss();
			$state.reload.should.not.have.been.called;
		});
	});

	describe("logout", () => {
		beforeEach(() => layoutController.logout());

		it("should logout the user", () => authenticationModel.logout.should.have.been.called);

		it("should reload the current state", () => $state.reload.should.have.been.called);
	});

	describe("search", () => {
		it("should do nothing if the search query is empty", () => {
			layoutController.queryService.query = "";
			layoutController.search();
			$state.go.should.not.have.been.called;
		});

		it("should transition to the transaction search state passing the query", () => {
			layoutController.queryService.query = "search query";
			layoutController.search();
			$state.go.should.have.been.calledWith("root.transactions", {query: "search query"});
		});
	});

	describe("toggleTableNavigationEnabled", () => {
		it("should toggle the table navigable enabled flag", () => {
			ogTableNavigableService.enabled = true;
			layoutController.toggleTableNavigationEnabled(false);
			ogTableNavigableService.enabled.should.be.false;
		});
	});

	describe("recentlyAccessedAccounts", () => {
		it("should return the list of recent accounts", () => layoutController.recentlyAccessedAccounts.should.equal("recent accounts list"));
	});

	describe("recentlyAccessedPayees", () => {
		it("should return the list of recent payees", () => layoutController.recentlyAccessedPayees.should.equal("recent payees list"));
	});

	describe("recentlyAccessedCategories", () => {
		it("should return the list of recent categories", () => layoutController.recentlyAccessedCategories.should.equal("recent categories list"));
	});

	describe("recentlyAccessedSecurities", () => {
		it("should return the list of recent securities", () => layoutController.recentlyAccessedSecurities.should.equal("recent securities list"));
	});

	describe("loadingState", () => {
		it("should set a flag to indicate whether a state is loading", () => {
			layoutController.isLoadingState = false;
			layoutController.loadingState = true;
			layoutController.isLoadingState.should.be.true;
			layoutController.loadingState.should.be.true;
		});
	});

	describe("checkIfSearchCleared", () => {
		it("should do nothing if the search query is not empty", () => {
			layoutController.queryService.query = "search query";
			layoutController.queryService.previouState = "previous state";
			layoutController.checkIfSearchCleared();
			$state.go.should.not.have.been.called;
		});

		it("should do nothing if a previous state is not set", () => {
			layoutController.queryService.query = "";
			layoutController.queryService.previouState = null;
			layoutController.checkIfSearchCleared();
			$state.go.should.not.have.been.called;
		});

		describe("(search field cleared)", () => {
			let previousStateName,
					previousStateParams;

			beforeEach(() => {
				previousStateName = "previous state";
				previousStateParams = "previous params";
				layoutController.queryService.query = "";
				layoutController.queryService.previousState = {name: previousStateName, params: previousStateParams};
				layoutController.checkIfSearchCleared();
			});

			it("should transition to the previous state when the search field is cleared", () => $state.go.should.have.been.calledWith(previousStateName, previousStateParams));

			it("should clear the stored previous state", () => (!layoutController.queryService.previousState).should.be.true);
		});
	});

	describe("state transitions", () => {
		let mockTransition,
				deregisterTransitionStartHook;

		beforeEach(() => {
			mockTransition = {
				promise: {
					finally: sinon.stub()
				}
			};
			deregisterTransitionStartHook = sinon.stub();
			sinon.stub($transitions, "onStart").yields(mockTransition).returns(deregisterTransitionStartHook);
			layoutController = controllerTest("LayoutController");
		});

		it("should register a start transition hook", () => $transitions.onStart.should.have.been.calledWith({}, sinon.match.func));

		it("should deregister the start transition hook when the scope is destroyed", () => {
			layoutController.$scope.$emit("$destroy");
			deregisterTransitionStartHook.should.have.been.called;
		});

		describe("on transition start", () => {
			it("should set the loading state", () => layoutController.loadingState.should.be.true);

			it("should register a callback for when the transition ends", () => mockTransition.promise.finally.should.have.been.calledWith(sinon.match.func));
		});

		describe("on transition end", () => {
			beforeEach(() => {
				mockTransition.promise.finally.yields();
				layoutController = controllerTest("LayoutController");
			});

			it("should clear the loading state", () => layoutController.loadingState.should.be.false);
		});
	});

	describe("on search", () => {
		beforeEach(() => sinon.stub(layoutController, "checkIfSearchCleared"));

		it("should check if the search field was cleared", () => {
			mockJQueryInstance.events.search();
			layoutController.checkIfSearchCleared.should.have.been.called;
		});
	});
});
