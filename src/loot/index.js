// Dependent modules
import "angular-ui-bootstrap";
import "@uirouter/angularjs";
import "og-components";
import "accounts";
import "authentication";
import "categories";
import "payees";
import "schedules";
import "securities";
import "transactions";
import "bootstrap/dist/css/bootstrap.min.css";
import "./css/loot.less";

// Components
import $ from "jquery";
import LayoutController from "./controllers/layout";
import LootStatesProvider from "./providers/states";
import angular from "angular";

angular.module("lootApp", [
	"ui.bootstrap",
	"ui.router",
	"ogComponents",
	"lootAccounts",
	"lootAuthentication",
	"lootCategories",
	"lootPayees",
	"lootSchedules",
	"lootSecurities",
	"lootStates",
	"lootTransactions"
])
	.controller("LayoutController", LayoutController)

	// Default to account list for any unmatched URLs
	.config(["$urlServiceProvider", "lootStatesProvider", $urlServiceProvider => $urlServiceProvider.rules.otherwise("/accounts")])

	// Runtime initialisation
	.run(["$rootScope", "$window", "$state", "ogNavigatorServiceWorkerService", ($rootScope, $window, $state, ogNavigatorServiceWorkerService) => {
		// Ensure that jQuery is available on the $window service
		$window.$ = $;

		// Ensure that the $state service is accessible from the $rootScope
		$rootScope.$state = $state;

		// ServiceWorker registration
		ogNavigatorServiceWorkerService.register("/service-worker.js");
	}]);

angular.module("lootStates", [
	"ui.bootstrap",
	"ui.router",
	"lootAccounts",
	"lootAuthentication",
	"lootCategories",
	"lootPayees",
	"lootSchedules",
	"lootSecurities",
	"lootTransactions"
])
	.provider("lootStates", LootStatesProvider);