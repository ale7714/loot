export default class ControllerTest {
	constructor($rootScope, $controller) {
		// Loads the controller and returns a scope object
		return (controller, locals = {}, bindings = {}) => {
			// Create a new scope
			locals.$scope = $rootScope.$new();

			// Load the controller
			const instance = $controller(controller, locals, bindings);

			// Attach the scope to the returned instance as $scope
			instance.$scope = locals.$scope;

			return instance;
		};
	}
}

ControllerTest.$inject = ["$rootScope", "$controller"];