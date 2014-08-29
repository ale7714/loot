(function() {
	"use strict";

	/*jshint expr: true */

	describe("transactionEditController", function() {
		// The object under test
		var transactionEditController;

		// Dependencies
		var controllerTest,
				$modalInstance,
				payeeModel,
				securityModel,
				categoryModel,
				accountModel,
				transactionModel,
				transaction,
				mockJQueryInstance,
				realJQueryInstance;

		// Load the modules
		beforeEach(module("lootMocks", "transactions", function(mockDependenciesProvider) {
			mockDependenciesProvider.load(["$modalInstance", "$q", "payeeModel", "securityModel", "categoryModel", "accountModel", "transactionModel", "transaction"]);
		}));

		// Configure & compile the object under test
		beforeEach(inject(function(_controllerTest_, _$modalInstance_, _payeeModel_, _securityModel_, _categoryModel_, _accountModel_, _transactionModel_, _transaction_) {
			controllerTest = _controllerTest_;
			$modalInstance = _$modalInstance_;
			payeeModel = _payeeModel_;
			securityModel = _securityModel_;
			categoryModel = _categoryModel_;
			accountModel = _accountModel_;
			transactionModel = _transactionModel_;
			transaction = _transaction_;
			mockJQueryInstance = {
				focus: sinon.stub()
			};

			realJQueryInstance = window.$;
			window.$ = sinon.stub();
			window.$.withArgs("#transactionDate").returns(mockJQueryInstance);

			transactionEditController = controllerTest("transactionEditController");
		}));

		afterEach(function() {
			window.$ = realJQueryInstance;
		});

		describe("when a transaction is provided", function() {
			it("should make the passed transaction available on the $scope", function() {
				transactionEditController.transaction.should.deep.equal(transaction);
			});
			
			it("should set the mode to Edit", function() {
				transactionEditController.mode.should.equal("Edit");
			});
		});

		describe.skip("when a transaction is not provided", function() {
			beforeEach(function() {
				transaction = undefined;
				transactionEditController = controllerTest("transactionEditController");
			});

			it("should set an empty transaction object on the $scope", function() {
				transactionEditController.transaction.should.be.an.Object;
				transactionEditController.transaction.should.be.empty;
			});

			it("should set the mode to Add", function() {
				transactionEditController.mode.should.equal("Add");
			});
		});

		it("should focus the transaction date field", function() {
			mockJQueryInstance.focus.should.have.been.called;
		});

		it("should prefetch the payees list to populate the cache", function() {
			payeeModel.all.should.have.been.called;
		});

		describe("payees", function() {
			var payees;

			beforeEach(function() {
				payees = transactionEditController.payees("a", 3);
			});

			it("should fetch the list of payees", function() {
				payeeModel.all.should.have.been.called;
			});

			it("should return a filtered & limited list of payees", function() {
				payees.should.eventually.deep.equal([
					{id: 1, name: "aa"},
					{id: 4, name: "ba"},
					{id: 5, name: "ab"}
				]);
			});
		});

		describe("securities", function() {
			var securities;

			beforeEach(function() {
				securities = transactionEditController.securities("a", 3);
			});

			it("should fetch the list of securities", function() {
				securityModel.all.should.have.been.called;
			});

			it("should return a filtered & limited list of securities", function() {
				securities.should.eventually.deep.equal([
					{id: 1, name: "aa", current_value: 1.006, current_holding: 1},
					{id: 4, name: "ba", current_value: 4, current_holding: 1},
					{id: 5, name: "ab", current_value: 5, current_holding: 1}
				]);
			});
		});

		describe("categories", function() {
			var categories;

			it("should return an empty array if the parent category is new", function() {
				categories = transactionEditController.categories("a", 3, {});
				categories.should.be.an.Array;
				categories.should.be.empty;
			});

			describe("(parent categories)", function() {
				it("should fetch the list of parent categories", function() {
					categories = transactionEditController.categories("a", 3, undefined, false);
					categoryModel.all.should.have.been.calledWith(null);
				});

				it("should include transfer categories", function() {
					categories = transactionEditController.categories("a", 5, undefined, false);
					categories.should.eventually.deep.equal([
						{ id: "TransferTo", name: "Transfer To" },
						{ id: "TransferFrom", name: "Transfer From" },
						{id: 1, name: "aa", direction: "inflow", num_children: 2, children: [
							{id: 10, name: "aa_1", direction: "inflow", num_children: 0, parent_id: 1, parent: {name: "aa"}},
							{id: 11, name: "aa_2", direction: "inflow", num_children: 0, parent_id: 1, parent: {name: "aa"}}
						]},
						{id: 4, name: "ba", direction: "outflow", num_children: 0, children: []},
						{id: 5, name: "ab", direction: "inflow", num_children: 0, children: []}
					]);
				});

				it("should include split categories if requested", function() {
					categories = transactionEditController.categories("a", 7, undefined, true);
					categories.should.eventually.deep.equal([
						{ id: "TransferTo", name: "Transfer To" },
						{ id: "TransferFrom", name: "Transfer From" },
						{ id: "Payslip", name: "Payslip" },
						{ id: "LoanRepayment", name: "Loan Repayment" },
						{id: 1, name: "aa", direction: "inflow", num_children: 2, children: [
							{id: 10, name: "aa_1", direction: "inflow", num_children: 0, parent_id: 1, parent: {name: "aa"}},
							{id: 11, name: "aa_2", direction: "inflow", num_children: 0, parent_id: 1, parent: {name: "aa"}}
						]},
						{id: 4, name: "ba", direction: "outflow", num_children: 0, children: []},
						{id: 5, name: "ab", direction: "inflow", num_children: 0, children: []}
					]);
				});
			});

			describe("(subcategories)", function() {
				it("should fetch the subcategories for the specified parent category", function() {
					categories = transactionEditController.categories("a", 3, {id: 1});
					categoryModel.all.should.have.been.calledWith(1);
				});
				it("should eventually return a filtered & limited list of payees", function() {
					categories = transactionEditController.categories("a", 3, {id: 1});
					categories.should.eventually.deep.equal([
						{id: 1, name: "aa", direction: "inflow", num_children: 2, children: [
							{id: 10, name: "aa_1", direction: "inflow", num_children: 0, parent_id: 1, parent: {name: "aa"}},
							{id: 11, name: "aa_2", direction: "inflow", num_children: 0, parent_id: 1, parent: {name: "aa"}}
						]},
						{id: 4, name: "ba", direction: "outflow", num_children: 0, children: []},
						{id: 5, name: "ab", direction: "inflow", num_children: 0, children: []}
					]);
				});
			});
		});

		describe("investmentCategories", function() {
			it("should return a filtered & limited list of investment categories", function() {
				transactionEditController.investmentCategories("a", 3).should.deep.equal([
					{ id: "AddShares", name: "Add Shares" },
					{ id: "RemoveShares", name: "Remove Shares" },
					{ id: "TransferTo", name: "Transfer To" }
				]);
			});
		});

		describe("isString", function() {
			it("should return false if the object is not a string", function() {
				transactionEditController.isString({}).should.be.false;
			});

			it("should return false if the object is an empty string", function() {
				transactionEditController.isString("").should.be.false;
			});

			it("should return true if the object is a string and is not empty", function() {
				transactionEditController.isString("test").should.be.true;
			});
		});
		
		describe("payeeSeleted", function() {
			var payee,
					primary_account;

			beforeEach(function() {
				transactionEditController.transaction.id = undefined;
				payee = {id: 1};
				primary_account = {account_type: "account type"};
				transactionEditController.transaction.payee = payee;
				transactionEditController.transaction.primary_account = primary_account;
				sinon.stub(transactionEditController, "getSubtransactions");
				sinon.stub(transactionEditController, "useLastTransaction");
			});

			it("should do nothing when editing an existing transaction", function() {
				transactionEditController.transaction.id = 1;
				transactionEditController.transaction.payee = {};
				transactionEditController.payeeSelected();
				payeeModel.findLastTransaction.should.not.have.been.called;
			});

			it("should do nothing when the selected payee is not an existing payee", function() {
				transactionEditController.transaction.payee = "payee";
				transactionEditController.payeeSelected();
				payeeModel.findLastTransaction.should.not.have.been.called;
			});

			it("should fetch the last transaction for the selected payee", function() {
				transactionEditController.payeeSelected();
				payeeModel.findLastTransaction.should.have.been.calledWith(payee.id, primary_account.account_type);
			});

			it("should fetch the subtransactions for the last transaction", function() {
				transactionEditController.payeeSelected();
				transactionEditController.getSubtransactions.should.have.been.called;
			});

			it("should default the transaction details from the last transaction", function() {
				transactionEditController.payeeSelected();
				transactionEditController.useLastTransaction.should.have.been.called;
			});
		});

		describe("securitySelected", function() {
			var security,
					primary_account;

			beforeEach(function() {
				transactionEditController.transaction.id = undefined;
				security = {id: 1};
				primary_account = {account_type: "account type"};
				transactionEditController.transaction.security = security;
				transactionEditController.transaction.primary_account = primary_account;
				sinon.stub(transactionEditController, "getSubtransactions");
				sinon.stub(transactionEditController, "useLastTransaction");
			});

			it("should do nothing when editing an existing transaction", function() {
				transactionEditController.transaction.id = 1;
				transactionEditController.transaction.security = {};
				transactionEditController.securitySelected();
				securityModel.findLastTransaction.should.not.have.been.called;
			});

			it("should do nothing when the selected security is not an existing security", function() {
				transactionEditController.transaction.security = "security";
				transactionEditController.securitySelected();
				securityModel.findLastTransaction.should.not.have.been.called;
			});

			it("should fetch the last transaction for the selected security", function() {
				transactionEditController.securitySelected();
				securityModel.findLastTransaction.should.have.been.calledWith(security.id, primary_account.account_type);
			});

			it("should fetch the subtransactions for the last transaction", function() {
				transactionEditController.securitySelected();
				transactionEditController.getSubtransactions.should.have.been.called;
			});

			it("should default the transaction details from the last transaction", function() {
				transactionEditController.securitySelected();
				transactionEditController.useLastTransaction.should.have.been.called;
			});
		});

		describe("getSubtransactions", function() {
			var transaction;

			beforeEach(function() {
				transaction = {id: 1};
			});

			it("should return the transaction if it is not a split, loan repayment or payslip", function() {
				transactionEditController.getSubtransactions(transaction).should.deep.equal(transaction);
			});

			var scenarios = ["Split", "LoanRepayment", "Payslip"];

			scenarios.forEach(function(scenario) {
				it("should fetch the subtransactions for the transaction", function() {
					transaction.transaction_type = scenario;
					transactionEditController.getSubtransactions(transaction);
					transaction.subtransactions.should.be.an.Array;
					transactionModel.findSubtransactions.should.have.been.calledWith(transaction.id);
				});
			});

			it("should eventually return a list of subtransactions stripped of their ids", function() {
				transaction.transaction_type = "Split";

				var expected = angular.copy(transaction);
				expected.subtransactions = [
					{id: null, transaction_type: "Transfer", account: "subtransfer account"},
					{id: null, category: "subtransaction category"},
					{id: null, category: "another subtransaction category", subcategory: "subtransaction subcategory"}
				];

				transaction = transactionEditController.getSubtransactions(transaction);
				transaction.should.eventually.deep.equal(expected);
			});
		});
		
		describe("useLastTransaction", function() {
			var transaction;

			beforeEach(function() {
				// The previous transaction to merge
				transaction = {
					id: 1,
					transaction_date: "date",
					primary_account: "primary account",
					payee: "payee",
					amount: 100
				};

				// The current transaction to merge into
				transactionEditController.transaction = {
					payee: "original payee",
					category: "original category"
				};

				transactionEditController.useLastTransaction(transaction);
			});

			it("should strip the transaction of it's id, date & primary account", function() {
				(undefined === transaction.id).should.be.true;
				(undefined === transaction.transaction_date).should.be.true;
				(undefined === transaction.primary_account).should.be.true;
			});

			it("should merge the transaction details into $scope.transaction", function() {
				transaction.category = "original category";
				transactionEditController.transaction.should.deep.equal(transaction);
			});
		});

		describe("categorySelected", function() {
			describe("(main transaction)", function() {
				beforeEach(function() {
					transactionEditController.transaction.category = {direction: "inflow"};
				});

				var scenarios = [
					{id: "TransferTo", type: "Transfer", direction: "outflow"},
					{id: "TransferFrom", type: "Transfer", direction: "inflow"},
					{id: "SplitTo", type: "Split", direction: "outflow"},
					{id: "SplitFrom", type: "Split", direction: "inflow"},
					{id: "Payslip", type: "Payslip", direction: "inflow"},
					{id: "LoanRepayment", type: "LoanRepayment", direction: "outflow"},
					{id: "anything else", type: "Basic", direction: "the category direction"},
				];

				scenarios.forEach(function(scenario) {
					it("should set the transaction type to " + scenario.type + " and the direction to " + scenario.direction + " if the category is " + scenario.id, function() {
						transactionEditController.transaction.category.id = scenario.id;
						transactionEditController.categorySelected();
						transactionEditController.transaction.transaction_type.should.equal(scenario.type);

						if ("Basic" === scenario.type) {
							transactionEditController.transaction.direction.should.equal(transactionEditController.transaction.category.direction);
						} else {
							transactionEditController.transaction.direction.should.equal(scenario.direction);
						}
					});
				});

				it("should set the transaction type to Basic if the selected category is not an existing category", function() {
					transactionEditController.transaction.category = "new category";
					transactionEditController.categorySelected();
					transactionEditController.transaction.transaction_type.should.equal("Basic");
				});
			});

			describe("(subtransaction)", function() {
				beforeEach(function() {
					transactionEditController.transaction.subtransactions = [
						{category: {direction: "inflow"}}
					];
				});

				var scenarios = [
					{id: "TransferTo", type: "Transfer", direction: "outflow"},
					{id: "TransferFrom", type: "Transfer", direction: "inflow"},
					{id: "anything else", type: "Sub", direction: "the category direction"},
				];

				scenarios.forEach(function(scenario) {
					it("should set the transaction type to " + scenario.type + " and the direction to " + scenario.direction + " if the category is " + scenario.id, function() {
						transactionEditController.transaction.subtransactions[0].category.id = scenario.id;
						transactionEditController.categorySelected(0);
						transactionEditController.transaction.subtransactions[0].transaction_type.should.equal(scenario.type);

						if ("Sub" === scenario.type) {
							transactionEditController.transaction.subtransactions[0].direction.should.equal(transactionEditController.transaction.subtransactions[0].category.direction);
						} else {
							transactionEditController.transaction.subtransactions[0].direction.should.equal(scenario.direction);
						}
					});
				});

				it("should set the transaction type to Sub if the selected category is not an existing category", function() {
					transactionEditController.transaction.subtransactions[0].category = "new category";
					transactionEditController.categorySelected(0);
					transactionEditController.transaction.subtransactions[0].transaction_type.should.equal("Sub");
				});
			});

			it("should set the direction to outflow if the selected category is not an existing category", function() {
				transactionEditController.categorySelected();
				transactionEditController.transaction.direction.should.equal("outflow");
			});

			it("should clear the subcategory if it's parent no longer matches the selected category", function() {
				transactionEditController.transaction.subcategory = {
					parent_id: 1
				};
				transactionEditController.categorySelected();
				(null === transactionEditController.transaction.subcategory).should.be.true;
			});
		});

		describe("investmentCategorySelected", function() {
			beforeEach(function() {
				transactionEditController.transaction.category = {};
			});

			it("should do nothing if the selected category is not an existing category", function() {
				var transaction_type = "transaction type",
						direction = "direction";

				transactionEditController.transaction.category = "new category";
				transactionEditController.transaction.transaction_type = transaction_type;
				transactionEditController.transaction.direction = direction;
				transactionEditController.investmentCategorySelected();
				transactionEditController.transaction.transaction_type.should.equal(transaction_type);
				transactionEditController.transaction.direction.should.equal(direction);
			});

			var scenarios = [
				{id: "TransferTo", type: "SecurityTransfer", direction: "outflow"},
				{id: "TransferFrom", type: "SecurityTransfer", direction: "inflow"},
				{id: "RemoveShares", type: "SecurityHolding", direction: "outflow"},
				{id: "AddShares", type: "SecurityHolding", direction: "inflow"},
				{id: "Sell", type: "SecurityInvestment", direction: "outflow"},
				{id: "Buy", type: "SecurityInvestment", direction: "inflow"},
				{id: "DividendTo", type: "Dividend", direction: "outflow"},
			];

			scenarios.forEach(function(scenario) {
				it("should set the transaction type to " + scenario.type + " and the direction to " + scenario.direction + " if the category is " + scenario.id, function() {
					transactionEditController.transaction.category.id = scenario.id;
					transactionEditController.investmentCategorySelected();
					transactionEditController.transaction.transaction_type.should.equal(scenario.type);
					transactionEditController.transaction.direction.should.equal(scenario.direction);
				});
			});
		});

		describe("$watch subtransations", function() {
			var memo;

			beforeEach(function() {
				memo = "memo";
				transactionEditController.transaction.direction = "outflow";
				transactionEditController.transaction.memo = memo;
				transactionEditController.transaction.subtransactions = [
					{amount: 10, direction: "outflow", memo: "memo 1"},
					{amount: 5, direction: "inflow", memo: "memo 2"}
				];
			});

			it("should do nothing if there are no subtransactions", function() {
				transactionEditController.transaction.subtransactions = undefined;
				transactionEditController.$digest();
				(undefined === transactionEditController.totalAllocated).should.be.true;
			});

			it("should calculate the total and make it available on the scope", function() {
				transactionEditController.$digest();
				transactionEditController.totalAllocated.should.equal(5);
			});

			it("should not set the main transaction memo when editing an existing transaction", function() {
				transactionEditController.$digest();
				transactionEditController.transaction.memo.should.equal(memo);
			});

			it("should join the sub transaction memos and set the main transaction memo when adding a new transaction", function() {
				transactionEditController.transaction.id = undefined;
				transactionEditController.$digest();
				transactionEditController.transaction.memo.should.equal("memo 1; memo 2");
			});
		});

		describe("accounts", function() {
			var accounts;

			it("should fetch the list of accounts", function() {
				transactionEditController.accounts();
				accountModel.all.should.have.been.called;
			});

			it("should remove the current account from the list", function() {
				transactionEditController.transaction.primary_account = {name: "aa"};
				accounts = transactionEditController.accounts("a", 2);
				accounts.should.eventually.deep.equal([
					{id: 4, name: "ba"},
					{id: 5, name: "ab"}
				]);
			});

			it("should return a filtered & limited list of non-investment accounts when the transaction type is not Security Transfer", function() {
				accounts = transactionEditController.accounts("b", 2);
				accounts.should.eventually.deep.equal([
					{id: 4, name: "ba"},
					{id: 5, name: "ab"}
				]);
			});

			it("should return a filtered & limited list of investment accounts when the transaction type is Security Transfer", function() {
				transactionEditController.transaction.transaction_type = "SecurityTransfer";
				accounts = transactionEditController.accounts("b", 2);
				accounts.should.eventually.deep.equal([
					{id: 2, name: "bb", account_type: "investment"},
					{id: 6, name: "bc", account_type: "investment"}
				]);
			});
		});

		describe("addSubtransaction", function() {
			it("should add an empty object to the subtransactions array", function() {
				transactionEditController.transaction.subtransactions = [];
				transactionEditController.addSubtransaction();
				transactionEditController.transaction.subtransactions.should.deep.equal([{}]);
			});
		});

		describe("deleteSubtransaction", function() {
			it("should remove an item from the subtransactions array at the specified index", function() {
				transactionEditController.transaction.subtransactions = [1, 2, 3];
				transactionEditController.deleteSubtransaction(1);
				transactionEditController.transaction.subtransactions.should.deep.equal([1, 3]);
			});
		});

		describe("updateInvestmentDetails", function() {
			var amount,
					memo;

			beforeEach(function() {
				amount = 100;
				memo = "memo";
				transactionEditController.transaction.id = undefined;
				transactionEditController.transaction.transaction_type = "SecurityInvestment";
				transactionEditController.transaction.quantity = 2;
				transactionEditController.transaction.price = 10;
				transactionEditController.transaction.commission = 1;
				transactionEditController.transaction.amount = amount;
				transactionEditController.transaction.memo = memo;
			});

			it("should do nothing when the transaction type is not SecurityInvestment", function() {
				transactionEditController.transaction.transaction_type = undefined;
				transactionEditController.updateInvestmentDetails();
				transactionEditController.transaction.amount.should.equal(amount);
				transactionEditController.transaction.memo.should.equal(memo);
			});

			it("should set the transaction amount to zero and the memo to an empty string if the price, quantity and commission are not specified for Security Investment transactions", function() {
				transactionEditController.transaction.quantity = undefined;
				transactionEditController.transaction.price = undefined;
				transactionEditController.transaction.commission = undefined;
				transactionEditController.updateInvestmentDetails();
				transactionEditController.transaction.amount.should.equal(0);
				transactionEditController.transaction.memo.should.be.empty;
			});

			it("should calculate the transaction amount from the price, quantity and commission for Security Investment transactions", function() {
				transactionEditController.updateInvestmentDetails();
				transactionEditController.transaction.amount.should.equal(19);
			});

			it("should not update the memo when editing an existing Security Investment transaction", function() {
				transactionEditController.transaction.id = 1;
				transactionEditController.updateInvestmentDetails();
				transactionEditController.transaction.memo.should.equal(memo);
			});

			it("should update the memo with the price, quantity and commission when adding a new Security Investment transaction", function() {
				transactionEditController.updateInvestmentDetails();
				transactionEditController.transaction.memo.should.equal("2 @ $10.00 (less $1.00 commission)");
			});
		});

		describe("updateLruCaches", function() {
			var data;
			
			beforeEach(function() {
				data = {
					id: 1,
					transaction_type: "Basic",
					primary_account: "primary account",
					payee: "payee",
					security: "security",
					category: "category",
					subcategory: "subcategory",
					account: "account",
				};
			});
					
			it("should add the primary account to the recent list", function() {
				transactionEditController.updateLruCaches({data: data});
				accountModel.addRecent.should.have.been.calledWith(data.primary_account);
			});

			it("should add the payee to the recent list for a non-investment account", function() {
				transactionEditController.updateLruCaches({data: data});
				payeeModel.addRecent.should.have.been.calledWith(data.payee);
				securityModel.addRecent.should.not.have.been.called;
			});

			it("should add the security to the recent list for an investment account", function() {
				data.primary_account = {account_type: "investment"};
				transactionEditController.updateLruCaches({data: data});
				securityModel.addRecent.should.have.been.calledWith(data.security);
				payeeModel.addRecent.should.not.have.been.called;
			});

			it("should add the category to the recent list if the type is Basic", function() {
				transactionEditController.updateLruCaches({data: data});
				categoryModel.addRecent.should.have.been.calledWith(data.category);
			});

			it("should not try to add the subcategory to the recent list if the type is Basic but there is no subcategory", function() {
				data.subcategory = undefined;
				transactionEditController.updateLruCaches({data: data});
				categoryModel.addRecent.should.have.been.calledOnce;
			});

			it("should add the subcategory to the recent list if the type is Basic", function() {
				transactionEditController.updateLruCaches({data: data});
				categoryModel.addRecent.should.have.been.calledTwice;
				categoryModel.addRecent.should.have.been.calledWith(data.subcategory);
			});

			var scenarios = ["Transfer", "SecurityTransfer", "SecurityInvestment", "Dividend"];

			scenarios.forEach(function(scenario) {
				it("should add the account to the recent list if the type is " + scenario, function() {
					data.transaction_type = scenario;
					transactionEditController.updateLruCaches({data: data});
					accountModel.addRecent.should.have.been.calledWith(data.account);
				});
			});

			scenarios = ["Split", "LoanRepayment", "Payslip"];

			scenarios.forEach(function(scenario) {
				it("should fetch the subtransactions when the type is " + scenario, function() {
					data.transaction_type = scenario;
					transactionEditController.updateLruCaches({data: data});
					transactionModel.findSubtransactions.should.have.been.calledWith(data.id);
				});

				it("should add the subtransaction account to the recent list for Subtranfers", function() {
					data.transaction_type = scenario;
					transactionEditController.updateLruCaches({data: data});
					accountModel.addRecent.should.have.been.calledWith("subtransfer account");
				});

				it("should add the subtransaction category to the recent list for Subtransactions", function() {
					data.transaction_type = scenario;
					transactionEditController.updateLruCaches({data: data});
					categoryModel.addRecent.should.have.been.calledWith("subtransaction category");
				});

				it("should not try to add the subtransaction subcategory to the recent list for Subtransactions if there is no subcategory", function() {
					data.transaction_type = scenario;
					transactionEditController.updateLruCaches({data: data});
					categoryModel.addRecent.should.have.been.calledThrice;
				});

				it("should add the subtransaction subcategory to the recent list for Subtransactions", function() {
					data.transaction_type = scenario;
					transactionEditController.updateLruCaches({data: data});
					categoryModel.addRecent.should.have.been.calledWith("subtransaction subcategory");
				});
			});

			it("should eventually be fulfilled", function() {
				transactionEditController.updateLruCaches({data: data}).should.be.fulfilled;
			});
		});

		describe("save", function() {
			it("should reset any previous error messages", function() {
				transactionEditController.errorMessage = "error message";
				transactionEditController.save();
				(null === transactionEditController.errorMessage).should.be.true;
			});

			it("should save the transaction", function() {
				transactionEditController.save();
				transactionModel.save.should.have.been.calledWith(transaction);
			});

			it("should update the LRU caches", function() {
				sinon.spy(transactionEditController, "updateLruCaches");
				transactionEditController.save();
				transactionEditController.updateLruCaches.should.have.been.calledWith({data: transaction});
			});

			it("should close the modal when the transaction save is successful", function() {
				transactionEditController.save();
				$modalInstance.close.should.have.been.calledWith(transaction);
			});

			it("should display an error message when the transaction save unsuccessful", function() {
				transactionEditController.transaction.id = -1;
				transactionEditController.save();
				transactionEditController.errorMessage.should.equal("unsuccessful");
			});
		});

		describe("cancel", function() {
			it("should dismiss the modal", function() {
				transactionEditController.cancel();
				$modalInstance.dismiss.should.have.been.called;
			});
		});
	});
})();