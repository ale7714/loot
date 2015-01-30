require 'csv'
require 'json'

# Location of the exported sunriise files
@export_dir = File.join(Dir.home, 'Documents', 'sunriise')

# Temporary hashes for lookups etc. during load
@tmp_account_types = {
	'0' => 'bank',
	'1' => 'credit',
	'2' => 'cash',
	'3' => 'asset',
	'4' => 'liability',
	'5' => 'investment',
	'6' => 'loan'
}
@tmp_accounts = {}
@tmp_payees = {}
@tmp_categories = {}
@tmp_securities = {}
@tmp_splits = {}
@tmp_subtransactions = []
@tmp_transfers = {}
@tmp_investments = {}
@tmp_transactions = {}
@tmp_buys = {}
@tmp_sells = {}
@tmp_head_bills = {}
@tmp_bills = {}
@tmp_flags = {}

def noop(trx)
	#noop
end

alias create_subtransaction_transaction noop
alias create_subtransfer_transaction noop
alias create_payslip_beforetax_transaction noop
alias create_payslip_tax_transaction noop

def progress(action, count, type)
	reset_line = "\r\e[0K"
	print "#{reset_line}#{action} #{count} #{type}".pluralize $.
end

def csv_file_path(table)
	File.join @export_dir, 'csv', table, "#{table}-rows.csv"
end

# Accounts
def load_accounts
	print "Deleting existing accounts..."
	Account.destroy_all
	puts "done"

	related_accounts = {}

	CSV.foreach csv_file_path('ACCT'), headers: true do |row|
		a = Account.create(name: row['szFull'], account_type: @tmp_account_types[row['at']], opening_balance: (!!row['amtOpen'] && row['amtOpen'].to_f)|| 0, status: (row['fClosed'].eql?('false') && 'open') || 'closed').id
		@tmp_accounts[row['hacct']] = a
		related_accounts[a] = row['hacctRel'] unless row['hacctRel'].nil?
		progress "Loaded", $., "account" if $. % 10 == 0
	end
	progress "Loaded", $., "account"
	puts

	related_accounts.each_with_index do |(account, related_account), index|
		a = Account.find(account)
		a.related_account = Account.find(@tmp_accounts[related_account])
		a.save
		progress "Loaded", index, "related account"
	end
	progress "Loaded", related_accounts.length, "related account"
	2.times { puts }
end

# Payees
def load_payees
	print "Deleting existing payees..."
	Payee.destroy_all
	puts "done"

	CSV.foreach csv_file_path('PAY'), headers: true do |row|
		@tmp_payees[row['hpay']] = Payee.create(name: row['szFull']).id
		progress "Loaded", $., "payee" if $. % 10 == 0
	end
	progress "Loaded", $., "payee"
	2.times { puts }
end

# Categories
def load_categories
	print "Deleting existing categories..."
	Category.destroy_all
	puts "done"

	CSV.foreach csv_file_path('CAT'), headers: true do |row|
		@tmp_categories[row['hcat']] = { type: row['hct'], name: row['szFull'], level: row['nLevel'], parent: row['hcatParent'] }
	end

	# Select the top level INCOME/EXPENSE items
	income = @tmp_categories.select do |key, value|
		value[:level].eql?('0') && value[:name].eql?('INCOME')
	end

	expense = @tmp_categories.select do |key, value|
		value[:level].eql?('0') && value[:name].eql?('EXPENSE')
	end

	# Income categories
	income.each_key do |id|
		# Get the list of categories that have this parent
		categories = subcategories id

		# Create each one
		categories.sort_by {|k,v| v[:name]}.each do |catid, category|
			create_category catid, category[:name], 'inflow'
		end
	end

	# Expense categories
	expense.each_key do |id|
		# Get the list of categories that have this parent
		categories = subcategories id

		# Create each one
		categories.sort_by {|k,v| v[:name]}.each do |catid, category|
			create_category catid, category[:name], 'outflow'
		end
	end

	puts "Loaded #{@tmp_categories.length} category".pluralize @tmp_categories.length
	puts
end

def subcategories(id)
	@tmp_categories.select do |key, value|
		value[:parent].eql? id
	end
end

def create_category(id, name, direction)
	# Create the new category
	c = Category.new(name: name, direction: direction)

	# Get the list of categories that have this parent
	subcats = subcategories id

	# Create the subcategories
	subcats.sort_by {|k,v| v[:name]}.each do |catid, category|
		c.children.build(name: category[:name], direction: direction)
	end

	# Save the category (and it's children)
	c.save

	# Update the ids in our temporary hash
	@tmp_categories[id][:id] = c.id
	subcats.sort_by {|k,v| v[:name]}.each_with_index do |(catid, category), index|
		@tmp_categories[catid][:id] = c.children[index].id
	end
end

# Securities
def load_securities
	print "Deleting existing securities..."
	Security.destroy_all
	puts "done"

	CSV.foreach csv_file_path('SEC'), headers: true do |row|
		@tmp_securities[row['hsec']] = { id: Security.create(name: row['szFull'], code: row['szSymbol']).id, prices: [] }
		progress "Loaded", $., "security" if $. % 10 == 0
	end
	progress "Loaded", $., "security"
	2.times { puts }
end

# Security Prices
def load_security_prices
	print "Deleting existing security prices..."
	SecurityPrice.delete_all
	puts "done"

	CSV.foreach csv_file_path('SP'), headers: true do |row|
		@tmp_securities[row['hsec']][:prices] << { price: row['dPrice'].to_f, as_at_date: row['dt'] }
		progress "Prepared", $., "security price" if $. % 10 == 0
	end
	progress "Prepared", $., "security price"
	puts

	loaded = 0
	@tmp_securities.each do |id,sec|
		s = Security.find(sec[:id])
		last_price = nil
		sec[:prices].sort_by {|price| Date.parse price[:as_at_date]}.each do |price|
			s.prices.build(price: price[:price], as_at_date: price[:as_at_date]) unless price[:price].eql? last_price
			last_price = price[:price]
			loaded += 1
			progress "Loaded", loaded, "security price" if loaded % 10 == 0
		end
		s.save
	end
	progress "Loaded", loaded, "security prices"
	2.times { puts }
end

#Transactions
def load_transactions
	print "Deleting existing transactions..."
	Transaction.destroy_all
	puts "done"
	print "Deleting existing transaction accounts..."
	TransactionAccount.delete_all
	puts "done"
	print "Deleting existing transaction headers..."
	TransactionHeader.delete_all
	puts "done"
	print "Deleting existing transaction categories..."
	TransactionCategory.delete_all
	puts "done"
	print "Deleting existing transaction splits..."
	TransactionSplit.delete_all
	puts "done"
	print "Deleting existing transaction flags..."
	TransactionFlag.delete_all
	puts "done"

	CSV.foreach csv_file_path('TRN_SPLIT'), headers: true do |row|
		@tmp_splits[row['htrnParent']] = [] unless @tmp_splits.has_key? row['htrnParent']
		@tmp_splits[row['htrnParent']] << row['htrn']
		@tmp_subtransactions << row['htrn']
		progress "Prepared", $., "split" if $. % 10 == 0
	end
	progress "Prepared", $., "split"
	puts

	CSV.foreach csv_file_path('TRN_XFER'), headers: true do |row|
		@tmp_transfers[row['htrnLink']] = row['htrnFrom']
		progress "Prepared", $., "transfer" if $. % 10 == 0
	end
	progress "Prepared", $., "transfer"
	puts

	CSV.foreach csv_file_path('TRN_INV'), headers: true do |row|
		@tmp_investments[row['htrn']] = {
			price: row['dPrice'].to_f,
			qty: row['qty'].to_f,
			commission: row['amtCmn'].to_f
		}
		progress "Prepared", $., "investment" if $. % 10 == 0
	end
	progress "Prepared", $., "investment"
	puts

	CSV.foreach csv_file_path('LOT'), headers: true do |row|
		@tmp_buys[row['htrnBuy']] = '' unless row['htrnBuy'].nil?
		@tmp_sells[row['htrnSell']] = '' unless row['htrnSell'].nil?
		progress "Prepared", $., "investment lot" if $. % 10 == 0
	end
	progress "Prepared", $., "investment lot"
	puts

	CSV.foreach csv_file_path('XBAG'), headers: true do |row|
		@tmp_flags[row['lHobj']] = row['szMemo'] if row['bt'].eql?('0')
		progress "Prepared", $., "flag" if $. % 10 == 0
	end
	progress "Prepared", $., "flag"
	puts

	CSV.foreach csv_file_path('TRN'), {headers: true, encoding: 'ISO-8859-1:UTF-8'} do |row|
		@tmp_transactions[row['htrn']] = {
			id: row['htrn'],
			account: @tmp_accounts[row['hacct']],
			transaction_date: row['dt'],
			amount: row['amt'].to_f.abs,
			orig_amount: row['amt'],
			memo: row['mMemo'],
			payee: @tmp_payees[row['lHpay']],
			security: @tmp_securities[row['hsec']],
			category: ((!row['hcat'].nil?) && @tmp_categories[row['hcat']][:id]),
			grftt: row['grftt'],
			status: case row['cs']
				when '1' then 'Cleared'
				when '2' then 'Reconciled'
			end
		}

		@tmp_transactions[row['htrn']][:type] = case
			# Payslip is simply any row where 'ps' is 1
			when row['ps'].eql?('1') then 'payslip'

			# Subtransfers are any rows where 'ps' is 0 or 2, and the row is both part of a transfer and a child of a split
			when (row['ps'].eql?('0') || row['ps'].eql?('2')) && (@tmp_transfers.has_key?(row['htrn']) || @tmp_transfers.has_value?(row['htrn'])) && @tmp_subtransactions.include?(row['htrn']) then 'subtransfer'

			# Transfers out are any rows where 'ps' is 0 and the row is part of a transfer and the other side is not a child of a split and the amount is negative
			when row['ps'].eql?('0') && @tmp_transfers.has_key?(row['htrn']) && !@tmp_subtransactions.include?(@tmp_transfers[row['htrn']]) && row['amt'].to_f < 0 then 'transfer_out'

			# Transfers in are any rows where 'ps' is 0 and the row is part of a transfer and the other side is not a child of a split and the amount is positive
			when row['ps'].eql?('0') && @tmp_transfers.has_key?(row['htrn']) && !@tmp_subtransactions.include?(@tmp_transfers[row['htrn']]) && row['amt'].to_f >= 0 then 'transfer_in'

			# Subtransactions are any rows where 'ps' is 2, or 'ps' is 0 and the row is a child of a split
			when row['ps'].eql?('2') || (row['ps'].eql?('0') && @tmp_subtransactions.include?(row['htrn'])) then 'subtransaction'

			# Payslip before tax is simply any row where 'ps' is 3
			when row['ps'].eql?('3') then 'payslip_beforetax'

			# Payslip tax is simply any row where 'ps' is 4
			when row['ps'].eql?('4') then 'payslip_tax'

			# Loan repayment is simply any row where 'ps' is 5
			when row['ps'].eql?('5') then 'loanrepayment'

			# Splits out are any rows where 'ps' is 0 and is the parent in a split and the amount is negative
			when row['ps'].eql?('0') && @tmp_splits.has_key?(row['htrn']) && row['amt'].to_f < 0 then 'split_out'

			# Splits in are any rows where 'ps' is 0 and is the parent in a split and the amount is positive
			when row['ps'].eql?('0') && @tmp_splits.has_key?(row['htrn']) && row['amt'].to_f >= 0 then 'split_in'

			# Security Holding out is any row that has a security and is not part of a transfer and is a sell
			when !row['hsec'].nil? && !@tmp_transfers.has_key?(row['htrn']) && !@tmp_transfers.has_value?(row['htrn']) && @tmp_sells.has_key?(row['htrn']) then 'securityholding_out'

			# Security Holding in is any row that has a security and is not part of a transfer and is a buy
			when !row['hsec'].nil? && !@tmp_transfers.has_key?(row['htrn']) && !@tmp_transfers.has_value?(row['htrn']) && @tmp_buys.has_key?(row['htrn']) then 'securityholding_in'

			# Basic is any row where 'ps' is 0 and the row is not part of a split or a transfer
			when row['ps'].eql?('0') && !@tmp_splits.has_key?(row['htrn']) && !@tmp_subtransactions.include?(row['htrn']) && !@tmp_transfers.has_key?(row['htrn']) && !@tmp_transfers.has_value?(row['htrn']) then 'basic'
		end
		progress "Prepared", $., "transaction" if $. % 10 == 0
	end
	progress "Prepared", $., "transaction"
	puts

	# For any transfers, check if one or both sides of the transfer have a security
	@tmp_transfers.each_with_index do |(this_side, other_side), index|
		trx = @tmp_transactions[this_side]

		# Only interested in transfers in/out
		next unless ['transfer_in','transfer_out'].include? trx[:type]
		
		this_security, other_security = @tmp_transactions[this_side][:security], @tmp_transactions[other_side][:security]

		case
			# Transfer is where both sides have a security
			when !this_security.nil? && !other_security.nil? then trx[:type] = (@tmp_sells.has_key?(this_side) ? 'securitytransfer_out' : 'securitytransfer_in')

			# Investment is where only one side has a security and is in investments
			when (this_security.nil? ^ other_security.nil?) && (@tmp_investments.include?(this_side) || @tmp_investments.include?(other_side)) then trx[:type] = (this_security.nil? ? 'securityinvestment_out' : 'securityinvestment_in')

			# Dividend is where only one side has a security and neither is in investments
			when (this_security.nil? ^ other_security.nil?) && !@tmp_investments.include?(this_side) && !@tmp_investments.include?(other_side) then trx[:type] = (this_security.nil? ? 'dividend_in' : 'dividend_out')
		end
		progress "Prepared", index, "security transaction" if index % 10 == 0
	end
	progress "Prepared", @tmp_transfers.length, "security transaction"
	puts

	@tmp_transactions.sort_by {|k,v| Date.parse v[:transaction_date]}.each_with_index do |(id, trx), index|
		begin
			# Only create transaction if the type and account are known, and it is not a void transaction
			self.send "create_#{trx[:type]}_transaction".to_sym, trx unless trx[:type].nil? || !!!trx[:account] || void?(trx)
			progress "Loaded", index, "transaction"
		rescue
			p trx
			raise
		end
	end
	progress "Loaded", @tmp_transactions.length, "transaction"
	puts
end

#Bills
def load_bills
	print "Deleting existing bills..."
	Schedule.destroy_all
	puts "done"

	CSV.foreach csv_file_path('BILL'), headers: true do |row|
		@tmp_head_bills[row['hbillHead']] = {next_unpaid_instance: row['iinstNextUnpaid'].to_i} if row['hbill'].to_i.eql?(row['hbillHead'].to_i) && row['cInstMax'].to_i.eql?(-1)

		@tmp_bills[row['hbillHead']] = {
			instance: row['iinst'].to_i,
			last_date: row['dt'],
			estimate: !!row['cEstInst'].to_i.eql?(0),
			auto: !!!row['cDaysAutoEnter'].to_i.eql?(-1),
			transaction: row['lHtrn'],
			frequency: case row['frq'].to_i
				when 2 then 'Fortnightly'
				when 3 then 'Monthly'
				when 4 then 'Quarterly'
				when 5 then 'Yearly'
			end
		} unless @tmp_bills.has_key?(row['hbillHead']) && row['iinst'].to_i <= @tmp_bills[row['hbillHead']][:instance]

		progress "Prepared", $., "bill"
	end
	progress "Prepared", $., "bill"
	puts

	loaded = 0
	@tmp_head_bills.each do |id, bill|
		bill[:next_date] = Date.parse(@tmp_bills[id][:last_date]) + case @tmp_bills[id][:frequency]
			when 'Fortnightly' then ((bill[:next_unpaid_instance] - @tmp_bills[id][:instance]) * 2).weeks
			when 'Monthly' then (bill[:next_unpaid_instance] - @tmp_bills[id][:instance]).months
			when 'Quarterly' then ((bill[:next_unpaid_instance] - @tmp_bills[id][:instance]) * 3).months
			when 'Yearly' then (bill[:next_unpaid_instance] - @tmp_bills[id][:instance]).years
		end
		loaded += 1
		progress "Calculated", loaded, "bill next due date"
	end
	progress "Calculated", loaded, "bill next due date"
	puts

	loaded = 0
	@tmp_head_bills.sort_by {|k,v| v[:next_date]}.each_with_index do |(id, bill), index|
		begin
			# Get the template transaction
			trx = @tmp_transactions[@tmp_bills[id][:transaction]]

			# Clear the date and replace with the schedule
			trx[:transaction_date] = nil
			trx[:next_due_date] = bill[:next_date]
			trx[:frequency] = @tmp_bills[id][:frequency]
			trx[:estimate] = @tmp_bills[id][:estimate]
			trx[:auto_enter] = @tmp_bills[id][:auto]

			# Create the template transaction
			self.send "create_#{trx[:type]}_transaction".to_sym, trx unless trx[:type].nil? || !!!trx[:account]

			loaded += 1
			progress "Loaded", loaded, "bill"
		rescue
			p id, bill, trx, @tmp_bills[id]
			raise
		end
	end
	progress "Loaded", loaded, "bill"
	2.times { puts }
end

def create_basic_transaction(trx)
	category = Category.find(trx[:category]) unless trx[:category].nil?

	BasicTransaction.create_from_json({
		'category' => !!category && {'id' => category.parent.blank? && category.id || category.parent.id} || nil,
		'subcategory' => !!category && category.parent.present? && {'id' => category.id} || nil,
		'amount' => trx[:amount],
		'memo' => trx[:memo],
		'status' => trx[:status],
		'primary_account' => {'id' => trx[:account]},
		'payee' => !!trx[:payee] && {'id' => trx[:payee]} || nil,
		'flag' => @tmp_flags[trx[:id]]
	}.merge(header_json(trx)))
end

def create_split_out_transaction(trx)
	create_split_transaction(trx, 'outflow')
end

def create_split_in_transaction(trx)
	create_split_transaction(trx, 'inflow')
end

def create_split_transaction(trx, direction)
	SplitTransaction.create_from_json({
		'amount' => trx[:amount],
		'memo' => trx[:memo],
		'primary_account' => {'id' => trx[:account]},
		'direction' => direction,
		'status' => trx[:status],
		'payee' => !!trx[:payee] && {'id' => trx[:payee]} || nil,
		'flag' => @tmp_flags[trx[:id]],
		'subtransactions' => @tmp_splits[trx[:id]].map do |trxid|
			subtrx = @tmp_transactions[trxid]

			if subtrx[:type].eql? 'subtransaction'
				category = !!subtrx[:category] && Category.find(subtrx[:category]) || nil
			else
				subaccount, substatus = subtrx[:account], subtrx[:status]

				# If the subtransfer account is the same as the parent account, we need to lookup the account for the other side
				other_side = @tmp_transactions[@tmp_transfers[subtrx[:id]]]
				subaccount, substatus = other_side[:account], other_side[:status] if subaccount.eql? trx[:account]
			end

			{
				'amount' => subtrx[:amount],
				'memo' => subtrx[:memo],
				'transaction_type' => subtrx[:type].eql?('subtransaction') ? "Sub" : "Subtransfer",
				'category' => !!category && {'id' => category.parent.blank? && category.id || category.parent.id} || nil,
				'subcategory' => !!category && category.parent.present? && {'id' => category.id} || nil,
				'direction' => direction,
				'account' => {'id' => subaccount},
				'status' => substatus,
			}
		end
	}.merge(header_json(trx)))
end

def create_transfer_out_transaction(trx)
	create_transfer_transaction trx, 'outflow'
end

def create_transfer_in_transaction(trx)
	create_transfer_transaction trx, 'inflow'
end

def create_transfer_transaction(trx, direction)
	other_side = @tmp_transactions[@tmp_transfers[trx[:id]]]

	TransferTransaction.create_from_json({
		'primary_account' => {'id' => trx[:account]},
		'account' => {'id' => other_side[:account]},
		'status' => trx[:status],
		'related_status' => other_side[:status],
		'direction' => direction,
		'amount' => trx[:amount],
		'memo' => trx[:memo],
		'payee' => !!trx[:payee] && {'id' => trx[:payee]} || nil,
		'flag' => @tmp_flags[trx[:id]]
	}.merge(header_json(trx)))
end

def create_payslip_transaction(trx)
	PayslipTransaction.create_from_json({
		'amount' => trx[:amount],
		'memo' => trx[:memo],
		'primary_account' => {'id' => trx[:account]},
		'direction' => 'inflow',
		'status' => trx[:status],
		'payee' => !!trx[:payee] && {'id' => trx[:payee]} || nil,
		'flag' => @tmp_flags[trx[:id]],
		'subtransactions' => @tmp_splits[trx[:id]].map do |trxid|
			subtrx = @tmp_transactions[trxid]

			if %w(subtransaction payslip_before_tax payslip_tax).include? subtrx[:type]
				category = !!subtrx[:category] && Category.find(subtrx[:category]) || nil
			else
				subaccount, substatus = subtrx[:account], subtrx[:status]

				# If the subtransfer account is the same as the parent account, we need to lookup the account for the other side
				other_side = @tmp_transactions[@tmp_transfers[subtrx[:id]] || @tmp_transfers.rassoc(subtrx[:id]).first]
				subaccount, substatus = other_side[:account], other_side[:status] if subaccount.eql? trx[:account]
			end

			{
				'amount' => subtrx[:amount],
				'memo' => subtrx[:memo],
				'transaction_type' => %w(subtransaction payslip_before_tax payslip_tax).include?(subtrx[:type]) ? "Sub" : "Subtransfer",
				'category' => !!category && {'id' => category.parent.blank? && category.id || category.parent.id} || nil,
				'subcategory' => !!category && category.parent.present? && {'id' => category.id} || nil,
				'direction' => 'outflow',
				'account' => {'id' => subaccount},
				'status' => substatus,
			}
		end
	}.merge(header_json(trx)))
end

def create_loanrepayment_transaction(trx)
	LoanRepaymentTransaction.create_from_json({
		'amount' => trx[:amount],
		'memo' => trx[:memo],
		'primary_account' => {'id' => trx[:account]},
		'direction' => 'outflow',
		'status' => trx[:status],
		'payee' => !!trx[:payee] && {'id' => trx[:payee]} || nil,
		'flag' => @tmp_flags[trx[:id]],
		'subtransactions' => @tmp_splits[trx[:id]].map do |trxid|
			subtrx = @tmp_transactions[trxid]

			if subtrx[:type].eql? 'subtransaction'
				category = !!subtrx[:category] && Category.find(subtrx[:category]) || nil
			else
				subaccount, substatus = subtrx[:account], subtrx[:status]

				# If the subtransfer account is the same as the parent account, we need to lookup the account for the other side
				other_side = @tmp_transactions[@tmp_transfers[subtrx[:id]] || @tmp_transfers.rassoc(subtrx[:id]).first]
				subaccount, substatus = other_side[:account], other_side[:status] if subaccount.eql? trx[:account]
			end

			{
				'amount' => subtrx[:amount],
				'memo' => subtrx[:memo],
				'transaction_type' => subtrx[:type].eql?('subtransaction') ? "Sub" : "Subtransfer",
				'category' => !!category && {'id' => category.parent.blank? && category.id || category.parent.id} || nil,
				'subcategory' => !!category && category.parent.present? && {'id' => category.id} || nil,
				'direction' => 'outflow',
				'account' => {'id' => subaccount},
				'status' => substatus,
			}
		end
	}.merge(header_json(trx)))
end

def create_securitytransfer_out_transaction(trx)
	create_securitytransfer_transaction trx, 'outflow'
end

def create_securitytransfer_in_transaction(trx)
	create_securitytransfer_transaction trx, 'inflow'
end

def create_securitytransfer_transaction(trx, direction)
	other_side = @tmp_transactions[@tmp_transfers[trx[:id]]]

	SecurityTransferTransaction.create_from_json({
		'primary_account' => {'id' => trx[:account]},
		'account' => {'id' => other_side[:account]},
		'status' => trx[:status],
		'related_status' => other_side[:status],
		'direction' => direction,
		'memo' => trx[:memo],
		'quantity' => @tmp_investments[trx[:id]][:qty],
		'security' => !!trx[:security] && {'id' => trx[:security][:id]} || nil,
		'flag' => @tmp_flags[trx[:id]]
	}.merge(header_json(trx)))
end

def create_securityholding_out_transaction(trx)
	create_securityholding_transaction trx, 'outflow'
end

def create_securityholding_in_transaction(trx)
	create_securityholding_transaction trx, 'inflow'
end

def create_securityholding_transaction(trx, direction)
	SecurityHoldingTransaction.create_from_json({
		'memo' => trx[:memo],
		'direction' => direction,
		'status' => trx[:status],
		'primary_account' => {'id' => trx[:account]},
		'quantity' => @tmp_investments[trx[:id]][:qty],
		'security' => !!trx[:security] && {'id' => trx[:security][:id]} || nil,
		'flag' => @tmp_flags[trx[:id]]
	}.merge(header_json(trx)))
end

def create_securityinvestment_out_transaction(trx)
	# trx is the transaction without the security
	create_securityinvestment_transaction trx, 'outflow'
end

def create_securityinvestment_in_transaction(trx)
	# trx is the transaction with the security
	create_securityinvestment_transaction trx, 'inflow'
end

def create_securityinvestment_transaction(trx, direction)
	# Security Investment Transaction
	other_side = @tmp_transactions[@tmp_transfers[trx[:id]]]

	if direction.eql? 'inflow'
		investment_account, cash_account, security, investment, investment_status, cash_status = trx[:account], other_side[:account], trx[:security], @tmp_investments[trx[:id]], trx[:status], other_side[:status]
		investment_direction = trx[:orig_amount].to_f > 0 ? 'inflow' : 'outflow'
	else
		investment_account, cash_account, security, investment, investment_status, cash_status = other_side[:account], trx[:account], other_side[:security], @tmp_investments[other_side[:id]], other_side[:status], trx[:status]
		investment_direction = trx[:orig_amount].to_f > 0 ? 'outflow' : 'inflow'
	end

	SecurityInvestmentTransaction.create_from_json({
		'amount' => trx[:amount],
		'memo' => trx[:memo],
		'direction' => investment_direction,
		'primary_account' => {'id' => investment_account},
		'account' => {'id' => cash_account},
		'status' => investment_status,
		'related_status' => cash_status,
		'quantity' => investment[:qty],
		'price' => investment[:price],
		'commission' => investment[:commission],
		'security' => !!security && {'id' => security[:id]} || nil,
		'flag' => @tmp_flags[trx[:id]]
	}.merge(header_json(trx)))
end

def create_dividend_out_transaction(trx)
	create_dividend_transaction trx, 'outflow'
end

def create_dividend_in_transaction(trx)
	create_dividend_transaction trx, 'inflow'
end

def create_dividend_transaction(trx, direction)
	# Dividend Transaction
	investment_trx, cash_trx = trx, @tmp_transactions[@tmp_transfers[trx[:id]]]
	investment_trx, cash_trx = cash_trx, investment_trx if direction.eql? 'inflow'

	DividendTransaction.create_from_json({
		'amount' => trx[:amount],
		'memo' => trx[:memo],
		'primary_account' => {'id' => investment_trx[:account]},
		'account' => {'id' => cash_trx[:account]},
		'status' => investment_trx[:status],
		'related_status' => cash_trx[:status],
		'security' => !!investment_trx && {'id' => investment_trx[:security][:id]} || nil,
		'flag' => @tmp_flags[trx[:id]]
	}.merge(header_json(trx)))
end

def header_json(trx)
	if trx[:transaction_date].nil?
		{
			'next_due_date' => trx[:next_due_date],
			'frequency' => trx[:frequency],
			'estimate' => trx[:estimate],
			'auto_enter' => trx[:auto_enter]
		}
	else 
		{
			'transaction_date' => trx[:transaction_date]
		}
	end
end

def void?(trx)
	# From sunriise (http://sourceforge.net/p/sunriise/code/HEAD/tree/trunk/src/main/java/com/le/sunriise/mnyobject/impl/TransactionImpl.java)
	return (trx[:grftt].to_i >= 2097152)
end

def verify_balances
	include ActionView::Helpers::NumberHelper
	balance_mismatches = []

	# Process each account.json file
	Dir[File.join(@export_dir, 'json', '**', 'account.json')].each_with_index do |file, index|
		begin
			# Load the JSON data
			account_json = JSON.parse IO.read(file)

			# Skip if we can't find the matching account
			next unless !!@tmp_accounts[account_json['id'].to_s]

			# Skip any loans (for some reason, the suriise closing balances aren't accurate)
			next if @tmp_account_types[account_json['type'].to_s].eql? 'loan'

			# Calculate the loaded account's closing balance
			closing_balance = Account.find(@tmp_accounts[account_json['id'].to_s]).closing_balance

			# Check that it matches
			balance_mismatches << [account_json['name'], number_to_currency(account_json['currentBalance']), number_to_currency(closing_balance)] unless number_to_currency(account_json['currentBalance']).eql? number_to_currency(closing_balance)
			progress "Checked", index, "closing balance"
		rescue => e
			p account_json, e
			puts "Failed on Source ID: #{account_json['id']}, Target ID: #{@tmp_accounts[account_json['id'].to_s]}, OK: #{!!@tmp_accounts[account_json['id'].to_s]}"
		end
	end	

	# Report any mismatches
	unless balance_mismatches.empty?
		columns = "%40s %15s %15s"
		puts
		puts "#{balance_mismatches.size} Mismatched Balances".pluralize balance_mismatches.size
		puts columns % ["Account", "Actual", "Calculated"]
		balance_mismatches.each do |account|
			puts columns % account
		end
	end
end

load_accounts
load_payees
load_categories
load_securities
load_security_prices
load_transactions
load_bills
verify_balances
