FactoryGirl.define do
	factory :security_holding_transaction, aliases: [:security_add_transaction] do
		# Default attributes for security transaction
		security_transaction

		# Default accounts if none specified
		transient do
			account { FactoryGirl.build(:investment_account) }
			direction "Add"
			quantity 10
			status nil
			transaction_date nil
		end

		after :build do |trx, evaluator|
			trx.header.transaction_date = evaluator.transaction_date unless evaluator.transaction_date.nil?
			trx.header.quantity = evaluator.quantity
			trx.transaction_account = FactoryGirl.build(:transaction_account, account: evaluator.account, direction: (evaluator.direction.eql?("Add") ? "inflow" : "outflow"), status: evaluator.status)
		end

		trait :outflow do
			direction "Remove"
		end

		trait :scheduled do
			after :build do |trx|
				trx.header.transaction_date = nil
				trx.header.schedule = build :schedule
			end
		end

		factory :security_remove_transaction, traits: [:outflow]
	end
end
