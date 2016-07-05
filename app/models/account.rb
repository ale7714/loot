class Account < ApplicationRecord
	validates :name, :opening_balance, presence: true
	validates :account_type, presence: true, inclusion: {in: %w(bank credit cash asset liability investment loan)}
	validates :status, inclusion: {in: %w(open closed)}
	belongs_to :related_account, class_name: 'Account', foreign_key: 'related_account_id', autosave: true, optional: true
	has_many :transaction_accounts
	has_many :transactions, through: :transaction_accounts, source: :trx do
		def for_ledger(opts)
			joins([	"LEFT OUTER JOIN transaction_headers ON transaction_headers.transaction_id = transactions.id",
							"LEFT OUTER JOIN transaction_splits ON transaction_splits.transaction_id = transactions.id",
							"LEFT OUTER JOIN transaction_categories ON transaction_categories.transaction_id = transactions.id"])
		end

		def for_closing_balance(opts)
			joins("JOIN transaction_headers ON transaction_headers.transaction_id = transactions.id")
		end

		def for_basic_closing_balance(opts)
			joins([	"JOIN transaction_headers ON transaction_headers.transaction_id = transactions.id",
							"JOIN transaction_categories ON transaction_categories.transaction_id = transactions.id"])
		end
	end

	include Transactable
	include Favouritable

	class << self
		def list
			# Get the current holding balance of all investment accounts
			investment_accounts = ActiveRecord::Base.connection.execute <<-query
				SELECT					accounts.id,
												accounts.name,
												accounts.status,
												accounts.account_type,
												accounts.favourite,
												accounts.opening_balance,
												SUM(security_holdings.current_value) as total_value,
												related_accounts.id AS related_account_id,
												related_accounts.name AS related_account_name,
												related_accounts.account_type AS related_account_type,
												related_accounts.opening_balance AS related_account_opening_balance,
												related_accounts.status AS related_account_status
				FROM						accounts
				LEFT OUTER JOIN accounts related_accounts ON related_accounts.id = accounts.related_account_id
				LEFT OUTER JOIN	(	SELECT		accounts.id,
																		transaction_headers.security_id,
																		ROUND(SUM(CASE transaction_accounts.direction WHEN 'inflow' THEN transaction_headers.quantity ELSE transaction_headers.quantity * -1.0 END) * MAX(latest_prices.price),2) AS current_value
													FROM			accounts
													JOIN			transaction_accounts ON transaction_accounts.account_id = accounts.id
													JOIN			transactions ON transactions.id = transaction_accounts.transaction_id
													JOIN			transaction_headers ON transaction_headers.transaction_id = transactions.id
													JOIN			(	SELECT		security_prices.security_id,
																								security_prices.price
																			FROM			security_prices
																			JOIN			(	SELECT		security_id,
																														MAX(as_at_date) AS as_at_date
																									FROM			security_prices
																									GROUP BY	security_id
																								) latest_price_dates ON security_prices.security_id = latest_price_dates.security_id AND security_prices.as_at_date = latest_price_dates.as_at_date
																		) latest_prices ON transaction_headers.security_id = latest_prices.security_id
													WHERE			transactions.transaction_type IN ('SecurityInvestment', 'SecurityTransfer', 'SecurityHolding') AND
																		transaction_headers.transaction_date IS NOT NULL AND
																		accounts.account_type = 'investment'
													GROUP BY	accounts.id,
																		transaction_headers.security_id
													HAVING		ABS(ROUND(SUM(CASE transaction_accounts.direction WHEN 'inflow' THEN transaction_headers.quantity ELSE transaction_headers.quantity * -1.0 END) * MAX(latest_prices.price),2)) > 0
												) AS security_holdings ON security_holdings.id = accounts.id
				WHERE						accounts.account_type = 'investment'
				GROUP BY				accounts.id,
												related_accounts.id
			query

			# Get the current closing balance of all non-investment accounts
			other_accounts = ActiveRecord::Base.connection.execute <<-query
				SELECT					accounts.id,
												accounts.name,
												accounts.status,
												accounts.account_type,
												accounts.favourite,
												accounts.opening_balance,
												accounts.opening_balance + COALESCE(basic_transactions.total,0) + COALESCE(subtransfer_transactions.total,0) + COALESCE(inflow_transactions.total,0) + COALESCE(outflow_transactions.total,0) AS closing_balance,
												related_accounts.id AS related_account_id,
												related_accounts.name AS related_account_name,
												related_accounts.account_type AS related_account_type,
												related_accounts.opening_balance AS related_account_opening_balance,
												related_accounts.status AS related_account_status
				FROM						accounts
				LEFT OUTER JOIN accounts related_accounts ON related_accounts.id = accounts.related_account_id
				LEFT OUTER JOIN	(	SELECT		accounts.id,
																		SUM(CASE categories.direction WHEN 'inflow' THEN transactions.amount ELSE transactions.amount * -1.0 END) AS total
													FROM			accounts
													JOIN			transaction_accounts ON transaction_accounts.account_id = accounts.id
													JOIN			transactions ON transactions.id = transaction_accounts.transaction_id
													JOIN			transaction_headers ON transaction_headers.transaction_id = transactions.id
													JOIN			transaction_categories ON transaction_categories.transaction_id = transactions.id
													JOIN			categories ON categories.id = transaction_categories.category_id
													WHERE			transactions.transaction_type = 'Basic' AND
																		transaction_headers.transaction_date IS NOT NULL AND
																		accounts.account_type != 'investment'
													GROUP BY	accounts.id
												) AS basic_transactions ON basic_transactions.id = accounts.id
				LEFT OUTER JOIN	(	SELECT		accounts.id,
																		SUM(CASE transaction_accounts.direction WHEN 'inflow' THEN transactions.amount ELSE transactions.amount * -1.0 END) AS total
													FROM			accounts
													JOIN			transaction_accounts ON transaction_accounts.account_id = accounts.id
													JOIN			transactions ON transactions.id = transaction_accounts.transaction_id
													JOIN			transaction_headers ON transaction_headers.transaction_id = transactions.id
													JOIN			transaction_splits ON transaction_splits.transaction_id = transactions.id
													JOIN			transactions parent_transactions ON parent_transactions.id = transaction_splits.parent_id
													WHERE			transactions.transaction_type = 'Subtransfer' AND
																		parent_transactions.transaction_type IN ('Split', 'LoanRepayment', 'Payslip') AND
																		transaction_headers.transaction_date IS NOT NULL AND
																		accounts.account_type != 'investment'
													GROUP BY	accounts.id
												) AS subtransfer_transactions ON subtransfer_transactions.id = accounts.id
				LEFT OUTER JOIN	(	SELECT		accounts.id,
																		SUM(transactions.amount) AS total
													FROM			accounts
													JOIN			transaction_accounts ON transaction_accounts.account_id = accounts.id
													JOIN			transactions ON transactions.id = transaction_accounts.transaction_id
													JOIN			transaction_headers ON transaction_headers.transaction_id = transactions.id
													WHERE			transactions.transaction_type IN ('Split', 'Payslip', 'Transfer', 'Dividend', 'SecurityInvestment') AND
																		transaction_accounts.direction = 'inflow' AND
																		transaction_headers.transaction_date IS NOT NULL AND
																		accounts.account_type != 'investment'
													GROUP BY	accounts.id
												) AS inflow_transactions ON inflow_transactions.id = accounts.id
				LEFT OUTER JOIN	(	SELECT		accounts.id,
																		SUM(transactions.amount * -1.0) AS total
													FROM			accounts
													JOIN			transaction_accounts ON transaction_accounts.account_id = accounts.id
													JOIN			transactions ON transactions.id = transaction_accounts.transaction_id
													JOIN			transaction_headers ON transaction_headers.transaction_id = transactions.id
													WHERE			transactions.transaction_type IN ('Split', 'LoanRepayment', 'Transfer', 'SecurityInvestment') AND
																		transaction_accounts.direction = 'outflow' AND
																		transaction_headers.transaction_date IS NOT NULL AND
																		accounts.account_type != 'investment'
													GROUP BY	accounts.id
												) AS outflow_transactions ON outflow_transactions.id = accounts.id
				WHERE						accounts.account_type != 'investment'
			query

			# Convert the array of accounts to a hash
			account_list = other_accounts.each_with_object({}) do |account, hash|
				hash[account['id']] = account
			end

			# Overlay the investment holding balances on top of the related cash account closing balances
			investment_accounts.each do |account|
				cash_account = account_list[account['related_account_id']]
				next if cash_account.nil?
				cash_account.merge! account
				cash_account['closing_balance'] = cash_account['closing_balance'].to_f + cash_account['total_value'].to_f || 0
			end

			account_list.values.sort_by {|a| a['account_type']}.group_by {|a| "#{a['account_type'].capitalize} account".pluralize}.each_with_object({}) do |(type,accounts),hash|
				hash[type] = {
					accounts: accounts.sort_by {|a| a['name']}.map {|a| {
						id: a['id'].to_i,
						name: a['name'],
						account_type: a['account_type'],
						status: a['status'],
						favourite: a['favourite'],
						opening_balance: a['opening_balance'].to_f,
						closing_balance: a['closing_balance'].to_f,
						related_account: {
							id: a['related_account_id'] && a['related_account_id'].to_i,
							name: a['related_account_name'],
							account_type: a['related_account_type'],
							opening_balance: a['related_account_opening_balance'] && a['related_account_opening_balance'].to_f,
							status: a['related_account_status']
						}
					}},
					total: accounts.map {|a| a['closing_balance'].to_f}.reduce(:+)
				}
			end

		end

		def create_from_json(json)
			account = Account.new name: json['name'], account_type: json['account_type'], opening_balance: json['opening_balance'], status: json['status'], favourite: !!json['favourite']
			account.related_account_id = json['related_account']['id'] if account.account_type.eql?("loan") and !!json['related_account']
			account.related_account = Account.new name: "#{json['name']} (Cash)", account_type: "bank", opening_balance: json['related_account']['opening_balance'], status: json['status'], favourite: !!json['favourite'], related_account: account if account.account_type.eql?("investment")
			account.save!
			account
		end

		def update_from_json(json)
			s = self.includes(:related_account).find(json[:id])
			s.update_from_json(json)
			s
		end
	end

	def update_from_json(json)
		original_account_type = self.account_type

		self.name = json['name']
		self.account_type = json['account_type']
		self.opening_balance = json['opening_balance']
		self.status = json['status']
		self.favourite = !!json['favourite']

		if self.account_type.eql? "investment"
			if original_account_type.eql? "investment"
				# Update the related cash account
				self.related_account.name = "#{json['name']} (Cash)"
				self.related_account.account_type = "bank"
				self.related_account.opening_balance = json['related_account']['opening_balance']
				self.related_account.status = json['status']
				self.related_account.favourite = !!json['favourite']
			else
				# Create a new cash account
				self.related_account = Account.new name: "#{json['name']} (Cash)", account_type: "bank", opening_balance: json['related_account']['opening_balance'], status: json['status'], favourite: !!json['favourite'], related_account: self
			end
		else
			# If changing from an investment account, delete the related cash account
			self.related_account.destroy if original_account_type.eql? "investment"

			if self.account_type.eql? "loan"
				# Set the related asset account
				self.related_account = (json['related_account'].nil? || json['related_account']['id'].nil? ? nil : Account.find(json['related_account']['id']))
			else
				# Clear the related account (if any)
				self.related_account = nil
			end
		end

		self.save!
	end

	def reconcile
		# Mark all cleared transactions for the account as reconciled
		self.transaction_accounts
			.where(status: 'Cleared')
			.update_all(status: 'Reconciled')
	end

	def as_json(options={only: [:id, :name, :account_type, :opening_balance, :status, :favourite]})
		# Defer to serializer
		AccountSerializer.new(self, options).as_json
	end
end
